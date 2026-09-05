import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { SessionStore } from './telegram/sessionStore'
import { AccountManager } from './telegram/accountManager'
import { ProxyManager } from './telegram/proxyManager'
import { Logger } from './telegram/logger'
import { UpdateManager } from './telegram/updateManager'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'guidegram-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure 100% Portable User Data Directory
const isDev = !app.isPackaged
const portableDataDir = isDev
  ? path.resolve(__dirname, '../data')
  : path.join(path.dirname(app.getPath('exe')), 'data')

app.setPath('userData', portableDataDir)

// Initialize File Logging System
Logger.initialize(portableDataDir)

process.on('uncaughtException', (err) => {
  Logger.error('[Process] Uncaught Exception in Main process:', err)
})

process.on('unhandledRejection', (reason) => {
  Logger.error('[Process] Unhandled Rejection in Main process:', reason)
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let sessionStore: SessionStore
let accountManager: AccountManager
let updateManager: UpdateManager

function getResourcesPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.resolve(__dirname, '../resources')
}

function getAppIconPath(): string {
  const base = getResourcesPath()
  // Prefer ICO for the window titlebar/taskbar on Windows
  const iconIco = path.join(base, 'icon.ico')
  const iconPng = path.join(base, 'icon256.png')
  if (fs.existsSync(iconIco)) return iconIco
  if (fs.existsSync(iconPng)) return iconPng
  return ''
}

function getTrayIconPath(): string {
  const base = getResourcesPath()
  // System tray requires a small PNG with transparent background — never ICO
  const icon32 = path.join(base, 'icon32.png')
  const icon16 = path.join(base, 'icon16.png')
  if (fs.existsSync(icon32)) return icon32
  if (fs.existsSync(icon16)) return icon16
  return ''
}

function createTray() {
  if (tray) return

  const iconPath = getTrayIconPath()
  let trayIcon: InstanceType<typeof nativeImage> | null = null

  if (iconPath) {
    trayIcon = nativeImage.createFromPath(iconPath)
    // Resize to 16x16 for Windows system tray (high-DPI aware)
    if (process.platform === 'win32') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
    }
  }

  // Fallback: create empty nativeImage if no file found
  if (!trayIcon || trayIcon.isEmpty()) {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('Guidegram - Telegram Client')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Guidegram',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      },
    },
    {
      label: 'Check for Updates...',
      click: async () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
        const cfg = sessionStore.getConfig()
        const activeProxy = cfg.proxies.find((p) => p.enabled)
        try {
          const info = await updateManager.checkForUpdates(activeProxy)
          if (info && info.hasUpdate && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app:update-available', info)
          }
        } catch (e) {
          Logger.warn('[Tray] Check updates error:', e)
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Guidegram',
      click: () => {
        if (tray) {
          tray.destroy()
          tray = null
        }
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (!mainWindow) {
      createWindow()
      return
    }
    if (mainWindow.isVisible()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
        mainWindow.focus()
      } else {
        mainWindow.focus()
      }
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function createWindow() {
  Logger.info('[Window] Creating main application window...')

  const iconPath = getAppIconPath()
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false, // Prevents blank/black flash during startup
    backgroundColor: '#08090C',
    title: 'Guidegram',
    frame: false, // Frameless window with custom titlebar
    icon: iconPath || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Window lifecycle events
  mainWindow.once('ready-to-show', () => {
    Logger.info('[Window] Window is ready to show. Displaying now.')
    mainWindow?.show()
  })

  mainWindow.webContents.on('did-finish-load', () => {
    Logger.info('[Renderer] Main HTML content loaded successfully.')
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    Logger.error(`[Renderer] Failed to load URL: ${validatedURL}, Code: ${errorCode}, Description: ${errorDescription}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    Logger.error('[Renderer] Renderer process gone / crashed:', details)
  })

  mainWindow.webContents.on('unresponsive', () => {
    Logger.warn('[Renderer] Window became unresponsive.')
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelName = level === 3 ? 'ERROR' : level === 2 ? 'WARN' : 'INFO'
    const cleanSource = sourceId ? path.basename(sourceId) : 'app'
    if (level >= 2) {
      Logger.warn(`[Renderer:${levelName}] (${cleanSource}:${line}) ${message}`)
    } else {
      Logger.info(`[Renderer:${levelName}] ${message}`)
    }
  })

  // In development, load from Vite dev server; in production, load the built HTML
  if (process.env.VITE_DEV_SERVER_URL) {
    Logger.info(`[Window] Loading Vite Dev Server: ${process.env.VITE_DEV_SERVER_URL}`)
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    const htmlPath = path.join(__dirname, '../dist/index.html')
    Logger.info(`[Window] Loading production bundle: ${htmlPath}`)
    mainWindow.loadFile(htmlPath)
  }

  mainWindow.on('closed', () => {
    Logger.info('[Window] Main window closed.')
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  Logger.info('[App] Electron app is ready. Initializing SessionStore & AccountManager...')

  // Register local media streaming protocol for videos, voice, audio, and documents
  protocol.handle('guidegram-media', (request) => {
    try {
      let rawPath = request.url.replace(/^guidegram-media:\/\//, '')
      let decodedPath = decodeURIComponent(rawPath)
      // Normalize Windows drive letter if prefixed by leading slash, e.g. /D:/... -> D:/...
      if (process.platform === 'win32') {
        if (/^\/[a-zA-Z]:/.test(decodedPath)) {
          decodedPath = decodedPath.slice(1)
        }
      }
      if (!fs.existsSync(decodedPath)) {
        return new Response('Media file not found', { status: 404 })
      }
      return net.fetch(pathToFileURL(decodedPath).toString())
    } catch (err) {
      Logger.error('[Protocol] Failed to serve guidegram-media request:', err)
      return new Response('Media error', { status: 500 })
    }
  })

  sessionStore = new SessionStore(portableDataDir)
  accountManager = new AccountManager(sessionStore, (event, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, payload)
    }
  })

  updateManager = new UpdateManager()

  setupIpcHandlers()
  createTray()
  createWindow()

  // Start background hourly check for updates
  updateManager.startHourlyCheck(
    (updateInfo) => {
      Logger.info(`[Main] Update found: v${updateInfo.latestVersion}`)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:update-available', updateInfo)
      }
    },
    () => {
      // Pick first active proxy if available
      const cfg = sessionStore.getConfig()
      return cfg.proxies.find((p) => p.enabled)
    }
  )

  // Non-blocking initialization in the background
  accountManager.initialize().catch((err) => {
    Logger.warn('[Main] Background account init warning:', err)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  Logger.info('[App] All windows closed.')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function setupIpcHandlers() {
  // Window Controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      return false
    } else {
      mainWindow.maximize()
      return true
    }
  })

  // Window Close Action Handling: Check whether to ask, minimize, or quit
  ipcMain.handle('window:request-close', () => {
    const cfg = sessionStore.getConfig()
    if (cfg.closeAction === 'minimize') {
      mainWindow?.minimize()
      return { action: 'minimize' }
    } else if (cfg.closeAction === 'quit') {
      mainWindow?.close()
      return { action: 'quit' }
    }
    // Default or 'ask': renderer will show modal
    return { action: 'ask' }
  })

  ipcMain.handle('window:confirm-close', (_event, { action, remember }: { action: 'minimize' | 'quit'; remember: boolean }) => {
    Logger.info(`[IPC] window:confirm-close action=${action} remember=${remember}`)
    if (remember) {
      sessionStore.updateConfig({
        closeAction: action,
        rememberCloseAction: true,
      })
    }
    if (action === 'minimize') {
      mainWindow?.minimize()
    } else {
      mainWindow?.close()
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() || false
  })

  // Update System Handlers
  ipcMain.handle('system:check-for-updates', async () => {
    const cfg = sessionStore.getConfig()
    const activeProxy = cfg.proxies.find((p) => p.enabled)
    return updateManager.checkForUpdates(activeProxy)
  })

  ipcMain.handle('system:install-update', async (_event, { downloadUrl }: { downloadUrl: string }) => {
    const appDir = isDev
      ? path.resolve(__dirname, '..')
      : path.dirname(app.getPath('exe'))
    return updateManager.performPortableUpdate(downloadUrl, appDir, portableDataDir)
  })

  // Telegram Accounts
  ipcMain.handle('telegram:get-accounts', async () => {
    Logger.info('[IPC] telegram:get-accounts')
    return accountManager.getAccounts()
  })

  ipcMain.handle('telegram:reconnect-account', async (_event, { accountId }: { accountId: string }) => {
    Logger.info(`[IPC] telegram:reconnect-account for ${accountId}`)
    try {
      return await accountManager.reconnectAccount(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] reconnectAccount failed for ${accountId}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:start-phone-auth', async (_event, { phone, proxy }) => {
    Logger.info(`[IPC] telegram:start-phone-auth for ${phone}`)
    try {
      return await accountManager.startPhoneAuth(phone, proxy)
    } catch (err: any) {
      Logger.error(`[IPC] startPhoneAuth failed for ${phone}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:complete-phone-auth', async (_event, { phone, code, password }) => {
    Logger.info(`[IPC] telegram:complete-phone-auth for ${phone}`)
    try {
      return await accountManager.completePhoneAuth(phone, code, password)
    } catch (err: any) {
      Logger.error(`[IPC] completePhoneAuth failed for ${phone}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:start-qr-auth', async (_event, { proxy }) => {
    Logger.info('[IPC] telegram:start-qr-auth')
    try {
      return await accountManager.startQrAuth(proxy)
    } catch (err: any) {
      Logger.error('[IPC] startQrAuth failed:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:cancel-qr-auth', async () => {
    Logger.info('[IPC] telegram:cancel-qr-auth')
    return accountManager.cancelQrAuth()
  })

  ipcMain.handle('telegram:submit-qr-password', async (_event, { password }) => {
    Logger.info('[IPC] telegram:submit-qr-password')
    try {
      return await accountManager.submitQrPassword(password)
    } catch (err: any) {
      Logger.error('[IPC] submitQrPassword failed:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:logout-account', async (_event, { accountId }) => {
    Logger.info(`[IPC] telegram:logout-account ${accountId}`)
    return accountManager.logoutAccount(accountId)
  })

  ipcMain.handle('telegram:get-dialogs', async (_event, { accountId }) => {
    try {
      return await accountManager.getDialogs(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] getDialogs failed for ${accountId}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-messages', async (_event, { accountId, chatId, limit }) => {
    try {
      return await accountManager.getMessages(accountId, chatId, limit)
    } catch (err: any) {
      Logger.error(`[IPC] getMessages failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:send-message', async (_event, { accountId, chatId, text, replyToMsgId }) => {
    try {
      return await accountManager.sendMessage(accountId, chatId, text, replyToMsgId)
    } catch (err: any) {
      Logger.error(`[IPC] sendMessage failed:`, err)
      throw err
    }
  })

  ipcMain.handle(
    'telegram:forward-messages',
    async (_event, { accountId, toChatId, toChatIds, fromChatId, messageIds, options }) => {
      try {
        const target = toChatIds || toChatId
        return await accountManager.forwardMessages(accountId, target, fromChatId, messageIds, options)
      } catch (err: any) {
        Logger.error(`[IPC] forwardMessages failed:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('telegram:mark-as-read', async (_event, { accountId, chatId }) => {
    return accountManager.markAsRead(accountId, chatId)
  })

  ipcMain.handle('telegram:mark-all-as-read', async (_event, { accountId }) => {
    try {
      return await accountManager.markAllAsRead(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] markAllAsRead failed:`, err)
      throw err
    }
  })

  ipcMain.handle(
    'telegram:delete-messages',
    async (_event, { accountId, chatId, messageIds, revoke }) => {
      try {
        return await accountManager.deleteMessages(accountId, chatId, messageIds, revoke)
      } catch (err: any) {
        Logger.error(`[IPC] deleteMessages failed:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('telegram:get-profile-photo', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.getProfilePhoto(accountId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getProfilePhoto error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:download-media', async (_event, { accountId, chatId, messageId, thumb }) => {
    try {
      return await accountManager.downloadMedia(accountId, chatId, messageId, thumb)
    } catch (err: any) {
      Logger.warn(`[IPC] downloadMedia error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-chat-details', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.getChatDetails(accountId, chatId)
    } catch (err: any) {
      Logger.warn(`[IPC] getChatDetails error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:resolve-peer', async (_event, { accountId, target }) => {
    try {
      return await accountManager.resolvePeer(accountId, target)
    } catch (err: any) {
      Logger.warn(`[IPC] resolvePeer error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:toggle-chat-notifications', async (_event, { accountId, chatId, mute }) => {
    try {
      return await accountManager.toggleChatNotifications(accountId, chatId, mute)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleChatNotifications error:`, err)
      return false
    }
  })

  ipcMain.handle('system:open-external', async (_event, { url }) => {
    try {
      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('tg://'))) {
        await shell.openExternal(url)
      }
    } catch (err) {
      Logger.warn(`[IPC] Failed to open external URL: ${url}`, err)
    }
  })

  ipcMain.handle('telegram:test-proxy-ping', async (_event, { proxy }) => {
    return ProxyManager.testProxyPing(proxy)
  })

  ipcMain.handle('telegram:get-config', async () => {
    return sessionStore.getConfig()
  })

  ipcMain.handle('telegram:update-config', async (_event, { partial }) => {
    return sessionStore.updateConfig(partial)
  })

  ipcMain.handle('system:get-portable-data-path', async () => {
    return sessionStore.getDataDirectory()
  })

  // System Diagnostics & Logging Handlers
  ipcMain.handle('system:get-logs', async (_event, { maxLines } = {}) => {
    return {
      logPath: Logger.getLogPath(),
      content: Logger.getRecentLogs(maxLines || 200),
    }
  })

  ipcMain.handle('system:open-logs-folder', async () => {
    const logDir = path.dirname(Logger.getLogPath())
    Logger.info(`[System] Opening log folder: ${logDir}`)
    await shell.openPath(logDir)
    return logDir
  })

  ipcMain.handle('system:log-renderer-error', async (_event, { message, stack }) => {
    Logger.error(`[Renderer Crash/Error] ${message}`, stack)
  })
}

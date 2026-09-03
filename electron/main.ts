import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { SessionStore } from './telegram/sessionStore'
import { AccountManager } from './telegram/accountManager'
import { ProxyManager } from './telegram/proxyManager'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure 100% Portable User Data Directory
const isDev = !app.isPackaged
const portableDataDir = isDev
  ? path.resolve(__dirname, '../data')
  : path.join(path.dirname(app.getPath('exe')), 'data')

app.setPath('userData', portableDataDir)

let mainWindow: BrowserWindow | null = null
let sessionStore: SessionStore
let accountManager: AccountManager

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false, // Prevents blank/black flash during startup
    backgroundColor: '#08090C',
    title: 'Guidegram',
    frame: false, // 100% stable frameless window with custom titlebar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // In development, load from Vite dev server; in production, load the built HTML
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  sessionStore = new SessionStore(portableDataDir)
  accountManager = new AccountManager(sessionStore, (event, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, payload)
    }
  })

  setupIpcHandlers()
  createWindow()

  // Non-blocking initialization in the background
  accountManager.initialize().catch((err) => {
    console.error('[Main] Background account init warning:', err)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
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

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() || false
  })

  // Telegram Accounts
  ipcMain.handle('telegram:get-accounts', async () => {
    return accountManager.getAccounts()
  })

  ipcMain.handle('telegram:start-phone-auth', async (_event, { phone, proxy }) => {
    return accountManager.startPhoneAuth(phone, proxy)
  })

  ipcMain.handle('telegram:complete-phone-auth', async (_event, { phone, code, password }) => {
    return accountManager.completePhoneAuth(phone, code, password)
  })

  ipcMain.handle('telegram:start-qr-auth', async (_event, { proxy }) => {
    return accountManager.startQrAuth(proxy)
  })

  ipcMain.handle('telegram:cancel-qr-auth', async () => {
    return accountManager.cancelQrAuth()
  })

  ipcMain.handle('telegram:submit-qr-password', async (_event, { password }) => {
    return accountManager.submitQrPassword(password)
  })

  ipcMain.handle('telegram:logout-account', async (_event, { accountId }) => {
    return accountManager.logoutAccount(accountId)
  })

  ipcMain.handle('telegram:get-dialogs', async (_event, { accountId }) => {
    return accountManager.getDialogs(accountId)
  })

  ipcMain.handle('telegram:get-messages', async (_event, { accountId, chatId, limit }) => {
    return accountManager.getMessages(accountId, chatId, limit)
  })

  ipcMain.handle('telegram:send-message', async (_event, { accountId, chatId, text }) => {
    return accountManager.sendMessage(accountId, chatId, text)
  })

  ipcMain.handle(
    'telegram:forward-messages',
    async (_event, { accountId, toChatId, fromChatId, messageIds, options }) => {
      return accountManager.forwardMessages(accountId, toChatId, fromChatId, messageIds, options)
    }
  )

  ipcMain.handle('telegram:mark-as-read', async (_event, { accountId, chatId }) => {
    return accountManager.markAsRead(accountId, chatId)
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
}

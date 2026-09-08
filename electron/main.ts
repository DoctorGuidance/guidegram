import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, protocol, net, dialog, session } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { SessionStore } from './telegram/sessionStore'
import { AccountManager } from './telegram/accountManager'
import { ProxyManager } from './telegram/proxyManager'
import { Logger } from './telegram/logger'
import { UpdateManager } from './telegram/updateManager'
import type { WebPagePreview } from './telegram/types'

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

const FALLBACK_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAEEElEQVR4nO2VX0wcVRTGvzu77Mx0ha5iBfqgFXVLCzatthZM22BMKxGTEo2N8qA1qW2iaZqoEdGkRmMsibb+eRBs1RqjvihWA0+gjYWKQihUm5oC2wIiLelCRZb9N3PPHDPDlmCFhSU+7pfczMw95873m3PuzABppZVWqupmH05yIZq5GPWcB2YxZ+4Q63dN8GfuCb53rhT3gkw7OQNLsAsRVGISJYjChSgAE8CnMNY3cFvZPXCNZ2IkwEAfAectZ6XrbjfK/zDRPQq0LQ5ggFchjG8QQYFj+t/h2XErSotuAAIWIAgQCqAA6LOAIwYOwifeWVwFBnk1JtGCKLITZhai+AVRdCGGCGLIQQwlR1rh3z4KXJFAzm2I+XOh2X2xR4DhmipGqgBDrCOELxBDNmKOeRsM7MIWB6UUCvLBaIRP7Ozbz1vfDuBweQFWPLIJ2oCYMrerIBjoWRRACHsQxdrEk/+EOLZhM56AQI5jnIV6CBFycl8Xze1DfGhdHt4fFsClQZb+5eJn4cJmuyXJAJQ5I1HsTZhLTOJJbEERgCtYKl6DT5yaNgfQEpRPZ2bxu39JBo/y5a8/ju3wuzDmV4A7FrbNr9Fp9uMkM5qZ0cDfIYk+6qd93w5LqzVI/Pu4dSLInGnPDxB/+YPJXBfnN5Otd886O4kNTt+nen98rsVVv5kvjcWtA2ABZm7WTaVimU9E7FiuglddQC+7UZs6QBQ3JcyBCPpnS9naFK8Jxq0qiwXGglbPsU+MExSivYXbR6FJC/eXXQx72fVWU1NuOHWAGLTp9zzuoPxLJd/HK6IKV40ZAhcDFs42mis9cXpDlxIaEVSSUIngJmM5gJcXAxCc8aHJuTZMLvGnNNgI9LLn7xYTqkHQpIQqCaoNIe1rgi7Jm8w8GUDPNEAMm14p6vjRMhTvgd715+xwx32eTuzm6/ImQsW6aakeKeGRBPuoET2gSXrBBtIkDc8HIGad/ZAznCpEsBRRTNwyMlrweEt/JUD1NedKBpLd8MHSC42qpHKnCiYVHz1V2I6UvwN7hIkIPkhUIWvQc+Ph89d7jwLKQ9WrOiuqb+9aNtuystL+x6bNJfVM5p/txDwSc0aqORuEM4ggT4kzdClbMyi875n2C8SK3MAsfGAO1/RsrNu2bcTrikee04j2a5LcNoBqmg/X/br22OIBbD3LGxWDj2uSliR6ypqUZ3RJHR4pxzRJqiZlviapVJOUpZmJDUh0qLZ7zfNYgMR8Cd6d8TtVsr7SJK28utMTMIlx9dyJmTrJF2u71rw39Rv6HwAc7eaMFePjlbpJT2nSKtakVGeaq1IOqkQNumEcrDu9LukmXRzADJU8OqRrIeXmDMPM9hpW2Ctilz9vXX1pZk5aaaWFFPQPar8W5BrfhOgAAAAASUVORK5CYII='

function getResourcesPath(): string {
  const candidates = [
    path.join(process.resourcesPath, 'resources'),
    process.resourcesPath,
    path.join(app.getAppPath(), 'resources'),
    path.resolve(__dirname, '../resources'),
    path.resolve(__dirname, '../../resources'),
    path.resolve(process.cwd(), 'resources'),
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(path.join(c, 'icon32.png')) || fs.existsSync(path.join(c, 'icon.ico'))) {
        return c
      }
    } catch (_) {}
  }
  return path.resolve(__dirname, '../resources')
}

function getAppIconPath(): string {
  const base = getResourcesPath()
  const iconIco = path.join(base, 'icon.ico')
  const iconPng = path.join(base, 'icon256.png')
  if (fs.existsSync(iconIco)) return iconIco
  if (fs.existsSync(iconPng)) return iconPng
  return ''
}

function getAppIcon(): InstanceType<typeof nativeImage> {
  const iconPath = getAppIconPath()
  if (iconPath && fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) return img
  }
  return nativeImage.createFromDataURL(FALLBACK_ICON_DATA_URL)
}

function getTrayIconPath(): string {
  const base = getResourcesPath()
  const icon32 = path.join(base, 'icon32.png')
  const icon16 = path.join(base, 'icon16.png')
  if (fs.existsSync(icon32)) return icon32
  if (fs.existsSync(icon16)) return icon16
  const iconPng = path.join(base, 'icon256.png')
  if (fs.existsSync(iconPng)) return iconPng
  return ''
}

function getTrayIcon(): InstanceType<typeof nativeImage> {
  const iconPath = getTrayIconPath()
  if (iconPath && fs.existsSync(iconPath)) {
    let img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) {
      if (process.platform === 'win32') {
        img = img.resize({ width: 16, height: 16 })
      }
      return img
    }
  }
  // Safe infallible embedded fallback
  const fallback = nativeImage.createFromDataURL(FALLBACK_ICON_DATA_URL)
  return fallback.resize({ width: 16, height: 16 })
}

function createTray() {
  if (tray) return

  const trayIcon = getTrayIcon()
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

  const appIcon = getAppIcon()
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false, // Prevents blank/black flash during startup
    backgroundColor: '#08090C',
    title: 'Guidegram',
    frame: false, // Frameless window with custom titlebar
    icon: appIcon,
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

  // Auto-grant microphone permission for voice message recording
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media'
  })
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

// =========================================================================
// Feature 22: Rich Web Link Preview Engine (Zero Extra Dependencies)
// =========================================================================

interface CachedPreview {
  data: WebPagePreview | null
  timestamp: number
}

const linkPreviewCache = new Map<string, CachedPreview>()
const MAX_PREVIEW_CACHE = 500
const PREVIEW_CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours

function isPrivateIpOrHost(hostname: string): boolean {
  if (!hostname) return true
  const lower = hostname.toLowerCase().trim()
  const unbracketed = lower.replace(/^\[|\]$/g, '')

  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    unbracketed === '127.0.0.1' ||
    unbracketed === '::1' ||
    unbracketed === '0.0.0.0' ||
    unbracketed === '::'
  ) {
    return true
  }

  // Loopback 127.0.0.0/8 range
  if (/^127\./.test(unbracketed)) return true
  // IPv4-mapped IPv6 loopback / private
  if (/^::ffff:127\./i.test(unbracketed)) return true
  // Private IPv4 ranges (RFC 1918 & RFC 3927)
  if (/^10\./.test(unbracketed)) return true
  if (/^192\.168\./.test(unbracketed)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(unbracketed)) return true
  if (/^169\.254\./.test(unbracketed)) return true

  // IPv6 Link-local and Unique Local Addresses (ULA)
  if (unbracketed.startsWith('fe80:') || unbracketed.startsWith('fc00:') || unbracketed.startsWith('fd')) {
    return true
  }

  if (lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.lan')) return true
  return false
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10))
      } catch {
        return ''
      }
    })
}

function extractMetaTag(headHtml: string, propertyOrName: string): string | undefined {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const p1 = new RegExp(`<meta\\s+[^>]*?(?:property|name)=["']${escaped}["'][^>]*?content=["']([^"']*)["']`, 'i')
  const m1 = headHtml.match(p1)
  if (m1 && m1[1]) return decodeHtml(m1[1].trim())

  const p2 = new RegExp(`<meta\\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${escaped}["']`, 'i')
  const m2 = headHtml.match(p2)
  if (m2 && m2[1]) return decodeHtml(m2[1].trim())

  return undefined
}

async function scrapeLinkPreview(targetUrl: string): Promise<WebPagePreview | null> {
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (isPrivateIpOrHost(parsed.hostname)) return null
  } catch {
    return null
  }

  // Check cache
  const cached = linkPreviewCache.get(targetUrl)
  if (cached && Date.now() - cached.timestamp < PREVIEW_CACHE_TTL) {
    return cached.data
  }

  const cleanDomain = parsed.hostname.replace(/^www\./i, '')

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Guidegram/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    clearTimeout(timeoutId)

    // Defend against SSRF via HTTP 30x redirects to internal IPs
    if (res.url) {
      try {
        const redirected = new URL(res.url)
        if (isPrivateIpOrHost(redirected.hostname)) {
          linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
          return null
        }
      } catch {
        return null
      }
    }

    if (!res.ok) {
      linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
      return null
    }

    const contentType = res.headers.get('content-type') || ''

    // If direct image URL, return image preview
    if (contentType.startsWith('image/')) {
      const imgPreview: WebPagePreview = {
        url: targetUrl,
        siteName: cleanDomain,
        domain: cleanDomain,
        title: path.basename(parsed.pathname) || cleanDomain,
        image: targetUrl,
        photoUrl: targetUrl,
      }
      linkPreviewCache.set(targetUrl, { data: imgPreview, timestamp: Date.now() })
      return imgPreview
    }

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
      return null
    }

    // Read up to 300KB to capture <head>
    let htmlChunk = ''
    const reader = res.body?.getReader()
    if (reader) {
      let bytesRead = 0
      const decoder = new TextDecoder('utf-8')
      while (bytesRead < 300 * 1024) {
        const { done, value } = await reader.read()
        if (done || !value) break
        bytesRead += value.length
        htmlChunk += decoder.decode(value, { stream: true })
        if (htmlChunk.includes('</head>')) break
      }
      reader.cancel().catch(() => {})
    } else {
      htmlChunk = await res.text()
    }

    // Extract OpenGraph / Meta attributes
    const ogTitle =
      extractMetaTag(htmlChunk, 'og:title') ||
      extractMetaTag(htmlChunk, 'twitter:title') ||
      (() => {
        const titleMatch = htmlChunk.match(/<title[^>]*>([^<]+)<\/title>/i)
        return titleMatch ? decodeHtml(titleMatch[1].trim()) : undefined
      })()

    const ogDesc =
      extractMetaTag(htmlChunk, 'og:description') ||
      extractMetaTag(htmlChunk, 'twitter:description') ||
      extractMetaTag(htmlChunk, 'description')

    let ogImage =
      extractMetaTag(htmlChunk, 'og:image') ||
      extractMetaTag(htmlChunk, 'twitter:image') ||
      extractMetaTag(htmlChunk, 'image')

    // Resolve relative image URLs
    if (ogImage) {
      try {
        ogImage = new URL(ogImage, res.url || targetUrl).href
      } catch {
        ogImage = undefined
      }
    }

    const ogSiteName =
      extractMetaTag(htmlChunk, 'og:site_name') ||
      cleanDomain

    const faviconMatch = htmlChunk.match(/<link[^>]*?rel=["'](?:shortcut )?icon["'][^>]*?href=["']([^"']*)["']/i)
    let faviconUrl = faviconMatch ? faviconMatch[1] : undefined
    if (faviconUrl) {
      try {
        faviconUrl = new URL(faviconUrl, res.url || targetUrl).href
      } catch {
        faviconUrl = undefined
      }
    } else {
      faviconUrl = `${parsed.origin}/favicon.ico`
    }

    // If neither title nor description nor image found, don't generate empty card
    if (!ogTitle && !ogDesc && !ogImage) {
      linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
      return null
    }

    const preview: WebPagePreview = {
      url: targetUrl,
      title: ogTitle,
      description: ogDesc,
      image: ogImage,
      photoUrl: ogImage,
      siteName: ogSiteName,
      domain: cleanDomain,
      favicon: faviconUrl,
    }

    // Evict oldest if cache limit reached
    if (linkPreviewCache.size >= MAX_PREVIEW_CACHE) {
      const firstKey = linkPreviewCache.keys().next().value
      if (firstKey) linkPreviewCache.delete(firstKey)
    }

    linkPreviewCache.set(targetUrl, { data: preview, timestamp: Date.now() })
    return preview
  } catch (err) {
    Logger.warn(`[LinkPreview] Failed to scrape preview for ${targetUrl}:`, err)
    linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
    return null
  }
}

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
    return updateManager.performPortableUpdate(downloadUrl, appDir, portableDataDir, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:update-progress', progress)
      }
    })
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

  ipcMain.handle('telegram:send-message', async (_event, { accountId, chatId, text, replyToMsgId, options }) => {
    try {
      return await accountManager.sendMessage(accountId, chatId, text, replyToMsgId, options)
    } catch (err: any) {
      Logger.error(`[IPC] sendMessage failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:send-media', async (_event, { accountId, chatId, filePath, options }) => {
    try {
      return await accountManager.sendMedia(accountId, chatId, filePath, options)
    } catch (err: any) {
      Logger.error(`[IPC] sendMedia failed for ${accountId} in ${chatId}:`, err)
      throw err
    }
  })

  ipcMain.handle('dialog:open-file', async (_event, options?: { type?: 'media' | 'document' | 'audio'; allowMultiple?: boolean; title?: string; filters?: Array<{ name: string; extensions: string[] }>; properties?: Array<'openFile' | 'multiSelections'> }) => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow
    if (!win) return { canceled: true, filePaths: [] }

    let filters = options?.filters
    let title = options?.title || 'Select File'

    if (!filters) {
      const type = options?.type || 'document'
      if (type === 'media') {
        title = options?.title || 'Select Photo or Video'
        filters = [
          { name: 'Photos & Videos', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'mp4', 'mov', 'avi', 'mkv', 'webm'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] },
          { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
          { name: 'All Files', extensions: ['*'] },
        ]
      } else if (type === 'audio') {
        title = options?.title || 'Select Audio File'
        filters = [
          { name: 'Audio Files', extensions: ['mp3', 'm4a', 'ogg', 'opus', 'flac', 'wav', 'aac', 'wma'] },
          { name: 'All Files', extensions: ['*'] },
        ]
      } else {
        title = options?.title || 'Select Document or File'
        filters = [
          { name: 'All Files', extensions: ['*'] },
        ]
      }
    }

    const properties = options?.properties || (options?.allowMultiple !== false ? ['openFile', 'multiSelections'] : ['openFile'])

    const result = await dialog.showOpenDialog(win, {
      title,
      properties: properties as any,
      filters,
    })

    return {
      canceled: result.canceled,
      filePaths: result.filePaths || [],
    }
  })

  ipcMain.handle('system:save-temp-file', async (_event, { buffer, filename }: { buffer: ArrayBuffer | Uint8Array; filename: string }) => {
    const tempDir = app.getPath('temp')
    const ext = path.extname(filename || '')
    const base = path.basename(filename || 'temp', ext).replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const safeName = `${base}_${uniqueSuffix}${ext || (filename?.includes('voice') ? '.ogg' : '.bin')}`
    const targetPath = path.join(tempDir, safeName)
    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any)
    await fs.promises.writeFile(targetPath, nodeBuf)
    return targetPath
  })

  ipcMain.handle('temp:save-file', async (_event, params: { buffer: ArrayBuffer | Uint8Array; filename: string }) => {
    const tempDir = app.getPath('temp')
    const ext = path.extname(params.filename || '')
    const base = path.basename(params.filename || 'temp', ext).replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const safeName = `${base}_${uniqueSuffix}${ext || '.bin'}`
    const targetPath = path.join(tempDir, safeName)
    const nodeBuf = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer as any)
    await fs.promises.writeFile(targetPath, nodeBuf)
    return targetPath
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

  ipcMain.handle('web:get-link-preview', async (_event, { url }: { url: string }) => {
    return scrapeLinkPreview(url)
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

import fs from 'fs'
import path from 'path'
import { AppConfig, AccountInfo, ProxyConfig, CacheStats } from './types'

export class SessionStore {
  private dataDir: string
  private sessionsDir: string
  private configFilePath: string
  private config: AppConfig

  constructor(baseDataDir: string) {
    this.dataDir = baseDataDir
    this.sessionsDir = path.join(this.dataDir, 'sessions')
    this.configFilePath = path.join(this.dataDir, 'config.json')

    this.ensureDirectories()
    this.config = this.loadConfig()
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true })
    }
  }

  private loadConfig(): AppConfig {
    const defaultConfig: AppConfig = {
      apiId: 2040, // Standard Telegram Desktop public test ID fallback or user-defined
      apiHash: 'b18441a1ff607e10a989891a5462e627',
      ghostMode: false,
      theme: 'dark',
      accounts: [],
      proxies: [],
      closeAction: 'ask',
      rememberCloseAction: false,
      showChatId: true,
      showMessageId: true,
      showSeconds: true,
      showSenderAvatar: true,
      quickForwardToSaved: true,
      alwaysDeleteBoth: true,
      markAllReadEnabled: true,
      copyCallbackData: true,
      disableAnimations: false,
      suppressLinkWarning: false,
      antiFingerprinting: true,
      autoDownload: {
        enabled: true,
        photosInPrivate: true,
        photosInGroups: true,
        photosInChannels: false, // OFF by default in channels to avoid flooding downloads!
        videosInPrivate: false,
        videosInGroups: false,
        videosInChannels: false,
        filesInPrivate: false,
        filesInGroups: false,
        filesInChannels: false,
        maxPhotoSizeMB: 5,
        maxVideoSizeMB: 10,
        maxFileSizeMB: 5,
      },
      notificationsEnabled: true,
      soundEnabled: true,
      downloadsPath: path.join(this.dataDir, 'downloads'),
      alwaysAskDownloadPath: false,
      chatFontSize: 14,
    }

    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8')
        const parsed = JSON.parse(raw)
        return {
          ...defaultConfig,
          ...parsed,
          autoDownload: {
            ...defaultConfig.autoDownload!,
            ...(parsed.autoDownload || {}),
          },
        }
      }
    } catch (err) {
      console.error('[SessionStore] Failed to parse config.json, resetting to default:', err)
    }

    this.saveConfig(defaultConfig)
    return defaultConfig
  }

  public saveConfig(config?: AppConfig): void {
    if (config) {
      this.config = config
    }
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf-8')
    } catch (err) {
      console.error('[SessionStore] Failed to save config:', err)
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config }
  }

  public updateConfig(partial: Partial<AppConfig>): AppConfig {
    this.config = { ...this.config, ...partial }
    this.saveConfig()
    return this.config
  }

  public saveSessionString(accountId: string, sessionString: string): void {
    const filePath = path.join(this.sessionsDir, `session_${accountId}.txt`)
    fs.writeFileSync(filePath, sessionString, 'utf-8')
  }

  public getSessionString(accountId: string): string | null {
    const filePath = path.join(this.sessionsDir, `session_${accountId}.txt`)
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim()
    }
    return null
  }

  public removeSession(accountId: string): void {
    const filePath = path.join(this.sessionsDir, `session_${accountId}.txt`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    this.config.accounts = this.config.accounts.filter(a => a.id !== accountId)
    this.saveConfig()
  }

  public getDataDirectory(): string {
    return this.dataDir
  }

  public getCacheStats(): CacheStats {
    let totalBytes = 0
    let filesCount = 0

    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (entry.name !== 'sessions') {
              scanDir(fullPath)
            }
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath)
              totalBytes += stat.size
              filesCount++
            } catch {}
          }
        }
      } catch {}
    }

    scanDir(path.join(this.dataDir, 'media'))
    scanDir(path.join(this.dataDir, 'temp'))

    const formattedSize =
      totalBytes < 1024 * 1024
        ? `${(totalBytes / 1024).toFixed(1)} KB`
        : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`

    return {
      totalBytes,
      formattedSize,
      filesCount,
    }
  }

  public clearCache(): { clearedBytes: number; clearedFiles: number } {
    let clearedBytes = 0
    let clearedFiles = 0

    const cleanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (entry.name !== 'sessions') {
              cleanDir(fullPath)
              try {
                fs.rmdirSync(fullPath)
              } catch {}
            }
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath)
              clearedBytes += stat.size
              fs.unlinkSync(fullPath)
              clearedFiles++
            } catch {}
          }
        }
      } catch {}
    }

    cleanDir(path.join(this.dataDir, 'media'))
    cleanDir(path.join(this.dataDir, 'temp'))

    return { clearedBytes, clearedFiles }
  }
}

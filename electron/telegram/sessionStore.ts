import fs from 'fs'
import path from 'path'
import { AppConfig, AccountInfo, ProxyConfig } from './types'

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
    }

    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8')
        const parsed = JSON.parse(raw)
        return { ...defaultConfig, ...parsed }
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
}

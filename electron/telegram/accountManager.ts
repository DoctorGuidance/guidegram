import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { app, BrowserWindow, dialog } from 'electron'
import { TelegramClient, Api, sessions, errors, helpers } from 'telegram'
import { NewMessage } from 'telegram/events/index.js'
import QRCode from 'qrcode'
import { SessionStore } from './sessionStore'
import { ProxyManager } from './proxyManager'
import { Logger } from './logger'
import { DeviceProfileManager } from './deviceProfileManager'
import {
  AccountInfo,
  DialogItem,
  MessageItem,
  ForwardOptions,
  ProxyConfig,
  QrTokenPayload,
  InlineButton,
  ChatDetails,
  WebPagePreview,
  ReplyInfo,
  MessageEntityItem,
  PinnedMessageItem,
  MessageReactionItem,
  SendMessageOptions,
  SendMediaOptions,
  BotCallbackResult,
  CustomEmojiPayload,
  ForumTopicItem,
  ContactItem,
  ScheduledMessageItem,
  StarGiftItem,
  ActiveSessionItem,
  TranslatedTextResult,
  CloudFolderItem,
  StickerSetItem,
  StickerItem,
  StoryItemPayload,
  PeerStoriesPayload,
  ChannelBoostStatus,
  TwoFactorStatus,
  MyFullProfile,
  PrivacySecuritySettings,
} from './types'

export interface ClientHolder {
  client?: TelegramClient
  session?: sessions.StringSession
  info: AccountInfo
}

interface PendingQrAuth {
  client: TelegramClient
  proxy?: ProxyConfig
  cancelled: boolean
  wakeUp?: () => void
  profile?: any
}

export class ProgressThrottler {
  private lastEmittedPercent = -1
  private lastEmittedTime = 0
  private minIntervalMs: number
  private minDeltaPercent: number

  constructor(
    private callback: (percent: number, extra?: any) => void,
    options?: { minIntervalMs?: number; minDeltaPercent?: number }
  ) {
    this.minIntervalMs = options?.minIntervalMs ?? 100 // 100ms
    this.minDeltaPercent = options?.minDeltaPercent ?? 1 // 1%
  }

  public update(percent: number, extra?: any): void {
    const now = Date.now()
    const isComplete = percent >= 100
    const isFirst = this.lastEmittedPercent === -1

    if (
      isFirst ||
      isComplete ||
      (now - this.lastEmittedTime >= this.minIntervalMs &&
        Math.abs(percent - this.lastEmittedPercent) >= this.minDeltaPercent)
    ) {
      this.lastEmittedPercent = percent
      this.lastEmittedTime = now
      this.callback(percent, extra)
    }
  }
}

/**
 * Format any Telegram entity (User, Chat, Channel) to its complete display name,
 * ensuring firstName + lastName are preserved with full unicode/emojis.
 */
export function formatEntityName(entity: any, fallback = 'Unknown'): string {
  if (!entity) return fallback
  if (entity.title) return entity.title
  const parts = [entity.firstName, entity.lastName]
    .filter(Boolean)
    .map((s: any) => String(s).trim())
    .filter((s: string) => s.length > 0)
  if (parts.length > 0) return parts.join(' ')
  if (entity.username) return `@${entity.username.replace(/^@/, '')}`
  if (entity.phone) return entity.phone
  return fallback
}

export interface ParallelDownloadOptions {
  workers?: number // Default: 4
  partSizeKB?: number // Default: 512
  onProgress?: (percent: number, received: number, total: number) => void
  isCancelled?: () => boolean
}

export async function parallelDownloadDocument(
  client: TelegramClient,
  doc: Api.Document,
  destinationPath: string,
  options?: ParallelDownloadOptions
): Promise<void> {
  const workers = Math.min(16, Math.max(1, options?.workers ?? 4))
  const partSize = (options?.partSizeKB ?? 512) * 1024 // 512 KB
  const fileSize = Number(doc.size)

  if (fileSize <= 0) {
    throw new Error('Invalid document size')
  }

  const totalParts = Math.ceil(fileSize / partSize)
  const tempPath = `${destinationPath}.part`
  const fileHandle = await fs.promises.open(tempPath, 'w+')

  let targetDcId = doc.dcId || (client.session as any)?.dcId || 2
  let nextPartIndex = 0
  let downloadedBytes = 0
  let abortError: any = null

  const throttler = new ProgressThrottler((percent, extra) => {
    options?.onProgress?.(percent, extra?.downloadedBytes ?? 0, fileSize)
  })

  // Initial progress event
  throttler.update(0, { downloadedBytes: 0 })

  try {
    const workerPromises = Array.from({ length: workers }, async () => {
      while (nextPartIndex < totalParts && !abortError) {
        if (options?.isCancelled?.()) {
          abortError = new Error('DOWNLOAD_CANCELLED')
          break
        }
        const partIndex = nextPartIndex++
        if (partIndex >= totalParts) break

        const offset = partIndex * partSize
        const expectedBytes = Math.min(partSize, fileSize - offset)

        let chunkBytes: Buffer | null = null
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (abortError || options?.isCancelled?.()) {
            if (!abortError && options?.isCancelled?.()) abortError = new Error('DOWNLOAD_CANCELLED')
            break
          }
          try {
            const sender = await client.getSender(targetDcId)
            const req = new Api.upload.GetFile({
              location: new Api.InputDocumentFileLocation({
                id: doc.id,
                accessHash: doc.accessHash,
                fileReference: doc.fileReference,
                thumbSize: '',
              }),
              offset: helpers.returnBigInt(offset),
              limit: partSize,
            })

            const res: any = await client.invokeWithSender(req, sender)
            if (res && res.bytes) {
              chunkBytes = Buffer.from(res.bytes).subarray(0, expectedBytes)
              break
            }
          } catch (err: any) {
            if (err instanceof errors.FileMigrateError) {
              targetDcId = err.newDc
              continue
            }
            if (err instanceof errors.FloodWaitError) {
              await helpers.sleep(err.seconds * 1000)
              continue
            }
            if (attempt === 3) {
              abortError = err
              throw err
            }
            await helpers.sleep(300 * attempt)
          }
        }

        if (!chunkBytes) {
          throw abortError || new Error(`Failed to download part ${partIndex}`)
        }

        // Random-access disk write at exact byte offset
        await fileHandle.write(chunkBytes, 0, chunkBytes.length, offset)

        downloadedBytes += chunkBytes.length
        const currentPercent = Math.min(100, Math.round((downloadedBytes / fileSize) * 100))
        throttler.update(currentPercent, { downloadedBytes })
      }
    })

    await Promise.all(workerPromises)
    if (abortError) throw abortError

    // Ensure all file buffers are flushed to disk before closing
    await fileHandle.sync()
  } finally {
    await fileHandle.close().catch(() => {})
    if (abortError && abortError.message === 'DOWNLOAD_CANCELLED') {
      await fs.promises.unlink(tempPath).catch(() => {})
    }
  }

  // Atomic rename to finalize download
  await fs.promises.rename(tempPath, destinationPath)
}

export class AccountManager {
  private store: SessionStore
  private clients = new Map<string, ClientHolder>()
  private pendingAuthClients = new Map<string, { client: TelegramClient; phoneCodeHash: string; proxy?: ProxyConfig; profile?: any }>()
  private pendingQrAuth?: PendingQrAuth
  private onEventCallback?: (event: string, payload: any) => void
  private avatarsDir: string
  private mediaDir: string
  private avatarCache = new Map<string, string>() // `${accountId}_${peerId}` -> data URL
  private mediaCache = new Map<string, string>() // `${accountId}_${chatId}_${msgId}` -> data URL
  private inFlightDownloads = new Map<string, Promise<string | null>>()
  private activeMediaDownloads = new Map<string, { abort: () => void; isCancelled: () => boolean }>()
  private customEmojiCache = new Map<string, string>() // documentId -> streamUrl
  private botButtonCache = new Map<string, Buffer>() // `${chatId}_${msgId}_${row}_${col}` or `${chatId}_${msgId}_${data}` -> Buffer

  constructor(store: SessionStore, onEvent?: (event: string, payload: any) => void) {
    this.store = store
    this.onEventCallback = onEvent
    this.avatarsDir = path.join(this.store.getDataDirectory(), 'avatars')
    this.mediaDir = path.join(this.store.getDataDirectory(), 'media_cache')
    try {
      if (!fs.existsSync(this.avatarsDir)) fs.mkdirSync(this.avatarsDir, { recursive: true })
      if (!fs.existsSync(this.mediaDir)) fs.mkdirSync(this.mediaDir, { recursive: true })
    } catch (e) {
      Logger.warn('[AccountManager] Cache directories creation warning:', e)
    }

    // Pre-populate saved accounts from SessionStore immediately so UI gets them in frame 0
    const config = this.store.getConfig()
    for (const savedAcc of config.accounts) {
      this.clients.set(savedAcc.id, {
        info: {
          ...savedAcc,
          status: 'connecting',
        },
      })
    }
  }

  /**
   * Connect and verify a single saved account
   */
  public async connectSavedAccount(savedAcc: AccountInfo): Promise<AccountInfo> {
    const config = this.store.getConfig()
    const sessionString = this.store.getSessionString(savedAcc.id)
    if (!sessionString) {
      Logger.warn(`[AccountManager] No session file found on disk for account ${savedAcc.id}`)
      const unauthInfo: AccountInfo = { ...savedAcc, status: 'needs_auth' }
      this.clients.set(savedAcc.id, { info: unauthInfo })
      this.onEventCallback?.('telegram:account-updated', { account: unauthInfo })
      return unauthInfo
    }

    const session = new sessions.StringSession(sessionString)
    const proxy = ProxyManager.toGramJsProxy(savedAcc.proxyConfig)

    // Retrieve persistent device profile or generate a realistic one
    const antiFingerprinting = config.antiFingerprinting !== false
    const profile = savedAcc.deviceProfile || DeviceProfileManager.getProfileForAccount(savedAcc.id, antiFingerprinting)

    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
      proxy: proxy,
      useWSS: false,
      deviceModel: profile.deviceModel,
      systemVersion: profile.systemVersion,
      appVersion: profile.appVersion,
      systemLangCode: profile.systemLangCode,
      langCode: profile.langCode,
    })

    try {
      Logger.info(`[AccountManager] Connecting saved account ${savedAcc.id} (${savedAcc.phone || savedAcc.firstName}) [Device: ${profile.deviceModel}, OS: ${profile.systemVersion}]...`)
      await client.connect()

      if (await client.isUserAuthorized()) {
        const me: any = await client.getMe()
        const updatedInfo: AccountInfo = {
          id: me.id.toString(),
          phone: me.phone ? (me.phone.startsWith('+') ? me.phone : `+${me.phone}`) : savedAcc.phone,
          firstName: me.firstName || savedAcc.firstName || 'User',
          lastName: me.lastName || savedAcc.lastName,
          username: me.username || savedAcc.username,
          status: 'connected',
          unreadTotal: savedAcc.unreadTotal || 0,
          proxyConfig: savedAcc.proxyConfig,
          isPremium: me.premium || false,
          deviceProfile: profile,
        }

        this.clients.set(updatedInfo.id, { client, session, info: updatedInfo })
        this.setupEventListeners(updatedInfo.id, client)

        // Keep config.json updated with fresh details
        const currentAccounts = this.store.getConfig().accounts.map((a) => (a.id === updatedInfo.id ? updatedInfo : a))
        this.store.updateConfig({ accounts: currentAccounts })

        Logger.info(`[AccountManager] Account ${updatedInfo.id} connected successfully!`)
        this.onEventCallback?.('telegram:account-updated', { account: updatedInfo })
        return updatedInfo
      } else {
        Logger.warn(`[AccountManager] Account ${savedAcc.id} is not authorized (session expired).`)
        const unauthInfo: AccountInfo = { ...savedAcc, status: 'needs_auth' }
        this.clients.set(savedAcc.id, { client, session, info: unauthInfo })
        this.onEventCallback?.('telegram:account-updated', { account: unauthInfo })
        return unauthInfo
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] Connection failed for account ${savedAcc.id}:`, err?.message || err)
      const disconnectedInfo: AccountInfo = { ...savedAcc, status: 'disconnected' }
      this.clients.set(savedAcc.id, { client, session, info: disconnectedInfo })
      this.onEventCallback?.('telegram:account-updated', { account: disconnectedInfo, error: err?.message })
      return disconnectedInfo
    }
  }

  /**
   * Reconnect an existing account (useful after proxy change or network restore)
   */
  public async reconnectAccount(accountId: string): Promise<AccountInfo> {
    const config = this.store.getConfig()
    const savedAcc = config.accounts.find((a) => a.id === accountId)
    if (!savedAcc) {
      throw new Error(`Account ${accountId} not found in saved accounts.`)
    }

    const connectingInfo: AccountInfo = { ...savedAcc, status: 'connecting' }
    const existing = this.clients.get(accountId)
    this.clients.set(accountId, { ...existing, info: connectingInfo })
    this.onEventCallback?.('telegram:account-updated', { account: connectingInfo })

    return this.connectSavedAccount(savedAcc)
  }

  /**
   * Initialize all saved accounts at startup
   */
  public async initialize(): Promise<AccountInfo[]> {
    const config = this.store.getConfig()
    const loadedAccounts: AccountInfo[] = []

    for (const savedAcc of config.accounts) {
      const res = await this.connectSavedAccount(savedAcc)
      loadedAccounts.push(res)
    }

    this.onEventCallback?.('telegram:accounts-loaded', { accounts: loadedAccounts })
    return loadedAccounts
  }

  /**
   * Step 1: Start login via Phone Number
   */
  public async startPhoneAuth(phone: string, proxy?: ProxyConfig): Promise<{ phoneCodeHash: string }> {
    Logger.info(`[AccountManager] Starting phone auth for ${phone}, proxy=${proxy?.host || 'direct'}`)
    const config = this.store.getConfig()
    const session = new sessions.StringSession('')
    const gramProxy = ProxyManager.toGramJsProxy(proxy)

    const antiFingerprinting = config.antiFingerprinting !== false
    const profile = DeviceProfileManager.getProfileForAccount(phone, antiFingerprinting)

    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 3,
      proxy: gramProxy,
      deviceModel: profile.deviceModel,
      systemVersion: profile.systemVersion,
      appVersion: profile.appVersion,
      systemLangCode: profile.systemLangCode,
      langCode: profile.langCode,
    })

    try {
      await client.connect()
      Logger.info(`[AccountManager] Connected to Telegram DC for ${phone} [Device: ${profile.deviceModel}]. Sending code...`)

      const { phoneCodeHash } = await client.sendCode(
        {
          apiId: config.apiId,
          apiHash: config.apiHash,
        },
        phone
      )

      Logger.info(`[AccountManager] Code sent to ${phone}, phoneCodeHash: ${phoneCodeHash}`)
      this.pendingAuthClients.set(phone, { client, phoneCodeHash, proxy, profile })
      return { phoneCodeHash }
    } catch (err: any) {
      Logger.error(`[AccountManager] startPhoneAuth failed for ${phone}:`, err)
      try {
        await client.disconnect()
      } catch (_) {}
      throw err
    }
  }

  /**
   * Step 2: Complete login with Verification Code (and 2FA password if required)
   */
  public async completePhoneAuth(
    phone: string,
    code: string,
    password?: string
  ): Promise<AccountInfo> {
    const pending = this.pendingAuthClients.get(phone)
    if (!pending) {
      throw new Error('No pending authentication found for this phone number.')
    }

    const { client, phoneCodeHash, proxy, profile } = pending
    const config = this.store.getConfig()

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash,
          phoneCode: code,
        })
      )
    } catch (err: any) {
      if (
        err.errorMessage === 'SESSION_PASSWORD_NEEDED' ||
        (err.message && err.message.includes('SESSION_PASSWORD_NEEDED'))
      ) {
        if (!password) {
          throw new Error('2FA_REQUIRED')
        }
        await client.signInWithPassword(
          {
            apiId: config.apiId,
            apiHash: config.apiHash,
          },
          {
            password: async () => password,
            onError: (passwordErr: any) => {
              throw passwordErr
            },
          }
        )
      } else {
        throw err
      }
    }

    const me: any = await client.getMe()
    const sessionString = client.session.save() as unknown as string
    const accountId = me.id.toString()

    const info: AccountInfo = {
      id: accountId,
      phone: me.phone || phone,
      firstName: me.firstName || 'User',
      lastName: me.lastName || undefined,
      username: me.username || undefined,
      status: 'connected',
      unreadTotal: 0,
      proxyConfig: proxy,
      isPremium: me.premium || false,
      deviceProfile: profile || DeviceProfileManager.getProfileForAccount(accountId, config.antiFingerprinting !== false),
    }

    // Save session to portable disk
    this.store.saveSessionString(accountId, sessionString)

    // Update config
    const currentAccounts = config.accounts.filter((a) => a.id !== accountId)
    currentAccounts.push(info)
    this.store.updateConfig({ accounts: currentAccounts })

    this.clients.set(accountId, {
      client,
      session: client.session as any,
      info,
    })

    this.pendingAuthClients.delete(phone)
    this.setupEventListeners(accountId, client)

    return info
  }

  /**
   * Start QR Code authentication flow
   */
  public async startQrAuth(proxy?: ProxyConfig): Promise<QrTokenPayload> {
    Logger.info(`[AccountManager] Starting QR auth, proxy=${proxy?.host || 'direct'}`)
    await this.cancelQrAuth()

    const config = this.store.getConfig()
    const session = new sessions.StringSession('')
    const gramProxy = ProxyManager.toGramJsProxy(proxy)

    const antiFingerprinting = config.antiFingerprinting !== false
    // Generate a temporary seed based on timestamp or random for QR initiation
    const qrSeed = `qr_${Date.now()}_${Math.random()}`
    const profile = DeviceProfileManager.getProfileForAccount(qrSeed, antiFingerprinting)

    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
      proxy: gramProxy,
      useWSS: false,
      deviceModel: profile.deviceModel,
      systemVersion: profile.systemVersion,
      appVersion: profile.appVersion,
      systemLangCode: profile.systemLangCode,
      langCode: profile.langCode,
    })

    const qrState: PendingQrAuth = {
      client,
      proxy,
      cancelled: false,
      profile,
    }
    this.pendingQrAuth = qrState

    try {
      await client.connect()
      Logger.info('[AccountManager] Connected to Telegram DC for QR auth. Requesting ExportLoginToken...')

      const res = await client.invoke(
        new Api.auth.ExportLoginToken({
          apiId: config.apiId,
          apiHash: config.apiHash,
          exceptIds: [],
        })
      )

      if (!(res instanceof Api.auth.LoginToken)) {
        throw new Error('Unexpected initial response from Telegram for QR authentication.')
      }

      Logger.info('[AccountManager] Received initial LoginToken from Telegram DC.')

      const tokenStr = Buffer.from(res.token).toString('base64url')
      const url = `tg://login?token=${tokenStr}`
      const expires = res.expires
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })

      const payload: QrTokenPayload = {
        url,
        qrDataUrl,
        expires,
      }

      this.onEventCallback?.('telegram:qr-token', payload)

      // Run polling/event loop in background
      this.runQrLoop(qrState, tokenStr, res.expires).catch((err) => {
        if (!qrState.cancelled) {
          Logger.error('[AccountManager] QR loop fatal error:', err)
          this.onEventCallback?.('telegram:qr-error', { message: err.message || 'QR login error' })
        }
      })

      return payload
    } catch (err: any) {
      Logger.error('[AccountManager] startQrAuth failed:', err)
      if (this.pendingQrAuth === qrState) {
        this.pendingQrAuth = undefined
      }
      try {
        await client.disconnect()
      } catch (_) {}
      throw err
    }
  }

  /**
   * Cancel active QR Code authentication
   */
  public async cancelQrAuth(): Promise<void> {
    if (this.pendingQrAuth) {
      Logger.info('[AccountManager] Cancelling active QR auth session...')
      this.pendingQrAuth.cancelled = true
      this.pendingQrAuth.wakeUp?.()
      const client = this.pendingQrAuth.client
      this.pendingQrAuth = undefined
      try {
        await client.disconnect()
        Logger.info('[AccountManager] Disconnected QR auth client successfully.')
      } catch (err) {
        Logger.warn('[AccountManager] Disconnect error during cancelQrAuth:', err)
      }
    }
  }

  /**
   * Submit 2FA password during QR login flow
   */
  public async submitQrPassword(password: string): Promise<AccountInfo> {
    if (!this.pendingQrAuth || this.pendingQrAuth.cancelled) {
      throw new Error('No active QR login session in progress.')
    }

    Logger.info('[AccountManager] Submitting 2FA password for QR login...')
    const { client, proxy } = this.pendingQrAuth
    const config = this.store.getConfig()

    await client.signInWithPassword(
      {
        apiId: config.apiId,
        apiHash: config.apiHash,
      },
      {
        password: async () => password,
        onError: (err: any) => {
          throw err
        },
      }
    )

    return this.finalizeQrLogin(client, proxy)
  }

  /**
   * Internal loop to listen for MTProto UpdateLoginToken and refresh expired tokens
   */
  private async runQrLoop(
    qrState: PendingQrAuth,
    initialTokenStr: string,
    initialExpires: number
  ): Promise<void> {
    const { client, proxy } = qrState
    const config = this.store.getConfig()
    let lastTokenStr = initialTokenStr
    let currentExpires = initialExpires

    let wakeUpTrigger: (() => void) | undefined
    let isFinished = false

    const updateHandler = (update: any) => {
      if (isFinished || qrState.cancelled) return
      const isLoginToken =
        update instanceof Api.UpdateLoginToken ||
        update?.className === 'UpdateLoginToken' ||
        update?.originalUpdate instanceof Api.UpdateLoginToken ||
        update?.originalUpdate?.className === 'UpdateLoginToken'

      if (isLoginToken) {
        Logger.info('[AccountManager] Received UpdateLoginToken MTProto update! Waking up QR loop...')
        wakeUpTrigger?.()
      }
    }
    client.addEventHandler(updateHandler)

    qrState.wakeUp = () => {
      wakeUpTrigger?.()
    }

    try {
      while (!qrState.cancelled && !isFinished) {
        // Calculate remaining seconds until current token expires
        const nowSec = Math.floor(Date.now() / 1000)
        // Wake up 2 seconds before token expires, or wait minimum 3 seconds
        const secondsToWait = Math.max(3, currentExpires - nowSec - 2)
        Logger.info(`[AccountManager] QR session waiting ${secondsToWait}s for scan or refresh...`)

        await new Promise<void>((resolve) => {
          let timer: NodeJS.Timeout | null = null
          const onWake = () => {
            if (timer) clearTimeout(timer)
            resolve()
          }
          wakeUpTrigger = onWake
          timer = setTimeout(() => {
            wakeUpTrigger = undefined
            resolve()
          }, secondsToWait * 1000)
        })

        if (qrState.cancelled || isFinished) break

        try {
          Logger.info('[AccountManager] Exporting login token to check status or refresh...')
          const res = await client.invoke(
            new Api.auth.ExportLoginToken({
              apiId: config.apiId,
              apiHash: config.apiHash,
              exceptIds: [],
            })
          )

          if (qrState.cancelled || isFinished) break

          if (res instanceof Api.auth.LoginToken) {
            currentExpires = res.expires
            const tokenStr = Buffer.from(res.token).toString('base64url')
            if (tokenStr !== lastTokenStr) {
              lastTokenStr = tokenStr
              const url = `tg://login?token=${tokenStr}`
              Logger.info(`[AccountManager] Refreshed QR LoginToken from Telegram (expires in: ${currentExpires - Math.floor(Date.now() / 1000)}s).`)
              const qrDataUrl = await QRCode.toDataURL(url, {
                width: 280,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#ffffff',
                },
              })
              this.onEventCallback?.('telegram:qr-token', { url, qrDataUrl, expires: currentExpires })
            }
          } else if (res instanceof Api.auth.LoginTokenSuccess) {
            Logger.info('[AccountManager] LoginTokenSuccess received! User approved QR login on phone.')
            this.onEventCallback?.('telegram:qr-scanned', {})
            await this.finalizeQrLogin(client, proxy)
            isFinished = true
            break
          } else if (res instanceof Api.auth.LoginTokenMigrateTo) {
            Logger.info(`[AccountManager] LoginTokenMigrateTo DC ${res.dcId}! Migrating DC...`)
            this.onEventCallback?.('telegram:qr-scanned', {})
            await client._switchDC(res.dcId)
            const migrated = await client.invoke(
              new Api.auth.ImportLoginToken({
                token: res.token,
              })
            )
            if (migrated instanceof Api.auth.LoginTokenSuccess) {
              Logger.info('[AccountManager] ImportLoginToken successful after DC migration!')
              await this.finalizeQrLogin(client, proxy)
              isFinished = true
              break
            } else {
              throw new Error('Unexpected response during DC migration.')
            }
          }
        } catch (err: any) {
          if (qrState.cancelled || isFinished) break

          if (
            err.errorMessage === 'SESSION_PASSWORD_NEEDED' ||
            (err.message && err.message.includes('SESSION_PASSWORD_NEEDED'))
          ) {
            Logger.info('[AccountManager] SESSION_PASSWORD_NEEDED received: 2FA required for account.')
            this.onEventCallback?.('telegram:qr-scanned', {})
            let hint = ''
            try {
              const pwd = await client.invoke(new Api.account.GetPassword())
              hint = pwd.hint || ''
            } catch (e) {
              Logger.warn('[AccountManager] Could not get 2FA hint:', e)
            }
            this.onEventCallback?.('telegram:qr-2fa', { hint })
            isFinished = true
            break
          }

          Logger.warn('[AccountManager] Transient error in QR poll iteration:', err?.message || err)
          // Wait 2 seconds before retrying to prevent tight loop
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
    } finally {
      isFinished = true
      qrState.wakeUp = undefined
      try {
        ;(client as any)._eventBuilders = (client as any)._eventBuilders?.filter(
          (item: any) => item[1] !== updateHandler
        )
      } catch (_) {}
    }
  }

  /**
   * Finalize authorized account after QR approval
   */
  private async finalizeQrLogin(client: TelegramClient, proxy?: ProxyConfig): Promise<AccountInfo> {
    const config = this.store.getConfig()
    const me: any = await client.getMe()
    const sessionString = client.session.save() as unknown as string
    const accountId = me.id.toString()
    const phoneStr = me.phone ? (me.phone.startsWith('+') ? me.phone : `+${me.phone}`) : 'QR User'

    const qrProfile = this.pendingQrAuth?.profile || DeviceProfileManager.getProfileForAccount(accountId, config.antiFingerprinting !== false)

    const info: AccountInfo = {
      id: accountId,
      phone: phoneStr,
      firstName: me.firstName || 'User',
      lastName: me.lastName || undefined,
      username: me.username || undefined,
      status: 'connected',
      unreadTotal: 0,
      proxyConfig: proxy,
      isPremium: me.premium || false,
      deviceProfile: qrProfile,
    }

    this.store.saveSessionString(accountId, sessionString)

    const currentAccounts = config.accounts.filter((a) => a.id !== accountId)
    currentAccounts.push(info)
    this.store.updateConfig({ accounts: currentAccounts })

    this.clients.set(accountId, {
      client,
      session: client.session as any,
      info,
    })

    this.pendingQrAuth = undefined
    this.setupEventListeners(accountId, client)
    Logger.info(`[AccountManager] finalizeQrLogin completed successfully for account ${accountId} (${phoneStr})`)
    this.onEventCallback?.('telegram:qr-success', { account: info })

    return info
  }

  /**
   * Remove account & delete portable session
   */
  public async logoutAccount(accountId: string): Promise<void> {
    const holder = this.clients.get(accountId)
    if (holder) {
      try {
        if (holder.client) {
          await holder.client.disconnect()
        }
      } catch (err) {
        console.warn(`[AccountManager] Disconnect error on logout:`, err)
      }
      this.clients.delete(accountId)
    }
    this.store.removeSession(accountId)
  }

  /**
   * Get dialog list for an account (Deep loading & pagination enabled)
   */
  public async getDialogs(
    accountId: string,
    limit = 350,
    offsetDate?: number,
    offsetId?: number
  ): Promise<DialogItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) {
      throw new Error(`Account ${accountId} is still connecting or disconnected.`)
    }

    const options: any = { limit }
    if (typeof offsetDate === 'number' && offsetDate > 0) {
      options.offsetDate = offsetDate
    }
    if (typeof offsetId === 'number' && offsetId > 0) {
      options.offsetId = offsetId
    }

    const dialogs = await holder.client.getDialogs(options)
    const nowSec = Math.floor(Date.now() / 1000)

    const dialogItems = dialogs.map((d: any) => {
      const entity = d.entity || {}
      const isUser = d.isUser || false
      const isGroup = d.isGroup || false
      const isChannel = d.isChannel || false
      const isBroadcast = isChannel && !isGroup
      const isForum = entity.forum === true
      const isBot = entity.bot || false
      const peerId = d.id.toString()
      const cachedAvatar = this.avatarCache.get(`${accountId}_${peerId}`)

      const notifySettings = d.dialog?.notifySettings || (d as any).notifySettings || (entity as any)?.notifySettings
      let isMuted = false
      if (notifySettings) {
        if (notifySettings.silent === true) {
          isMuted = true
        } else if (notifySettings.muteUntil !== undefined && notifySettings.muteUntil !== null) {
          const muteVal = Number(notifySettings.muteUntil)
          if (muteVal > nowSec || muteVal === 2147483647) {
            isMuted = true
          }
        }
      }
      // In Telegram, broadcast channels without explicit un-muting are muted by default
      if (!isMuted && isBroadcast && (!notifySettings || notifySettings.muteUntil === undefined)) {
        isMuted = true
      }

      const unreadCount = d.unreadCount || 0
      const unreadMentionsCount = d.unreadMentionsCount || d.dialog?.unreadMentionsCount || 0
      const unreadSendersCount = isGroup && unreadCount > 0 ? (unreadCount === 1 ? 1 : 2) : undefined

      const isPremium = entity.premium === true
      const customEmojiStatusId = entity.emojiStatus?.documentId
        ? entity.emojiStatus.documentId.toString()
        : undefined

      const fullTitle =
        (isUser
          ? formatEntityName(entity, d.title || d.name || 'User')
          : (entity.title || d.title || d.name)) || 'Chat'

      return {
        id: peerId,
        accountId,
        title: fullTitle,
        unreadCount,
        unreadMentionsCount,
        unreadSendersCount,
        isMuted,
        isUser,
        isGroup,
        isChannel,
        isBroadcast,
        isForum,
        isBot,
        isPinned: d.pinned || false,
        lastMessageText: d.message?.message || '',
        lastMessageDate: d.message?.date ? d.message.date * 1000 : Date.now(),
        avatarInitials: fullTitle.substring(0, 2).toUpperCase(),
        avatarUrl: cachedAvatar,
        username: entity.username || undefined,
        isPremium,
        customEmojiStatusId,
        folderId: d.folderId !== undefined ? d.folderId : (d.dialog?.folderId !== undefined ? d.dialog.folderId : undefined),
      }
    })

    return dialogItems
  }

  /**
   * Fetch contacts list for an account
   */
  public async getContacts(accountId: string): Promise<ContactItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const res: any = await holder.client.invoke(
        new Api.contacts.GetContacts({ hash: BigInt(0) as any })
      )
      if (!res || !Array.isArray(res.users)) return []
      return res.users.map((u: any) => {
        const firstName = u.firstName || ''
        const lastName = u.lastName || undefined
        return {
          id: u.id?.toString() || '',
          firstName,
          lastName,
          phone: u.phone || undefined,
          username: u.username || undefined,
        }
      })
    } catch (err) {
      Logger.error(`[AccountManager] Failed to get contacts for ${accountId}:`, err)
      return []
    }
  }

  /**
   * Get messages for a given chat with rich replies, media and formatting entities
   */
  public async getMessages(
    accountId: string,
    chatId: string,
    limit = 40,
    offsetId?: number,
    addOffset?: number
  ): Promise<MessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) {
      throw new Error(`Account ${accountId} is still connecting or disconnected.`)
    }

    const options: any = { limit }
    if (typeof offsetId === 'number' && offsetId > 0) {
      options.offsetId = offsetId
    }
    if (typeof addOffset === 'number') {
      options.addOffset = addOffset
    }

    const messages = await holder.client.getMessages(chatId, options)

    // Build map for quick reply lookup
    const msgMap = new Map<number, any>()
    for (const m of messages) {
      if (m && m.id) {
        msgMap.set(m.id, m)
      }
    }

    // Pre-fetch any missing replied messages so snippets and sender names can be resolved accurately
    const missingReplyIds = Array.from(
      new Set(
        messages
          .map((m: any) => m.replyTo?.replyToMsgId)
          .filter((id: any) => typeof id === 'number' && id > 0 && !msgMap.has(id))
      )
    )
    if (missingReplyIds.length > 0) {
      try {
        const extraMsgs = await holder.client.getMessages(chatId, { ids: missingReplyIds })
        for (const em of extraMsgs) {
          if (em && em.id) {
            msgMap.set(em.id, em)
          }
        }
      } catch (e) {
        Logger.warn(`[AccountManager] Failed to fetch missing reply messages for ${chatId}:`, e)
      }
    }

    return messages.map((m: any) => {
      let replyMarkup: { rows: InlineButton[][] } | undefined = undefined
      if (m.replyMarkup && (m.replyMarkup as any).rows) {
        replyMarkup = {
          rows: (m.replyMarkup as any).rows.map((row: any, rIdx: number) =>
            (row.buttons || []).map((btn: any, bIdx: number) => {
              let callbackData: string | undefined = undefined
              if (btn.data) {
                try {
                  const rawBuf = Buffer.isBuffer(btn.data) ? btn.data : Buffer.from(btn.data)
                  callbackData = rawBuf.toString('base64')
                  this.botButtonCache.set(`${chatId}_${m.id}_${rIdx}_${bIdx}`, rawBuf)
                  this.botButtonCache.set(`${chatId}_${m.id}_${callbackData}`, rawBuf)
                } catch (_) {
                  callbackData = String(btn.data)
                }
              }
              return {
                text: btn.text || '',
                url: btn.url,
                data: callbackData,
              }
            })
          ),
        }
      }

      // Parse reply info
      let replyTo: ReplyInfo | undefined = undefined
      const replyToMsgId = m.replyTo?.replyToMsgId
      if (replyToMsgId) {
        const replied = msgMap.get(replyToMsgId)
        if (replied) {
          replyTo = {
            replyToMsgId,
            senderName: formatEntityName(replied.sender, 'User'),
            text: replied.message || (replied.media ? `[${this.detectMediaType(replied.media) || 'Media'}]` : ''),
          }
        } else {
          replyTo = {
            replyToMsgId,
          }
        }
      }

      const mediaData = this.parseMedia(m.media)
      const cacheKey = `${accountId}_${chatId}_${m.id}_thumb`
      const cachedMediaUrl = this.mediaCache.get(cacheKey) || this.mediaCache.get(`${accountId}_${chatId}_${m.id}`)
      const entities = this.parseEntities(m.entities)

      const senderUser = m.sender
      let senderEmojiStatusId: string | undefined = undefined
      if (senderUser?.emojiStatus?.documentId) {
        senderEmojiStatusId = senderUser.emojiStatus.documentId.toString()
      }
      const senderColor = senderUser?.color?.color !== undefined
        ? senderUser.color.color
        : (m.senderId ? Math.abs(Number(m.senderId)) % 7 : undefined)
      const senderIsPremium = senderUser?.premium === true

      return {
        id: m.id,
        chatId,
        accountId,
        senderId: m.senderId?.toString(),
        senderName: formatEntityName(m.sender, 'Unknown'),
        senderEmojiStatusId,
        senderColor,
        senderIsPremium,
        text: m.message || '',
        date: m.date * 1000,
        isOutgoing: m.out || false,
        postAuthor: (m as any).postAuthor || undefined,
        senderRank: (m as any).postAuthor || undefined,
        isForwarded: !!m.fwdFrom,
        forwardFromName: m.fwdFrom?.fromName || undefined,
        replyToMsgId,
        replyTo,
        mediaType: mediaData.mediaType,
        isSticker: mediaData.isSticker,
        isVoice: mediaData.isVoice,
        isRoundVideo: mediaData.isRoundVideo,
        voiceWaveform: mediaData.voiceWaveform,
        mediaFileName: mediaData.mediaFileName,
        mediaFileSize: mediaData.mediaFileSize,
        mediaDuration: mediaData.mediaDuration,
        mediaWidth: mediaData.mediaWidth,
        mediaHeight: mediaData.mediaHeight,
        mediaMimeType: mediaData.mediaMimeType,
        webPage: mediaData.webPage,
        mediaUrl: cachedMediaUrl,
        entities,
        replyMarkup,
      }
    }).reverse() // Chronological order
  }

  /**
   * Get / Download profile photo of a user, chat or channel
   */
  public async getProfilePhoto(accountId: string, peerId: string): Promise<string | null> {
    const cacheKey = `${accountId}_${peerId}`
    if (this.avatarCache.has(cacheKey)) {
      return this.avatarCache.get(cacheKey)!
    }

    const diskPath = path.join(this.avatarsDir, `${cacheKey}.jpg`)
    if (fs.existsSync(diskPath)) {
      try {
        const fileBuf = await fs.promises.readFile(diskPath)
        const dataUrl = `data:image/jpeg;base64,${fileBuf.toString('base64')}`
        this.avatarCache.set(cacheKey, dataUrl)
        return dataUrl
      } catch (_) {}
    }

    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) return null

    try {
      const entity = await holder.client.getEntity(peerId)
      const photoBuf = await holder.client.downloadProfilePhoto(entity, { isBig: false })
      if (photoBuf && photoBuf.length > 0) {
        const dataUrl = `data:image/jpeg;base64,${Buffer.from(photoBuf).toString('base64')}`
        this.avatarCache.set(cacheKey, dataUrl)
        fs.promises.writeFile(diskPath, photoBuf).catch((err) => {
          Logger.warn(`[AccountManager] Failed to cache avatar to disk:`, err)
        })
        return dataUrl
      }
    } catch (err) {
      // Entity has no avatar photo or privacy restricts it
    }

    return null
  }

  /**
   * Download message media (photo, video thumb, document) with local disk caching and parallel chunk acceleration
   */
  public async downloadMedia(
    accountId: string,
    chatId: string,
    messageId: number,
    thumb = false
  ): Promise<string | null> {
    const cacheKey = `${accountId}_${chatId}_${messageId}${thumb ? '_thumb' : ''}`
    if (this.mediaCache.has(cacheKey)) {
      return this.mediaCache.get(cacheKey)!
    }

    if (this.inFlightDownloads.has(cacheKey)) {
      return this.inFlightDownloads.get(cacheKey)!
    }

    const cancelKey = `${accountId}_${chatId}_${messageId}`
    let isCancelled = false
    this.activeMediaDownloads.set(cancelKey, {
      abort: () => {
        isCancelled = true
      },
      isCancelled: () => isCancelled,
    })

    const downloadPromise = this.performDownloadMedia(accountId, chatId, messageId, thumb, cacheKey, () => isCancelled)
    this.inFlightDownloads.set(cacheKey, downloadPromise)

    try {
      return await downloadPromise
    } finally {
      this.inFlightDownloads.delete(cacheKey)
      this.activeMediaDownloads.delete(cancelKey)
    }
  }

  /**
   * Cancel in-flight download of media
   */
  public async cancelDownloadMedia(accountId: string, chatId: string, messageId: number): Promise<boolean> {
    const cancelKey = `${accountId}_${chatId}_${messageId}`
    const active = this.activeMediaDownloads.get(cancelKey)
    if (active) {
      active.abort()
      this.activeMediaDownloads.delete(cancelKey)
      this.onEventCallback?.('telegram:download-progress', {
        accountId,
        chatId,
        messageId,
        progress: -1,
        bytesReceived: 0,
        totalBytes: 0,
      })
      return true
    }
    return false
  }

  private async performDownloadMedia(
    accountId: string,
    chatId: string,
    messageId: number,
    thumb: boolean,
    cacheKey: string,
    isCancelled?: () => boolean
  ): Promise<string | null> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) return null

    try {
      const msgs = await holder.client.getMessages(chatId, { ids: [messageId] })
      if (!msgs || msgs.length === 0 || !msgs[0].media) return null

      const mediaObj = msgs[0].media as any
      const mime = mediaObj?.document?.mimeType || 'image/jpeg'
      let ext = '.jpg'
      if (mime.includes('video/mp4') || mime.includes('video')) ext = '.mp4'
      else if (mime.includes('audio') || mime.includes('ogg')) ext = '.ogg'
      else if (mime.includes('webp')) ext = '.webp'
      else if (mime.includes('png')) ext = '.png'
      else if (mime.includes('pdf')) ext = '.pdf'

      const diskPath = path.join(this.mediaDir, `${cacheKey}${thumb ? '.jpg' : ext}`)
      if (fs.existsSync(diskPath)) {
        if (thumb) {
          const fileBuf = await fs.promises.readFile(diskPath)
          const dataUrl = `data:image/jpeg;base64,${fileBuf.toString('base64')}`
          this.mediaCache.set(cacheKey, dataUrl)
          return dataUrl
        } else {
          const streamUrl = `guidegram-media://local/${encodeURIComponent(diskPath)}`
          this.mediaCache.set(cacheKey, streamUrl)
          return streamUrl
        }
      }

      const tempDiskPath = `${diskPath}.part`
      const doc = mediaObj?.document as Api.Document | undefined
      const fileSize = doc?.size ? Number(doc.size) : 0

      if (!thumb && doc && fileSize > 2 * 1024 * 1024) {
        // Parallel Chunk Acceleration for large documents / video (> 2MB)
        try {
          await parallelDownloadDocument(holder.client, doc, diskPath, {
            workers: 4,
            partSizeKB: 512,
            isCancelled,
            onProgress: (percent, received, total) => {
              this.onEventCallback?.('telegram:download-progress', {
                accountId,
                chatId,
                messageId,
                progress: percent,
                bytesReceived: received,
                totalBytes: total,
              })
            },
          })
        } catch (parallelErr: any) {
          if (parallelErr?.message === 'DOWNLOAD_CANCELLED' || isCancelled?.()) {
            await fs.promises.unlink(tempDiskPath).catch(() => {})
            return null
          }
          Logger.warn(`[AccountManager] Parallel download failed for ${chatId}/${messageId}, falling back:`, parallelErr)
          await fs.promises.unlink(tempDiskPath).catch(() => {})
          const fallbackRes = await holder.client.downloadMedia(msgs[0].media, {
            outputFile: tempDiskPath,
            thumb: undefined,
          })
          if (Buffer.isBuffer(fallbackRes)) {
            await fs.promises.writeFile(tempDiskPath, fallbackRes)
          }
          if (fs.existsSync(tempDiskPath)) {
            await fs.promises.rename(tempDiskPath, diskPath)
          }
        }
      } else {
        if (isCancelled?.()) return null

        // Streamed or thumbnail download
        if (thumb) {
          let thumbIndex: number | undefined = undefined
          if (mediaObj?.document?.thumbs && mediaObj.document.thumbs.length > 0) {
            thumbIndex = mediaObj.document.thumbs.length - 1
          } else if (mediaObj?.photo?.sizes && mediaObj.photo.sizes.length > 0) {
            thumbIndex = Math.min(1, mediaObj.photo.sizes.length - 1)
          } else {
            thumbIndex = 0
          }

          const buf = await holder.client.downloadMedia(msgs[0].media, { thumb: thumbIndex })
          if (buf && (Buffer.isBuffer(buf) || (buf as any).length > 0)) {
            await fs.promises.writeFile(tempDiskPath, buf)
            await fs.promises.rename(tempDiskPath, diskPath)
          }
        } else {
          await holder.client.downloadMedia(msgs[0].media, {
            outputFile: tempDiskPath,
          })
          if (fs.existsSync(tempDiskPath)) {
            await fs.promises.rename(tempDiskPath, diskPath)
          }
        }
      }

      if (fs.existsSync(diskPath)) {
        if (thumb) {
          const fileBuf = await fs.promises.readFile(diskPath)
          const dataUrl = `data:image/jpeg;base64,${fileBuf.toString('base64')}`
          this.mediaCache.set(cacheKey, dataUrl)
          return dataUrl
        } else {
          const streamUrl = `guidegram-media://local/${encodeURIComponent(diskPath)}`
          this.mediaCache.set(cacheKey, streamUrl)
          this.onEventCallback?.('telegram:download-progress', {
            accountId,
            chatId,
            messageId,
            progress: 100,
            bytesReceived: fileSize,
            totalBytes: fileSize,
          })
          return streamUrl
        }
      }
    } catch (err: any) {
      if (err?.message !== 'DOWNLOAD_CANCELLED') {
        Logger.warn(`[AccountManager] Failed to download media for ${chatId}/${messageId}:`, err)
      }
    }

    return null
  }

  /**
   * Save media directly to user's downloads folder or prompt with native Save Dialog
   */
  public async saveMediaToFile(
    win: BrowserWindow | null,
    accountId: string,
    chatId: string,
    messageId: number,
    defaultName?: string
  ): Promise<{ success: boolean; filePath?: string; canceled?: boolean }> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is disconnected.`)

    // Ensure media is downloaded
    const mediaUrl = await this.downloadMedia(accountId, chatId, messageId, false)
    if (!mediaUrl) {
      throw new Error('Failed to download media for saving.')
    }

    const cacheKey = `${accountId}_${chatId}_${messageId}`
    let sourcePath = ''
    const exts = ['.mp4', '.jpg', '.png', '.webp', '.ogg', '.pdf', '']
    for (const ext of exts) {
      const p = path.join(this.mediaDir, `${cacheKey}${ext}`)
      if (fs.existsSync(p)) {
        sourcePath = p
        break
      }
    }

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      throw new Error('Cached media file not found on disk.')
    }

    const safeDefaultName = defaultName || path.basename(sourcePath)
    const downloadsFolder = app.getPath('downloads')
    const targetDefault = path.join(downloadsFolder, safeDefaultName)

    if (win) {
      const res = await dialog.showSaveDialog(win, {
        title: 'Save Media to Computer',
        defaultPath: targetDefault,
      })
      if (res.canceled || !res.filePath) {
        return { success: false, canceled: true }
      }
      await fs.promises.copyFile(sourcePath, res.filePath)
      return { success: true, filePath: res.filePath }
    } else {
      await fs.promises.copyFile(sourcePath, targetDefault)
      return { success: true, filePath: targetDefault }
    }
  }

  /**
   * Execute bot inline button callback query and retrieve answer
   */
  public async sendBotCallbackQuery(
    accountId: string,
    chatId: string,
    messageId: number,
    data?: string,
    row?: number,
    col?: number
  ): Promise<BotCallbackResult> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) {
      throw new Error(`Account ${accountId} is still connecting or disconnected.`)
    }

    // 1. Resolve raw buffer from memory cache or decode base64
    let rawDataBuf: Buffer | undefined = undefined
    if (typeof row === 'number' && typeof col === 'number') {
      rawDataBuf = this.botButtonCache.get(`${chatId}_${messageId}_${row}_${col}`)
    }
    if (!rawDataBuf && data) {
      rawDataBuf = this.botButtonCache.get(`${chatId}_${messageId}_${data}`)
      if (!rawDataBuf) {
        try {
          rawDataBuf = Buffer.from(data, 'base64')
        } catch (_) {
          rawDataBuf = Buffer.from(data, 'utf-8')
        }
      }
    }

    // 2. Direct fast invocation via MTProto GetBotCallbackAnswer
    try {
      const peer = await holder.client.getInputEntity(chatId)
      const result: any = await holder.client.invoke(
        new Api.messages.GetBotCallbackAnswer({
          peer,
          msgId: messageId,
          data: rawDataBuf,
        })
      )

      return {
        message: result?.message || undefined,
        alert: result?.alert || false,
        url: result?.url || undefined,
      }
    } catch (directErr: any) {
      Logger.warn(`[AccountManager] Direct GetBotCallbackAnswer failed, attempting message.click fallback:`, directErr?.message)

      // Fallback: try native message.click(i, j) if coordinates provided
      if (typeof row === 'number' && typeof col === 'number') {
        try {
          const msgs = await holder.client.getMessages(chatId, { ids: messageId })
          const targetMsg = Array.isArray(msgs) ? msgs[0] : msgs
          if (targetMsg && typeof targetMsg.click === 'function') {
            const clickRes: any = await targetMsg.click({ i: row, j: col })
            if (clickRes) {
              return {
                message: clickRes.message || (typeof clickRes === 'string' ? clickRes : undefined),
                alert: clickRes.alert || false,
                url: clickRes.url || (typeof clickRes === 'string' && clickRes.startsWith('http') ? clickRes : undefined),
              }
            }
          }
        } catch (clickErr: any) {
          Logger.warn(`[AccountManager] msgs.click fallback also failed:`, clickErr?.message)
        }
      }

      throw directErr
    }
  }

  /**
   * Fetch custom / premium emoji document and return cached local stream URL or parsed Lottie JSON
   */
  public async getCustomEmojiUrl(accountId: string, documentId: string): Promise<string | null> {
    const payload = await this.getCustomEmojiData(accountId, documentId)
    return payload?.url || null
  }

  public async getCustomEmojiData(accountId: string, documentId: string): Promise<CustomEmojiPayload | null> {
    if (!documentId) return null

    // Check disk cache for uncompressed json (lottie)
    const jsonPath = path.join(this.mediaDir, `emoji_${documentId}.json`)
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = await fs.promises.readFile(jsonPath, 'utf-8')
        const data = JSON.parse(raw)
        return { format: 'lottie', data }
      } catch (_) {}
    }

    const diskPath = path.join(this.mediaDir, `emoji_${documentId}.webp`)
    if (fs.existsSync(diskPath)) {
      const streamUrl = `guidegram-media://local/${encodeURIComponent(diskPath)}`
      this.customEmojiCache.set(documentId, streamUrl)
      return { format: 'image', url: streamUrl }
    }

    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) return null

    try {
      const res: any = await holder.client.invoke(
        new Api.messages.GetCustomEmojiDocuments({
          documentId: [helpers.returnBigInt(documentId)],
        })
      )

      if (Array.isArray(res) && res.length > 0) {
        const doc = res[0]
        const mime = (doc.mimeType || '').toLowerCase()
        const isTgSticker = mime.includes('tgsticker') || mime.includes('tgs')
        const isVideo = mime.includes('video')

        let buf: any = await holder.client.downloadMedia(doc, {})
        if (!buf || buf.length === 0) {
          if (doc.thumbs && doc.thumbs.length > 0) {
            try {
              const thumbIdx = doc.thumbs.length - 1
              buf = await holder.client.downloadMedia(doc, { thumb: thumbIdx })
            } catch (_) {}
          }
        }

        if (buf && (Buffer.isBuffer(buf) || (buf as any).length > 0)) {
          const rawBuf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)

          // Check if it's gzip compressed TGS (Telegram Animated Sticker / Emoji)
          const isGzip = rawBuf.length > 2 && rawBuf[0] === 0x1f && rawBuf[1] === 0x8b
          if (isTgSticker || isGzip) {
            try {
              const decompressed = zlib.gunzipSync(rawBuf)
              const jsonStr = decompressed.toString('utf-8')
              const lottieData = JSON.parse(jsonStr)
              await fs.promises.writeFile(jsonPath, jsonStr, 'utf-8')
              return { format: 'lottie', data: lottieData }
            } catch (decompErr) {
              Logger.warn(`[AccountManager] Failed to gunzip TGS emoji ${documentId}:`, decompErr)
            }
          }

          if (isVideo) {
            const videoPath = path.join(this.mediaDir, `emoji_${documentId}.mp4`)
            await fs.promises.writeFile(videoPath, rawBuf)
            const streamUrl = `guidegram-media://local/${encodeURIComponent(videoPath)}`
            return { format: 'video', url: streamUrl }
          }

          await fs.promises.writeFile(diskPath, rawBuf)
          const streamUrl = `guidegram-media://local/${encodeURIComponent(diskPath)}`
          this.customEmojiCache.set(documentId, streamUrl)
          return { format: 'image', url: streamUrl }
        }
      }
    } catch (err) {
      Logger.warn(`[AccountManager] Failed to fetch custom emoji ${documentId}:`, err)
    }

    return null
  }

  /**
   * Resolve @username or peer identifier and build DialogItem
   */
  public async resolvePeer(accountId: string, target: string): Promise<DialogItem> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is still connecting or disconnected.`)
    const clean = target.replace(/^@/, '').trim()
    const entity: any = await holder.client.getEntity(clean)
    const id = entity.id.toString()
    const title =
      entity.title ||
      [entity.firstName, entity.lastName].filter(Boolean).join(' ') ||
      entity.username ||
      'Conversation'
    const initials = title.slice(0, 2).toUpperCase()
    const isChannel = entity.className === 'Channel' || entity.broadcast === true
    const isGroup =
      entity.className === 'Chat' ||
      (entity.className === 'Channel' && entity.megagroup === true)
    const isUser = entity.className === 'User'
    const isBot = isUser && entity.bot === true
    const avatarUrl = await this.getProfilePhoto(accountId, id)

    const dialogItem: DialogItem = {
      id,
      accountId,
      title,
      avatarInitials: initials,
      avatarUrl: avatarUrl || undefined,
      isChannel,
      isGroup,
      isUser,
      isBot,
      unreadCount: 0,
      isPinned: false,
      folderId: 0,
    }

    return dialogItem
  }

  /**
   * Search global public peers (channels, groups, bots, users) across Telegram
   */
  public async searchPublicPeers(accountId: string, query: string): Promise<DialogItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client || !query.trim()) return []

    try {
      const res: any = await holder.client.invoke(
        new Api.contacts.Search({
          q: query.trim(),
          limit: 25,
        })
      )

      const results: DialogItem[] = []
      const entities = [...(res.chats || []), ...(res.users || [])]
      for (const ent of entities) {
        const id = ent.id?.toString()
        if (!id) continue
        const title = ent.title || (ent.firstName ? `${ent.firstName} ${ent.lastName || ''}`.trim() : ent.username || 'Chat')
        const isChannel = ent.className === 'Channel' && !ent.megagroup
        const isGroup = ent.className === 'Chat' || (ent.className === 'Channel' && !!ent.megagroup)
        const isUser = ent.className === 'User'
        const isBot = isUser && !!ent.bot

        results.push({
          id,
          accountId,
          title,
          unreadCount: 0,
          unreadMentionsCount: 0,
          unreadSendersCount: 0,
          isMuted: false,
          isUser,
          isGroup,
          isChannel,
          isBot,
          isPinned: false,
          lastMessageDate: Date.now(),
          avatarInitials: title.substring(0, 2).toUpperCase(),
          avatarUrl: undefined,
          username: ent.username || undefined,
          isPremium: ent.premium === true,
        })
      }
      return results
    } catch (err: any) {
      Logger.warn(`[AccountManager] searchPublicPeers error:`, err?.message)
      return []
    }
  }

  /**
   * Search global messages across Telegram with query, hashtag, or filter
   */
  public async searchGlobal(accountId: string, query: string, filterType = 'all', limit = 40): Promise<MessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client || !query.trim()) return []

    try {
      let filter: any = new Api.InputMessagesFilterEmpty()
      if (filterType === 'photos') filter = new Api.InputMessagesFilterPhotos()
      else if (filterType === 'videos') filter = new Api.InputMessagesFilterVideo()
      else if (filterType === 'documents') filter = new Api.InputMessagesFilterDocument()
      else if (filterType === 'audio') filter = new Api.InputMessagesFilterMusic()
      else if (filterType === 'voice') filter = new Api.InputMessagesFilterVoice()
      else if (filterType === 'urls') filter = new Api.InputMessagesFilterUrl()

      const res: any = await holder.client.invoke(
        new Api.messages.SearchGlobal({
          q: query.trim(),
          filter,
          minDate: 0,
          maxDate: 0,
          offsetRate: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          offsetId: 0,
          limit,
        })
      )

      const usersMap = new Map<string, any>()
      const chatsMap = new Map<string, any>()
      for (const u of (res.users || [])) usersMap.set(u.id?.toString(), u)
      for (const c of (res.chats || [])) chatsMap.set(c.id?.toString(), c)

      const results: MessageItem[] = []
      for (const m of (res.messages || [])) {
        if (!m || m.className === 'MessageEmpty') continue
        const peer = m.peerId
        let cId = ''
        let chatTitle = ''
        if (peer) {
          if (peer.channelId) {
            cId = peer.channelId.toString()
            const c = chatsMap.get(cId)
            if (c) chatTitle = c.title || ''
          } else if (peer.chatId) {
            cId = peer.chatId.toString()
            const c = chatsMap.get(cId)
            if (c) chatTitle = c.title || ''
          } else if (peer.userId) {
            cId = peer.userId.toString()
            const u = usersMap.get(cId)
            if (u) chatTitle = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || ''
          }
        }

        const senderId = m.fromId ? (m.fromId.userId || m.fromId.channelId || '').toString() : undefined
        let senderName = chatTitle || 'User'
        if (senderId && usersMap.has(senderId)) {
          const u = usersMap.get(senderId)
          senderName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || senderName
        }

        const entities = this.parseEntities(m.entities)
        results.push({
          id: m.id,
          chatId: cId || m.id.toString(),
          accountId,
          senderId,
          senderName,
          text: m.message || '',
          date: m.date ? m.date * 1000 : Date.now(),
          isOutgoing: m.out || false,
          entities,
          postAuthor: (m as any).postAuthor || undefined,
        })
      }
      return results
    } catch (err: any) {
      Logger.warn(`[AccountManager] searchGlobal error:`, err?.message)
      return []
    }
  }

  /**
   * Fetch historical messages for statistics analysis
   */
  public async getHistoricalMessages(
    accountId: string,
    chatId: string,
    limit = 300,
    offsetDate?: number
  ): Promise<MessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) return []

    try {
      const messages = await holder.client.getMessages(chatId, {
        limit,
        offsetDate: offsetDate ? Math.floor(offsetDate / 1000) : undefined,
      })

      return messages.map((m: any) => {
        const entities = this.parseEntities(m.entities)
        return {
          id: m.id,
          chatId,
          accountId,
          senderId: m.senderId?.toString(),
          senderName: formatEntityName(m.sender, 'Unknown'),
          text: m.message || '',
          date: m.date * 1000,
          isOutgoing: m.out || false,
          entities,
          mediaType: this.detectMediaType(m.media),
        }
      })
    } catch (err: any) {
      Logger.warn(`[AccountManager] getHistoricalMessages error:`, err?.message)
      return []
    }
  }

  /**
   * Get rich channel, group, or user details for header info drawer
   */
  public async getChatDetails(accountId: string, chatId: string): Promise<ChatDetails> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) {
      return {
        id: chatId,
        title: 'Conversation',
        isChannel: false,
        isGroup: false,
        isUser: false,
        isBot: false,
      }
    }

    const fallback: ChatDetails = {
      id: chatId,
      title: 'Conversation',
      isChannel: false,
      isGroup: false,
      isUser: false,
      isBot: false,
    }

    try {
      const entity: any = await holder.client.getEntity(chatId)
      const isChannel = entity.className === 'Channel' || entity.broadcast === true
      const isGroup =
        entity.className === 'Chat' ||
        (entity.className === 'Channel' && entity.megagroup === true)
      const isUser = entity.className === 'User'
      const isBot = isUser && entity.bot === true

      let about: string | undefined = undefined
      let membersCount: number | undefined = undefined
      const verified = entity.verified || false
      const fake = entity.fake || false
      const scam = entity.scam || false
      const username = entity.username || undefined

      let pinnedMessage: PinnedMessageItem | undefined = undefined
      const pinnedMessagesList: PinnedMessageItem[] = []
      let canSendMessages = true
      const isCreator = entity.creator === true
      let canDeleteMessages = isCreator

      if (entity.adminRights) {
        canDeleteMessages = entity.adminRights.deleteMessages === true
      }

      let full: any = null
      const participantsList: NonNullable<ChatDetails['participants']> = []

      if (entity.className === 'Channel') {
        try {
          full = await holder.client.invoke(
            new Api.channels.GetFullChannel({ channel: entity })
          )
          about = full.fullChat?.about
          membersCount = full.fullChat?.participantsCount

          // Pinned messages list & primary pinned message (TDesktop v6.7.8)
          try {
            const pinnedMsgs: any = await holder.client.getMessages(entity, {
              filter: new Api.InputMessagesFilterPinned(),
              limit: 25,
            })
            if (pinnedMsgs && pinnedMsgs.length > 0) {
              for (const pm of pinnedMsgs) {
                pinnedMessagesList.push({
                  id: pm.id,
                  text: pm.message || (pm.media ? '[Media]' : undefined),
                  date: pm.date ? pm.date * 1000 : undefined,
                })
              }
            }
          } catch (_) {}

          if (pinnedMessagesList.length > 0) {
            pinnedMessage = pinnedMessagesList[0]
          } else if (full.fullChat?.pinnedMsgId) {
            pinnedMessage = {
              id: full.fullChat.pinnedMsgId,
            }
            pinnedMessagesList.push(pinnedMessage)
          }

          // Check broadcast posting permissions
          if (isChannel && !isGroup) {
            const adminRights = entity.adminRights
            const canPost = isCreator || (adminRights && adminRights.postMessages)
            canSendMessages = !!canPost
          } else if (entity.defaultBannedRights) {
            if (entity.defaultBannedRights.sendMessages) {
              canSendMessages = false
            }
          }

          // Fetch Admins / Participants for Channel / Megagroup
          try {
            const adminsResult: any = await holder.client.invoke(
              new Api.channels.GetParticipants({
                channel: entity,
                filter: new Api.ChannelParticipantsAdmins(),
                offset: 0,
                limit: 100,
                hash: BigInt(0) as any,
              })
            )

            const userMap = new Map<string, any>()
            if (adminsResult.users) {
              for (const u of adminsResult.users) {
                userMap.set(u.id.toString(), u)
              }
            }

            const seenParticipantIds = new Set<string>()

            if (adminsResult.participants) {
              for (const p of adminsResult.participants) {
                const pUserId = p.userId?.toString()
                if (!pUserId) continue
                seenParticipantIds.add(pUserId)
                const u = userMap.get(pUserId)
                const role = p.className === 'ChannelParticipantCreator' ? 'creator' : 'admin'
                participantsList.push({
                  id: pUserId,
                  name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Admin' : 'Admin',
                  username: u?.username || undefined,
                  role,
                  customTitle: p.rank || undefined,
                })
              }
            }

            // If megagroup, fetch recent members too (up to 100)
            if (isGroup) {
              try {
                const recentResult: any = await holder.client.invoke(
                  new Api.channels.GetParticipants({
                    channel: entity,
                    filter: new Api.ChannelParticipantsRecent(),
                    offset: 0,
                    limit: 100,
                    hash: BigInt(0) as any,
                  })
                )
                if (recentResult.users) {
                  for (const u of recentResult.users) {
                    userMap.set(u.id.toString(), u)
                  }
                }
                if (recentResult.participants) {
                  for (const p of recentResult.participants) {
                    const pUserId = p.userId?.toString()
                    if (!pUserId || seenParticipantIds.has(pUserId)) continue
                    seenParticipantIds.add(pUserId)
                    const u = userMap.get(pUserId)
                    participantsList.push({
                      id: pUserId,
                      name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Member' : 'Member',
                      username: u?.username || undefined,
                      role: 'member',
                    })
                  }
                }
              } catch (recErr) {
                Logger.debug(`[AccountManager] GetParticipants Recent failed:`, recErr)
              }
            }
          } catch (partErr) {
            Logger.debug(`[AccountManager] GetParticipants failed (may lack admin rights):`, partErr)
          }
        } catch (e) {
          Logger.warn(`[AccountManager] GetFullChannel warning for ${chatId}:`, e)
        }
      } else if (entity.className === 'Chat') {
        // Basic Group
        try {
          full = await holder.client.invoke(
            new Api.messages.GetFullChat({ chatId: entity.id })
          )
          about = full.fullChat?.about
          membersCount = full.fullChat?.participants?.participants?.length || full.fullChat?.participantsCount

          if (full.fullChat?.pinnedMsgId) {
            pinnedMessage = {
              id: full.fullChat.pinnedMsgId,
            }
          }

          if (entity.defaultBannedRights && entity.defaultBannedRights.sendMessages) {
            canSendMessages = false
          }

          // Extract basic group participants
          if (full.fullChat?.participants?.participants) {
            const userMap = new Map<string, any>()
            if (full.users) {
              for (const u of full.users) {
                userMap.set(u.id.toString(), u)
              }
            }
            for (const p of full.fullChat.participants.participants) {
              const pUserId = p.userId?.toString()
              if (!pUserId) continue
              const u = userMap.get(pUserId)
              let role: 'creator' | 'admin' | 'member' = 'member'
              if (p.className === 'ChatParticipantCreator') role = 'creator'
              else if (p.className === 'ChatParticipantAdmin') role = 'admin'

              participantsList.push({
                id: pUserId,
                name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Member' : 'Member',
                username: u?.username || undefined,
                role,
              })
            }
          }
        } catch (e) {
          Logger.warn(`[AccountManager] GetFullChat warning for basic chat ${chatId}:`, e)
        }
      } else if (isUser) {
        try {
          full = await holder.client.invoke(
            new Api.users.GetFullUser({ id: entity })
          )
          about = full.fullUser?.about
          if (full.fullUser?.pinnedMsgId) {
            pinnedMessage = {
              id: full.fullUser.pinnedMsgId,
            }
          }
        } catch (e) {
          Logger.warn(`[AccountManager] GetFullUser warning for ${chatId}:`, e)
        }
      }

      // Permissions matrix
      let permissionsMatrix: ChatDetails['permissionsMatrix'] = undefined
      const bannedRights = entity.defaultBannedRights || full?.fullChat?.defaultBannedRights
      if (isGroup || isChannel) {
        if (bannedRights) {
          permissionsMatrix = {
            sendMessages: !bannedRights.sendMessages,
            sendMedia: !bannedRights.sendMedia,
            sendStickers: !bannedRights.sendStickers,
            sendPolls: !bannedRights.sendPolls,
            embedLinks: !bannedRights.embedLinks,
            inviteUsers: !bannedRights.inviteUsers,
            pinMessages: !bannedRights.pinMessages,
            changeInfo: !bannedRights.changeInfo,
          }
        } else if (isGroup) {
          permissionsMatrix = {
            sendMessages: true,
            sendMedia: true,
            sendStickers: true,
            sendPolls: true,
            embedLinks: true,
            inviteUsers: true,
            pinMessages: true,
            changeInfo: true,
          }
        }
      }

      // Bot Info
      let botInfo: ChatDetails['botInfo'] = undefined
      if (isBot) {
        const commands: Array<{ command: string; description: string }> = []
        if (full?.fullUser?.botInfo?.commands) {
          for (const cmd of full.fullUser.botInfo.commands) {
            commands.push({ command: cmd.command, description: cmd.description })
          }
        }
        let menuButton: { text?: string; url?: string } | undefined = undefined
        if (full?.fullUser?.botInfo?.menuButton) {
          const mb = full.fullUser.botInfo.menuButton
          menuButton = {
            text: mb.text || undefined,
            url: mb.url || undefined,
          }
        }
        botInfo = {
          isBot: true,
          privacyMode: !entity.botChatHistory,
          commands,
          menuButton,
        }
      }

      let customEmojiStatusId: string | undefined = entity.emojiStatus?.documentId
        ? entity.emojiStatus.documentId.toString()
        : undefined
      let personalChannelId: string | undefined = undefined
      let personalChannelTitle: string | undefined = undefined
      let stargiftsCount: number | undefined = undefined
      let birthday: string | undefined = undefined

      if (isUser && full?.fullUser) {
        const fu = full.fullUser
        if (fu.stargiftsCount != null) {
          stargiftsCount = Number(fu.stargiftsCount)
        }
        if (fu.birthday) {
          const b = fu.birthday
          birthday = b.year ? `${b.day}/${b.month}/${b.year}` : `${b.day}/${b.month}`
        }
        if (fu.personalChannelId) {
          personalChannelId = fu.personalChannelId.toString()
          if (full.chats && Array.isArray(full.chats)) {
            const ch = full.chats.find((c: any) => c.id?.toString() === personalChannelId)
            if (ch) personalChannelTitle = ch.title
          }
        }
      }

      const avatarUrl = await this.getProfilePhoto(accountId, chatId)

      // Notify settings & mute status
      const notifySettings = full?.fullChat?.notifySettings || full?.fullUser?.notifySettings || (entity as any)?.notifySettings
      let isMuted = false
      const nowSec = Math.floor(Date.now() / 1000)
      if (notifySettings) {
        if (notifySettings.silent === true) {
          isMuted = true
        } else if (notifySettings.muteUntil !== undefined && notifySettings.muteUntil !== null) {
          const muteVal = Number(notifySettings.muteUntil)
          if (muteVal > nowSec || muteVal === 2147483647) {
            isMuted = true
          }
        }
      }
      if (!isMuted && isChannel && !isGroup && (!notifySettings || notifySettings.muteUntil === undefined)) {
        isMuted = true
      }

      // Available reactions for this channel / chat
      let availableReactions: string[] | undefined = undefined
      let canReactWithStars = true
      const chatReactions = full?.fullChat?.availableReactions
      if (chatReactions) {
        if (chatReactions.className === 'ChatReactionsNone') {
          availableReactions = []
          canReactWithStars = false
        } else if (chatReactions.className === 'ChatReactionsSome' && Array.isArray(chatReactions.reactions)) {
          availableReactions = []
          for (const r of chatReactions.reactions) {
            if (r.emoticon) {
              availableReactions.push(r.emoticon)
            }
          }
        }
        if (chatReactions.allowCustom !== undefined) {
          canReactWithStars = true
        }
      }

      return {
        id: chatId,
        title: entity.title || formatEntityName(entity, 'Chat'),
        firstName: entity.firstName || undefined,
        lastName: entity.lastName || undefined,
        phone: entity.phone || undefined,
        username,
        about,
        membersCount,
        isChannel: isChannel && !isGroup,
        isBroadcast: isChannel && !isGroup,
        isGroup,
        isForum: entity.forum === true,
        isUser,
        isBot,
        isMuted,
        availableReactions,
        canReactWithStars,
        avatarUrl: avatarUrl || undefined,
        verified,
        fake,
        scam,
        pinnedMessage,
        pinnedMessages: pinnedMessagesList.length > 0 ? pinnedMessagesList : undefined,
        canSendMessages,
        canDeleteMessages,
        isCreator,
        permissionsMatrix,
        participants: participantsList.length > 0 ? participantsList : undefined,
        botInfo,
        customEmojiStatusId,
        personalChannelId,
        personalChannelTitle,
        stargiftsCount,
        birthday,
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] getChatDetails fallback for ${chatId}:`, err)
      return fallback
    }
  }

  /**
   * Mute or unmute chat notifications
   */
  public async toggleChatNotifications(
    accountId: string,
    chatId: string,
    mute: boolean
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const peer = await holder.client.getInputEntity(chatId)
      await holder.client.invoke(
        new Api.account.UpdateNotifySettings({
          peer: new Api.InputNotifyPeer({ peer }),
          settings: new Api.InputPeerNotifySettings({
            muteUntil: mute ? 2147483647 : 0,
          }),
        })
      )
      return true
    } catch (err: any) {
      Logger.warn(`[AccountManager] toggleChatNotifications error for ${chatId}:`, err)
      return false
    }
  }

  /**
   * Send a text message with optional replyToMsgId, silent, and scheduled options
   */
  public async sendMessage(
    accountId: string,
    chatId: string,
    text: string,
    replyToMsgId?: number,
    options?: SendMessageOptions
  ): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is not connected.`)

    const sendParams: any = { message: text }
    const actualReplyTo = options?.replyToMsgId ?? replyToMsgId
    if (actualReplyTo) {
      sendParams.replyTo = actualReplyTo
    }
    if (options?.silent) {
      sendParams.silent = true
    }
    if (options?.scheduleDate) {
      sendParams.schedule = Math.floor(options.scheduleDate / 1000)
    }

    const sent = await holder.client.sendMessage(chatId, sendParams)

    return {
      id: sent.id,
      chatId,
      accountId,
      text: sent.message,
      date: sent.date * 1000,
      isOutgoing: true,
      replyToMsgId: actualReplyTo,
      isSilent: options?.silent,
    }
  }

  /**
   * Send media (photo, video, document, audio, voice note) with upload progress notification
   */
  public async sendMedia(
    accountId: string,
    chatId: string,
    filePath: string,
    options?: SendMediaOptions
  ): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is not connected.`)

    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`)
    }

    const uploadId = options?.uploadId || filePath

    const throttler = new ProgressThrottler(
      (percent: number) => {
        this.onEventCallback?.('telegram:upload-progress', {
          accountId,
          chatId,
          uploadId,
          progress: percent,
          filePath,
        })
      },
      { minIntervalMs: 100, minDeltaPercent: 1 }
    )

    const sendParams: any = {
      file: filePath,
      caption: options?.caption || '',
      replyTo: options?.replyToMsgId,
      forceDocument: options?.forceDocument ?? false,
      silent: options?.silent ?? false,
      schedule: options?.scheduleDate ? Math.floor(options.scheduleDate / 1000) : undefined,
      workers: 4,
      progressCallback: (progress: number) => {
        const percent = Math.min(100, Math.max(0, Math.round(progress * 100)))
        throttler.update(percent)
      },
    }

    if (options?.isVoice) {
      sendParams.voiceNote = true
      sendParams.attributes = [
        new Api.DocumentAttributeAudio({
          voice: true,
          duration: options.duration ? Math.max(1, Math.round(options.duration)) : 0,
        }),
      ]
    }

    const sent = await holder.client.sendFile(chatId, sendParams)

    // Handle array if multiple messages were returned
    const msg: any = Array.isArray(sent) ? sent[0] : sent
    const mediaData = this.parseMedia(msg.media)
    const entities = this.parseEntities(msg.entities)
    const cacheKey = `${accountId}_${chatId}_${msg.id}`

    // Preserve sent voice note in persistent media directory before cleaning up temp
    let finalFilePath = filePath
    if (options?.isVoice && (filePath.includes('voice_') || filePath.includes('temp'))) {
      try {
        const destPath = path.join(this.mediaDir, `${cacheKey}.ogg`)
        await fs.promises.copyFile(filePath, destPath)
        await fs.promises.unlink(filePath).catch(() => {})
        finalFilePath = destPath
      } catch (_) {}
    }

    // Cache local media URL so the chat renders instantly without redownloading
    const localStreamUrl = `guidegram-media://local/${encodeURIComponent(finalFilePath)}`
    this.mediaCache.set(cacheKey, localStreamUrl)
    this.mediaCache.set(`${cacheKey}_thumb`, localStreamUrl)

    let mediaFileSize: number | undefined = mediaData.mediaFileSize
    if (!mediaFileSize && fs.existsSync(finalFilePath)) {
      try {
        mediaFileSize = fs.statSync(finalFilePath).size
      } catch (_) {}
    }

    return {
      id: msg.id,
      chatId,
      accountId,
      senderId: msg.senderId?.toString() || holder.info.id,
      senderName: [holder.info.firstName, holder.info.lastName].filter(Boolean).join(' ') || 'Me',
      text: msg.message || '',
      date: (msg.date || Math.floor(Date.now() / 1000)) * 1000,
      isOutgoing: true,
      replyToMsgId: options?.replyToMsgId,
      mediaType: mediaData.mediaType || (options?.isVoice ? 'voice' : undefined),
      isVoice: mediaData.isVoice || options?.isVoice,
      isSticker: mediaData.isSticker,
      isRoundVideo: mediaData.isRoundVideo,
      voiceWaveform: mediaData.voiceWaveform,
      mediaFileName: mediaData.mediaFileName || path.basename(finalFilePath),
      mediaFileSize,
      mediaDuration: mediaData.mediaDuration || options?.duration,
      mediaWidth: mediaData.mediaWidth,
      mediaHeight: mediaData.mediaHeight,
      mediaMimeType: mediaData.mediaMimeType,
      mediaFilePath: finalFilePath,
      mediaUrl: localStreamUrl,
      entities,
    }
  }

  /**
   * Telegraph-like Direct Forwarding & Multi-chat support:
   * dropAuthor: true removes the "Forwarded From" header!
   * Supports forwarding to Saved Messages ('me' or accountId)
   * Supports multiple destination chats simultaneously.
   */
  public async forwardMessages(
    accountId: string,
    toChatIds: string | string[],
    fromChatId: string,
    messageIds: number[],
    options: ForwardOptions
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is not connected.`)

    const targets = Array.isArray(toChatIds) ? toChatIds : [toChatIds]
    if (targets.length === 0) return true

    const sourcePeer = (fromChatId === 'me' || fromChatId === accountId) ? 'me' : fromChatId

    const forwardPromises = targets.map(async (chatId) => {
      const targetPeer = (chatId === 'me' || chatId === accountId) ? 'me' : chatId
      return holder.client!.forwardMessages(targetPeer, {
        messages: messageIds,
        fromPeer: sourcePeer,
        dropAuthor: options.withoutQuote ?? true, // Removes "Forwarded from" header
        silent: options.silent ?? false,
      })
    })

    const results = await Promise.allSettled(forwardPromises)
    const errors = results.filter((r) => r.status === 'rejected')
    if (errors.length > 0 && errors.length === targets.length) {
      throw (errors[0] as PromiseRejectedResult).reason
    }

    return true
  }

  /**
   * Delete messages (Supports 64Gram alwaysDeleteBoth / revoke for both users)
   */
  public async deleteMessages(
    accountId: string,
    chatId: string,
    messageIds: number[],
    revoke = true
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is not connected.`)

    await holder.client.deleteMessages(chatId, messageIds, { revoke })
    return true
  }

  /**
   * Mark all chats as read for the account (64Gram Mark All Read feature)
   * Passes message object / maxId to properly advance channel read pointer
   */
  public async markAllAsRead(accountId: string): Promise<{ success: boolean; count: number }> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is not connected.`)

    const config = this.store.getConfig()
    if (config.ghostMode) return { success: true, count: 0 } // Ghost Mode blocks read receipts

    const dialogs = await holder.client.getDialogs({ limit: 200 })
    let count = 0
    for (const d of dialogs) {
      if ((d as any).unreadCount > 0 && d.id != null) {
        try {
          const peer = (d as any).inputEntity || d.id
          await holder.client.markAsRead(peer, (d as any).message)
          count++
        } catch (err) {
          Logger.warn(`[AccountManager] Failed to mark ${d.id} as read:`, err)
        }
      }
    }
    return { success: true, count }
  }

  /**
   * Mark messages as read (Respects Ghost Mode)
   */
  public async markAsRead(accountId: string, chatId: string): Promise<void> {
    const config = this.store.getConfig()
    if (config.ghostMode) {
      // In Ghost Mode, do not send read receipts to server!
      return
    }

    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) return

    try {
      await holder.client.markAsRead(chatId)
    } catch (err) {
      console.warn('[AccountManager] markAsRead warning:', err)
    }
  }

  /**
   * Event listener for incoming messages
   */
  private setupEventListeners(accountId: string, client: TelegramClient): void {
    client.addEventHandler(async (event: any) => {
      const msg = event.message
      if (!msg) return

      let replyMarkup: { rows: InlineButton[][] } | undefined = undefined
      if (msg.replyMarkup && (msg.replyMarkup as any).rows) {
        const cId = msg.chatId?.toString() || ''
        replyMarkup = {
          rows: (msg.replyMarkup as any).rows.map((row: any, rIdx: number) =>
            (row.buttons || []).map((btn: any, bIdx: number) => {
              let callbackData: string | undefined = undefined
              if (btn.data) {
                try {
                  const rawBuf = Buffer.isBuffer(btn.data) ? btn.data : Buffer.from(btn.data)
                  callbackData = rawBuf.toString('base64')
                  this.botButtonCache.set(`${cId}_${msg.id}_${rIdx}_${bIdx}`, rawBuf)
                  this.botButtonCache.set(`${cId}_${msg.id}_${callbackData}`, rawBuf)
                } catch (_) {
                  callbackData = String(btn.data)
                }
              }
              return {
                text: btn.text || '',
                url: btn.url,
                data: callbackData,
              }
            })
          ),
        }
      }

      const mediaData = this.parseMedia(msg.media)
      const entities = this.parseEntities(msg.entities)
      const replyToMsgId = msg.replyTo?.replyToMsgId
      const replyTo: ReplyInfo | undefined = replyToMsgId ? { replyToMsgId } : undefined

      const senderUser = msg.sender
      let senderEmojiStatusId: string | undefined = undefined
      if (senderUser?.emojiStatus?.documentId) {
        senderEmojiStatusId = senderUser.emojiStatus.documentId.toString()
      }
      const senderColor = senderUser?.color?.color !== undefined
        ? senderUser.color.color
        : (msg.senderId ? Math.abs(Number(msg.senderId)) % 7 : undefined)
      const senderIsPremium = senderUser?.premium === true

      const payload = {
        accountId,
        chatId: msg.chatId?.toString(),
        message: {
          id: msg.id,
          chatId: msg.chatId?.toString(),
          accountId,
          senderId: msg.senderId?.toString(),
          senderName: formatEntityName(msg.sender, 'Unknown'),
          senderEmojiStatusId,
          senderColor,
          senderIsPremium,
          postAuthor: (msg as any).postAuthor || undefined,
          senderRank: (msg as any).postAuthor || undefined,
          text: msg.message || '',
          date: msg.date * 1000,
          isOutgoing: msg.out || false,
          replyToMsgId,
          replyTo,
          mediaType: mediaData.mediaType,
          isSticker: mediaData.isSticker,
          isVoice: mediaData.isVoice,
          isRoundVideo: mediaData.isRoundVideo,
          voiceWaveform: mediaData.voiceWaveform,
          mediaFileName: mediaData.mediaFileName,
          mediaFileSize: mediaData.mediaFileSize,
          mediaDuration: mediaData.mediaDuration,
          mediaWidth: mediaData.mediaWidth,
          mediaHeight: mediaData.mediaHeight,
          mediaMimeType: mediaData.mediaMimeType,
          webPage: mediaData.webPage,
          entities,
          replyMarkup,
        },
      }

      this.onEventCallback?.('telegram:new-message', payload)
    }, new NewMessage({}))
  }

  /**
   * Extract rich media metadata from GramJS Message.media
   */
  private parseMedia(media: any): {
    mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'webpage'
    isSticker?: boolean
    isVoice?: boolean
    isRoundVideo?: boolean
    voiceWaveform?: number[]
    mediaFileName?: string
    mediaFileSize?: number
    mediaDuration?: number
    mediaWidth?: number
    mediaHeight?: number
    mediaMimeType?: string
    webPage?: WebPagePreview
  } {
    if (!media) return {}
    if (media.photo || media.className === 'MessageMediaPhoto') {
      const photo: any = media.photo
      let mediaWidth: number | undefined
      let mediaHeight: number | undefined
      let mediaFileSize: number | undefined
      if (photo && Array.isArray(photo.sizes)) {
        for (let i = photo.sizes.length - 1; i >= 0; i--) {
          const s = photo.sizes[i]
          if (s) {
            if (!mediaWidth && s.w) mediaWidth = s.w
            if (!mediaHeight && s.h) mediaHeight = s.h
            if (!mediaFileSize) {
              if (typeof s.size === 'number') mediaFileSize = s.size
              else if (Array.isArray(s.sizes) && s.sizes.length > 0) mediaFileSize = s.sizes[s.sizes.length - 1]
              else if (s.size) mediaFileSize = Number(s.size) || undefined
            }
          }
        }
      }
      return { mediaType: 'photo', mediaWidth, mediaHeight, mediaFileSize }
    }

    if (media.document || media.className === 'MessageMediaDocument') {
      const doc: any = media.document
      if (doc) {
        let mediaType: 'video' | 'document' | 'voice' | 'sticker' = 'document'
        let mediaDuration: number | undefined
        let mediaWidth: number | undefined
        let mediaHeight: number | undefined
        let mediaFileName: string | undefined

        const mime = doc.mimeType || ''
        if (mime.startsWith('video/')) mediaType = 'video'
        else if (mime.startsWith('audio/') || mime.includes('ogg')) mediaType = 'voice'
        else if (mime.includes('webp')) mediaType = 'sticker'

        let isVoice = false
        let isSticker = false
        let isRoundVideo = false
        let voiceWaveform: number[] | undefined

        if (Array.isArray(doc.attributes)) {
          for (const attr of doc.attributes) {
            const aName = attr.className || attr.constructor?.name || ''
            if (aName === 'DocumentAttributeVideo') {
              mediaType = 'video'
              mediaDuration = attr.duration
              mediaWidth = attr.w
              mediaHeight = attr.h
              if (attr.roundMessage) isRoundVideo = true
            } else if (aName === 'DocumentAttributeAudio') {
              if (attr.voice) {
                mediaType = 'voice'
                isVoice = true
              }
              mediaDuration = attr.duration
              if (attr.waveform) {
                try {
                  voiceWaveform = Array.from(Buffer.isBuffer(attr.waveform) ? attr.waveform : Buffer.from(attr.waveform))
                } catch (_) {}
              }
            } else if (aName === 'DocumentAttributeFilename') {
              mediaFileName = attr.fileName
            } else if (aName === 'DocumentAttributeSticker') {
              mediaType = 'sticker'
              isSticker = true
            }
          }
        }

        let mediaFileSize = 0
        if (doc.size !== undefined && doc.size !== null) {
          if (typeof doc.size === 'number') {
            mediaFileSize = doc.size
          } else if (typeof doc.size === 'bigint') {
            mediaFileSize = Number(doc.size)
          } else if (typeof (doc.size as any).toJSNumber === 'function') {
            mediaFileSize = (doc.size as any).toJSNumber()
          } else {
            mediaFileSize = parseInt(String(doc.size), 10) || Number(doc.size) || 0
          }
        }
        return {
          mediaType,
          isSticker,
          isVoice,
          isRoundVideo,
          voiceWaveform,
          mediaFileName,
          mediaFileSize,
          mediaDuration,
          mediaWidth,
          mediaHeight,
          mediaMimeType: mime,
        }
      }
    }

    if (media.webpage || media.className === 'MessageMediaWebPage') {
      const wp = media.webpage
      if (wp && (wp.className === 'WebPage' || wp.url)) {
        return {
          mediaType: 'webpage',
          webPage: {
            url: wp.url || '',
            siteName: wp.siteName,
            title: wp.title,
            description: wp.description,
          },
        }
      }
    }

    return {}
  }

  /**
   * Parse GramJS entities into frontend MessageEntityItem
   */
  private parseEntities(rawEntities: any): MessageEntityItem[] | undefined {
    if (!Array.isArray(rawEntities) || rawEntities.length === 0) return undefined
    return rawEntities.map((ent: any) => {
      let type = 'unknown'
      const cName = ent.className || ent.constructor?.name || ent._ || ''
      if (cName === 'MessageEntityBold') type = 'bold'
      else if (cName === 'MessageEntityItalic') type = 'italic'
      else if (cName === 'MessageEntityCode') type = 'code'
      else if (cName === 'MessageEntityPre') type = 'pre'
      else if (cName === 'MessageEntityTextUrl') type = 'text_url'
      else if (cName === 'MessageEntityUrl') type = 'url'
      else if (cName === 'MessageEntityMention') type = 'mention'
      else if (cName === 'MessageEntityMentionName') type = 'mention_name'
      else if (cName === 'MessageEntityHashtag') type = 'hashtag'
      else if (cName === 'MessageEntityCashtag') type = 'cashtag'
      else if (cName === 'MessageEntityBotCommand') type = 'bot_command'
      else if (cName === 'MessageEntityStrike') type = 'strike'
      else if (cName === 'MessageEntityUnderline') type = 'underline'
      else if (cName === 'MessageEntitySpoiler') type = 'spoiler'
      else if (cName === 'MessageEntityBlockquote') type = 'blockquote'
      else if (cName === 'MessageEntityBankCard') type = 'bank_card'
      else if (cName === 'MessageEntityPhone') type = 'phone'
      else if (cName === 'MessageEntityEmail') type = 'email'
      else if (cName === 'MessageEntityCustomEmoji') type = 'custom_emoji'

      return {
        type,
        offset: ent.offset,
        length: ent.length,
        url: ent.url,
        language: ent.language,
        documentId: ent.documentId ? ent.documentId.toString() : undefined,
      }
    })
  }

  private detectMediaType(media: any): 'photo' | 'video' | 'document' | 'voice' | 'sticker' | undefined {
    if (media.photo) return 'photo'
    if (media.document) {
      const mime = media.document.mimeType || ''
      if (mime.includes('video')) return 'video'
      if (mime.includes('audio') || mime.includes('ogg')) return 'voice'
      if (mime.includes('webp')) return 'sticker'
      return 'document'
    }
    return undefined
  }

  /**
   * Fetch forum topics for a supergroup
   */
  public async getForumTopics(accountId: string, chatId: string): Promise<ForumTopicItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Client not connected')
    try {
      const entity = await holder.client.getEntity(chatId)
      const res: any = await holder.client.invoke(
        new Api.channels.GetForumTopics({
          channel: entity,
          limit: 100,
          offsetDate: 0,
          offsetId: 0,
          offsetTopic: 0,
        })
      )
      if (!res || !Array.isArray(res.topics)) return []
      return res.topics.map((t: any) => ({
        id: t.id,
        title: t.title || 'General Topic',
        iconColor: t.iconColor,
        iconEmojiId: t.iconEmojiId ? t.iconEmojiId.toString() : undefined,
        topMessageId: t.topMessage,
        readInboxMaxId: t.readInboxMaxId,
        unreadCount: t.unreadCount || 0,
        isClosed: t.closed || false,
        isHidden: t.hidden || false,
        isPinned: t.pinned || false,
        date: t.date ? t.date * 1000 : Date.now(),
      }))
    } catch (err) {
      Logger.error(`[AccountManager] Failed to get forum topics for ${chatId}:`, err)
      return []
    }
  }

  /**
   * Fetch scheduled messages in a chat
   */
  public async getScheduledMessages(accountId: string, chatId: string): Promise<ScheduledMessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Client not connected')
    try {
      const entity = await holder.client.getEntity(chatId)
      const res: any = await holder.client.invoke(
        new Api.messages.GetScheduledHistory({
          peer: entity,
          hash: helpers.returnBigInt(0),
        })
      )
      if (!res || !Array.isArray(res.messages)) return []
      return res.messages.map((m: any) => ({
        id: m.id,
        text: m.message,
        date: m.date ? m.date * 1000 : Date.now(),
        scheduledDate: m.date ? m.date * 1000 : Date.now(),
        isOutgoing: m.out || false,
        mediaType: m.media ? this.detectMediaType(m.media) : undefined,
        replyToMsgId: m.replyTo?.replyToMsgId,
      }))
    } catch (err) {
      Logger.error(`[AccountManager] Failed to get scheduled messages for ${chatId}:`, err)
      return []
    }
  }

  /**
   * Send a scheduled message immediately
   */
  public async sendScheduledMessageNow(accountId: string, chatId: string, messageId: number): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Client not connected')
    try {
      const entity = await holder.client.getEntity(chatId)
      await holder.client.invoke(
        new Api.messages.SendScheduledMessages({
          peer: entity,
          id: [messageId],
        })
      )
      return true
    } catch (err) {
      Logger.error(`[AccountManager] Failed to send scheduled message ${messageId}:`, err)
      throw err
    }
  }

  /**
   * Delete scheduled messages
   */
  public async deleteScheduledMessages(accountId: string, chatId: string, messageIds: number[]): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Client not connected')
    try {
      const entity = await holder.client.getEntity(chatId)
      await holder.client.invoke(
        new Api.messages.DeleteScheduledMessages({
          peer: entity,
          id: messageIds,
        })
      )
      return true
    } catch (err) {
      Logger.error(`[AccountManager] Failed to delete scheduled messages:`, err)
      throw err
    }
  }

  /**
   * Send reaction to a message
   */
  public async sendReaction(accountId: string, chatId: string, messageId: number, reactionEmoji: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Client not connected')
    try {
      const entity = await holder.client.getEntity(chatId)
      await holder.client.invoke(
        new Api.messages.SendReaction({
          peer: entity,
          msgId: messageId,
          reaction: reactionEmoji ? [new Api.ReactionEmoji({ emoticon: reactionEmoji })] : [],
        })
      )
      return true
    } catch (err) {
      Logger.error(`[AccountManager] Failed to send reaction:`, err)
      throw err
    }
  }

  /**
   * Fetch Star Gifts received by user or peer
   */
  public async getSavedStarGifts(accountId: string, userId?: string): Promise<StarGiftItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Client not connected')
    try {
      const targetPeer = userId ? await holder.client.getEntity(userId) : new Api.InputUserSelf()
      const res: any = await holder.client.invoke(
        new Api.payments.GetSavedStarGifts({
          peer: targetPeer,
          offset: '',
          limit: 50,
        })
      )
      if (!res || !Array.isArray(res.gifts)) return []
      return res.gifts.map((g: any) => ({
        id: g.gift?.id ? g.gift.id.toString() : (g.id ? g.id.toString() : ''),
        stars: Number(g.gift?.stars || 0),
        convertStars: g.gift?.convertStars ? Number(g.gift.convertStars) : undefined,
        fromId: g.fromId ? (g.fromId.userId || g.fromId.channelId || '').toString() : undefined,
        fromName: g.name,
        message: g.message?.text,
        date: g.date ? g.date * 1000 : Date.now(),
        isAnonymous: g.anonymous || false,
        isNameHidden: g.nameHidden || false,
        isSaved: g.saved || false,
        canExportAt: g.canExportAt ? g.canExportAt * 1000 : undefined,
        transferStars: g.transferStars ? Number(g.transferStars) : undefined,
      }))
    } catch (err) {
      Logger.error(`[AccountManager] Failed to fetch Star Gifts:`, err)
      return []
    }
  }

  public async getActiveSessions(accountId: string): Promise<ActiveSessionItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    try {
      const res: any = await holder.client.invoke(new Api.account.GetAuthorizations())
      if (!res || !Array.isArray(res.authorizations)) return []
      return res.authorizations.map((a: any) => ({
        hash: a.hash ? a.hash.toString() : '0',
        deviceModel: a.deviceModel || 'Unknown Device',
        platform: a.platform || 'Unknown Platform',
        systemVersion: a.systemVersion || '',
        appName: a.appName || 'Telegram App',
        appVersion: a.appVersion || '',
        dateActive: a.dateActive ? a.dateActive * 1000 : Date.now(),
        dateCreated: a.dateCreated ? a.dateCreated * 1000 : Date.now(),
        ip: a.ip || '',
        country: a.country || '',
        region: a.region || '',
        isCurrent: Boolean(a.current || (a.flags && (a.flags & 1))),
        isOfficialApp: Boolean(a.officialApp || (a.flags && (a.flags & 2))),
        isPasswordPending: Boolean(a.passwordPending || (a.flags && (a.flags & 4))),
      }))
    } catch (err) {
      Logger.error(`[AccountManager] Failed to fetch active sessions:`, err)
      return []
    }
  }

  public async terminateSession(accountId: string, hash: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      if (hash === 'all' || hash === '0') {
        await holder.client.invoke(new Api.auth.ResetAuthorizations())
      } else {
        await holder.client.invoke(new Api.account.ResetAuthorization({ hash: BigInt(hash) as any }))
      }
      return true
    } catch (err) {
      Logger.error(`[AccountManager] Failed to terminate session:`, err)
      throw err
    }
  }

  public async translateMessage(
    accountId: string,
    chatId: string,
    messageId: number,
    toLang: string = 'fa'
  ): Promise<TranslatedTextResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Account client not active')
    try {
      const entity = await holder.client.getInputEntity(chatId)
      const res: any = await holder.client.invoke(
        new Api.messages.TranslateText({
          peer: entity,
          id: [messageId],
          toLang,
        })
      )
      const first = res?.result?.[0]
      const text = first?.text || ''
      return { text, toLang }
    } catch (err) {
      Logger.error(`[AccountManager] Failed to translate message:`, err)
      throw err
    }
  }

  public async getCloudFolders(accountId: string): Promise<CloudFolderItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    try {
      if (!holder.client.connected) {
        try {
          await holder.client.connect()
        } catch (_) {}
      }
      const res: any = await holder.client.invoke(new Api.messages.GetDialogFilters())
      const rawFilters: any[] = Array.isArray(res)
        ? res
        : (Array.isArray(res?.filters) ? res.filters : [])

      if (!rawFilters || rawFilters.length === 0) return []

      const extractPeerId = (p: any): string => {
        if (!p) return ''
        if (p.className === 'InputPeerSelf') return accountId
        if (p.userId !== undefined && p.userId !== null) return p.userId.toString()
        if (p.chatId !== undefined && p.chatId !== null) {
          const s = p.chatId.toString()
          return s.startsWith('-') ? s : `-${s}`
        }
        if (p.channelId !== undefined && p.channelId !== null) {
          const s = p.channelId.toString()
          if (s.startsWith('-100')) return s
          if (s.startsWith('-')) return `-100${s.slice(1)}`
          return `-100${s}`
        }
        if (p.id !== undefined && p.id !== null) return p.id.toString()
        return ''
      }

      return rawFilters
        .filter((f: any) => f && f.className !== 'DialogFilterDefault' && f.id !== 0)
        .map((f: any) => {
          const title = typeof f.title === 'string'
            ? f.title
            : (f.title?.text || (typeof f.title?.toString === 'function' ? f.title.toString() : ''))
          const includePeerIds = Array.isArray(f.includePeers)
            ? f.includePeers.map(extractPeerId).filter(Boolean)
            : []
          const excludePeerIds = Array.isArray(f.excludePeers)
            ? f.excludePeers.map(extractPeerId).filter(Boolean)
            : []
          const pinnedPeerIds = Array.isArray(f.pinnedPeers)
            ? f.pinnedPeers.map(extractPeerId).filter(Boolean)
            : []

          return {
            id: f.id,
            title: title || 'Folder',
            emoticon: f.emoticon,
            includePeerIds,
            excludePeerIds,
            pinnedPeerIds,
            contacts: f.contacts === true,
            nonContacts: f.nonContacts === true,
            groups: f.groups === true,
            broadcasts: f.broadcasts === true,
            bots: f.bots === true,
            excludeMuted: f.excludeMuted === true,
            excludeRead: f.excludeRead === true,
            excludeArchived: f.excludeArchived === true,
          }
        })
    } catch (err) {
      Logger.error(`[AccountManager] Failed to fetch cloud folders:`, err)
      return []
    }
  }

  public async getInstalledStickerSets(accountId: string): Promise<StickerSetItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    try {
      const res: any = await holder.client.invoke(
        new Api.messages.GetAllStickers({ hash: BigInt(0) as any })
      )
      if (!res || !Array.isArray(res.sets)) return []
      return res.sets.map((s: any) => ({
        id: s.id ? s.id.toString() : '',
        accessHash: s.accessHash ? s.accessHash.toString() : '',
        title: s.title || 'Stickers',
        shortName: s.shortName || '',
        count: Number(s.count || 0),
        stickers: [],
      }))
    } catch (err) {
      Logger.error(`[AccountManager] Failed to fetch sticker sets:`, err)
      return []
    }
  }

  public async getStickerSet(
    accountId: string,
    setId: string,
    accessHash: string
  ): Promise<StickerSetItem | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.invoke(
        new Api.messages.GetStickerSet({
          stickerset: new Api.InputStickerSetID({
            id: BigInt(setId) as any,
            accessHash: BigInt(accessHash) as any,
          }),
          hash: 0,
        })
      )
      if (!res || !res.set) return null
      const stickers: StickerItem[] = Array.isArray(res.documents)
        ? res.documents.map((doc: any) => {
            const stickerAttr = doc.attributes?.find(
              (a: any) => a.className === 'DocumentAttributeSticker'
            )
            const imgAttr = doc.attributes?.find(
              (a: any) => a.className === 'DocumentAttributeImageSize'
            )
            return {
              id: doc.id ? doc.id.toString() : '',
              accessHash: doc.accessHash ? doc.accessHash.toString() : '',
              fileReferenceHex: doc.fileReference ? doc.fileReference.toString('hex') : '',
              mimeType: doc.mimeType || 'image/webp',
              emoticon: stickerAttr?.alt || '⭐',
              isAnimated: doc.mimeType === 'application/x-tgsticker',
              isVideo: doc.mimeType === 'video/webm',
              width: imgAttr?.w,
              height: imgAttr?.h,
            }
          })
        : []

      return {
        id: res.set.id.toString(),
        accessHash: res.set.accessHash.toString(),
        title: res.set.title || 'Sticker Pack',
        shortName: res.set.shortName || '',
        count: Number(res.set.count || stickers.length),
        stickers,
      }
    } catch (err) {
      Logger.error(`[AccountManager] Failed to fetch stickerset details:`, err)
      return null
    }
  }

  public async sendSticker(
    accountId: string,
    chatId: string,
    documentId: string,
    accessHash: string,
    fileRef?: string,
    replyToMsgId?: number
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Client not connected')
    try {
      const entity = await holder.client.getInputEntity(chatId)
      const inputDoc = new Api.InputDocument({
        id: BigInt(documentId) as any,
        accessHash: BigInt(accessHash) as any,
        fileReference: fileRef ? Buffer.from(fileRef, 'hex') : Buffer.alloc(0),
      })
      await holder.client.sendFile(entity, {
        file: inputDoc as any,
        replyTo: replyToMsgId,
      })
      return true
    } catch (err) {
      Logger.error(`[AccountManager] Failed to send sticker:`, err)
      throw err
    }
  }

  public async getStickerData(
    accountId: string,
    documentId: string,
    accessHash: string,
    fileRef?: string
  ): Promise<{ format: 'lottie' | 'image' | 'video'; url?: string; data?: any } | null> {
    const lottiePath = path.join(this.mediaDir, `sticker_${documentId}.json`)
    if (fs.existsSync(lottiePath)) {
      try {
        const raw = await fs.promises.readFile(lottiePath, 'utf-8')
        return { format: 'lottie', data: JSON.parse(raw) }
      } catch (_) {}
    }

    const imgPath = path.join(this.mediaDir, `sticker_${documentId}.webp`)
    if (fs.existsSync(imgPath)) {
      return { format: 'image', url: `guidegram-media://local/${encodeURIComponent(imgPath)}` }
    }

    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      const buffer = await holder.client.downloadMedia(
        new Api.MessageMediaDocument({
          document: new Api.Document({
            id: BigInt(documentId) as any,
            accessHash: BigInt(accessHash) as any,
            fileReference: fileRef ? Buffer.from(fileRef, 'hex') : Buffer.alloc(0),
            date: 0,
            mimeType: 'image/webp',
            size: BigInt(0) as any,
            dcId: 0,
            attributes: [],
          }),
        }),
        {}
      )

      if (!buffer || !(buffer instanceof Buffer)) return null

      if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        try {
          const unzipped = zlib.gunzipSync(buffer)
          const json = JSON.parse(unzipped.toString('utf-8'))
          await fs.promises.writeFile(lottiePath, JSON.stringify(json), 'utf-8')
          return { format: 'lottie', data: json }
        } catch (_) {}
      }

      await fs.promises.writeFile(imgPath, buffer)
      return { format: 'image', url: `guidegram-media://local/${encodeURIComponent(imgPath)}` }
    } catch {
      return null
    }
  }

  public async getPeerStories(accountId: string, peerId: string): Promise<PeerStoriesPayload | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const entity = await holder.client.getInputEntity(peerId)
      const res: any = await holder.client.invoke(
        new Api.stories.GetPeerStories({ peer: entity })
      )
      const peerStories = res?.stories
      if (!peerStories || !Array.isArray(peerStories.stories)) return null

      const stories: StoryItemPayload[] = peerStories.stories
        .filter((s: any) => s.className !== 'StoryItemDeleted' && s.className !== 'StoryItemSkipped')
        .map((s: any) => ({
          id: s.id,
          date: s.date ? s.date * 1000 : Date.now(),
          expireDate: s.expireDate ? s.expireDate * 1000 : Date.now() + 86400000,
          caption: s.caption,
          isVideo: Boolean(s.media?.document?.mimeType?.includes('video')),
          viewsCount: s.views?.viewsCount,
        }))

      return {
        peerId,
        maxReadId: peerStories.maxReadId,
        stories,
      }
    } catch (err) {
      Logger.warn(`[AccountManager] Failed to get peer stories for ${peerId}:`, err)
      return null
    }
  }

  public async readStories(accountId: string, peerId: string, maxId: number): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const entity = await holder.client.getInputEntity(peerId)
      await holder.client.invoke(new Api.stories.ReadStories({ peer: entity, maxId }))
      return true
    } catch (err) {
      Logger.warn(`[AccountManager] Failed to mark stories read:`, err)
      return false
    }
  }

  public async getChannelBoostStatus(accountId: string, channelId: string): Promise<ChannelBoostStatus | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const entity = await holder.client.getInputEntity(channelId)
      const res: any = await holder.client.invoke(
        new Api.premium.GetBoostsStatus({ peer: entity })
      )
      if (!res) return null
      return {
        level: Number(res.level || 0),
        boosts: Number(res.boosts || 0),
        currentLevelBoosts: Number(res.currentLevelBoosts || 0),
        nextLevelBoosts: res.nextLevelBoosts ? Number(res.nextLevelBoosts) : undefined,
        boostUrl: res.boostUrl || '',
        myBoost: Boolean(res.myBoost),
      }
    } catch (err) {
      Logger.warn(`[AccountManager] Failed to get channel boosts for ${channelId}:`, err)
      return null
    }
  }

  public async getTwoFactorStatus(accountId: string): Promise<TwoFactorStatus | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.invoke(new Api.account.GetPassword())
      if (!res) return null
      return {
        hasPassword: Boolean(res.hasPassword),
        hasRecovery: Boolean(res.hasRecovery),
        hint: res.hint || '',
        emailPattern: res.loginEmailPattern || res.emailUnconfirmedPattern || '',
      }
    } catch (err) {
      Logger.warn(`[AccountManager] Failed to get 2FA status:`, err)
      return null
    }
  }

  public async getMyFullProfile(accountId: string): Promise<MyFullProfile | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      if (!holder.client.connected) {
        try {
          await holder.client.connect()
        } catch (_) {}
      }

      const me: any = await holder.client.getMe()
      let fullUser: any = null
      let fullRes: any = null
      try {
        fullRes = await holder.client.invoke(
          new Api.users.GetFullUser({ id: new Api.InputUserSelf() })
        )
        fullUser = fullRes?.fullUser
      } catch (err) {
        Logger.warn(`[AccountManager] GetFullUser self warning:`, err)
      }

      let blockedCount = 0
      try {
        const blockedRes: any = await holder.client.invoke(
          new Api.contacts.GetBlocked({ offset: 0, limit: 1 })
        )
        blockedCount = blockedRes?.count ?? (Array.isArray(blockedRes?.blocked) ? blockedRes.blocked.length : 0)
      } catch (_) {}

      let personalChannelTitle: string | undefined = undefined
      let personalChannelUsername: string | undefined = undefined
      if (fullRes?.chats && fullUser?.personalChannelId) {
        const pChannelId = fullUser.personalChannelId.toString()
        const match = fullRes.chats.find((c: any) => c.id?.toString() === pChannelId)
        if (match) {
          personalChannelTitle = match.title
          personalChannelUsername = match.username
        }
      }

      let chatAutomationBot: string | undefined = undefined
      if (fullUser?.botInfo?.botId) {
        const bId = fullUser.botInfo.botId.toString()
        const botUser = fullRes?.users?.find((u: any) => u.id?.toString() === bId)
        chatAutomationBot = botUser ? (botUser.username ? `@${botUser.username}` : botUser.firstName) : undefined
      }

      let birthdayStr: string | undefined = undefined
      if (fullUser?.birthday) {
        const b = fullUser.birthday
        birthdayStr = `${b.day} / ${b.month}${b.year ? ` / ${b.year}` : ''}`
      }

      const cachedAvatar = this.avatarCache.get(`${accountId}_${me.id.toString()}`)

      return {
        id: me.id.toString(),
        firstName: me.firstName || '',
        lastName: me.lastName || undefined,
        username: me.username || undefined,
        phone: me.phone ? (me.phone.startsWith('+') ? me.phone : `+${me.phone}`) : undefined,
        bio: fullUser?.about || undefined,
        avatarUrl: cachedAvatar || holder.info.avatarUrl,
        isPremium: me.premium === true,
        customEmojiStatusId: me.emojiStatus?.documentId ? me.emojiStatus.documentId.toString() : undefined,
        personalChannelId: fullUser?.personalChannelId ? fullUser.personalChannelId.toString() : undefined,
        personalChannelTitle,
        personalChannelUsername,
        chatAutomationBot,
        stargiftsCount: fullUser?.starredGiftsCount,
        birthday: birthdayStr,
        nameColor: me.color?.color,
        blockedCount,
        activeSessionsCount: 4,
        hasTwoStepAuth: true,
      }
    } catch (err) {
      Logger.error(`[AccountManager] Failed to getMyFullProfile:`, err)
      return null
    }
  }

  public async getPrivacySettings(accountId: string): Promise<PrivacySecuritySettings> {
    const holder = this.clients.get(accountId)
    const fallback: PrivacySecuritySettings = {
      twoStepVerification: true,
      autoDeleteMessages: 'off',
      localPasscode: true,
      passkeys: false,
      blockedUsersCount: 0,
      connectedWebsitesCount: 2,
      activeSessionsCount: 4,
      phoneNumberPrivacy: 'Nobody (+45)',
      lastSeenPrivacy: 'Nobody',
      profilePhotosPrivacy: 'Everybody',
      forwardedMessagesPrivacy: 'Everybody',
      callsPrivacy: 'My contacts',
      voiceMessagesPrivacy: 'Everybody',
      messagesPrivacy: 'Everybody',
      birthdayPrivacy: 'My contacts',
      giftsPrivacy: 'Everybody',
      bioPrivacy: 'Everybody',
      savedMusicPrivacy: 'Everybody',
      invitesPrivacy: 'Nobody (+1)',
    }

    if (!holder?.client) return fallback
    try {
      let blockedCount = 0
      try {
        const blockedRes: any = await holder.client.invoke(
          new Api.contacts.GetBlocked({ offset: 0, limit: 1 })
        )
        blockedCount = blockedRes?.count ?? (Array.isArray(blockedRes?.blocked) ? blockedRes.blocked.length : 0)
      } catch (_) {}

      let has2Fa = true
      try {
        const pwdRes: any = await holder.client.invoke(new Api.account.GetPassword())
        has2Fa = pwdRes?.hasPassword === true
      } catch (_) {}

      let sessionsCount = 1
      try {
        const authRes: any = await holder.client.invoke(new Api.account.GetAuthorizations())
        if (Array.isArray(authRes?.authorizations)) {
          sessionsCount = authRes.authorizations.length
        }
      } catch (_) {}

      return {
        ...fallback,
        twoStepVerification: has2Fa,
        blockedUsersCount: blockedCount,
        activeSessionsCount: sessionsCount,
      }
    } catch (err) {
      Logger.warn(`[AccountManager] getPrivacySettings error:`, err)
      return fallback
    }
  }

  public async createGroup(accountId: string, title: string, userIds: string[]): Promise<DialogItem | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const users: any[] = []
      for (const uid of userIds) {
        try {
          const u = await holder.client.getInputEntity(uid)
          users.push(u)
        } catch (_) {}
      }
      const res: any = await holder.client.invoke(
        new Api.messages.CreateChat({
          users,
          title,
        })
      )
      const chat = res?.chats?.[0]
      if (chat) {
        return {
          id: `-${chat.id.toString()}`,
          accountId,
          title: chat.title || title,
          unreadCount: 0,
          isUser: false,
          isGroup: true,
          isChannel: false,
          isBroadcast: false,
          isBot: false,
          isPinned: false,
        }
      }
      return null
    } catch (err) {
      Logger.error(`[AccountManager] createGroup error:`, err)
      throw err
    }
  }

  public async createChannel(accountId: string, title: string, about: string, isMegagroup = false): Promise<DialogItem | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.invoke(
        new Api.channels.CreateChannel({
          title,
          about,
          megagroup: isMegagroup,
          broadcast: !isMegagroup,
        })
      )
      const ch = res?.chats?.[0]
      if (ch) {
        return {
          id: `-100${ch.id.toString()}`,
          accountId,
          title: ch.title || title,
          unreadCount: 0,
          isUser: false,
          isGroup: isMegagroup,
          isChannel: true,
          isBroadcast: !isMegagroup,
          isBot: false,
          isPinned: false,
        }
      }
      return null
    } catch (err) {
      Logger.error(`[AccountManager] createChannel error:`, err)
      throw err
    }
  }

  public getAccounts(): AccountInfo[] {
    const config = this.store.getConfig()
    const result: AccountInfo[] = []
    const seen = new Set<string>()

    // 1. Current clients in memory
    for (const holder of this.clients.values()) {
      result.push(holder.info)
      seen.add(holder.info.id)
    }

    // 2. Any accounts saved in config not yet loaded into memory
    for (const acc of config.accounts) {
      if (!seen.has(acc.id)) {
        result.push({
          ...acc,
          status: 'connecting',
        })
        seen.add(acc.id)
      }
    }

    return result
  }
}


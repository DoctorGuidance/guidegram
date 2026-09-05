import fs from 'fs'
import path from 'path'
import { TelegramClient, Api, sessions } from 'telegram'
import { NewMessage } from 'telegram/events/index.js'
import QRCode from 'qrcode'
import { SessionStore } from './sessionStore'
import { ProxyManager } from './proxyManager'
import { Logger } from './logger'
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
}

export class AccountManager {
  private store: SessionStore
  private clients = new Map<string, ClientHolder>()
  private pendingAuthClients = new Map<string, { client: TelegramClient; phoneCodeHash: string; proxy?: ProxyConfig }>()
  private pendingQrAuth?: PendingQrAuth
  private onEventCallback?: (event: string, payload: any) => void
  private avatarsDir: string
  private mediaDir: string
  private avatarCache = new Map<string, string>() // `${accountId}_${peerId}` -> data URL
  private mediaCache = new Map<string, string>() // `${accountId}_${chatId}_${msgId}` -> data URL

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

    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
      proxy: proxy,
      useWSS: false,
    })

    try {
      Logger.info(`[AccountManager] Connecting saved account ${savedAcc.id} (${savedAcc.phone || savedAcc.firstName})...`)
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

    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 3,
      proxy: gramProxy,
    })

    try {
      await client.connect()
      Logger.info(`[AccountManager] Connected to Telegram DC for ${phone}. Sending code...`)

      const { phoneCodeHash } = await client.sendCode(
        {
          apiId: config.apiId,
          apiHash: config.apiHash,
        },
        phone
      )

      Logger.info(`[AccountManager] Code sent to ${phone}, phoneCodeHash: ${phoneCodeHash}`)
      this.pendingAuthClients.set(phone, { client, phoneCodeHash, proxy })
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

    const { client, phoneCodeHash, proxy } = pending
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

    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
      proxy: gramProxy,
      useWSS: false,
    })

    const qrState: PendingQrAuth = {
      client,
      proxy,
      cancelled: false,
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
   * Get dialog list for an account
   */
  public async getDialogs(accountId: string, limit = 50): Promise<DialogItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) {
      throw new Error(`Account ${accountId} is still connecting or disconnected.`)
    }

    const dialogs = await holder.client.getDialogs({ limit })
    return dialogs.map((d: any) => {
      const entity = d.entity || {}
      const isUser = d.isUser || false
      const isGroup = d.isGroup || false
      const isChannel = d.isChannel || false
      const isBot = entity.bot || false
      const peerId = d.id.toString()
      const cachedAvatar = this.avatarCache.get(`${accountId}_${peerId}`)

      return {
        id: peerId,
        accountId,
        title: d.title || d.name || 'Chat',
        unreadCount: d.unreadCount || 0,
        isUser,
        isGroup,
        isChannel,
        isBot,
        isPinned: d.pinned || false,
        lastMessageText: d.message?.message || '',
        lastMessageDate: d.message?.date ? d.message.date * 1000 : Date.now(),
        avatarInitials: (d.title || d.name || 'C').substring(0, 2).toUpperCase(),
        avatarUrl: cachedAvatar,
      }
    })
  }

  /**
   * Get messages for a given chat with rich replies, media and formatting entities
   */
  public async getMessages(accountId: string, chatId: string, limit = 40): Promise<MessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) {
      throw new Error(`Account ${accountId} is still connecting or disconnected.`)
    }

    const messages = await holder.client.getMessages(chatId, { limit })

    // Build map for quick reply lookup
    const msgMap = new Map<number, any>()
    for (const m of messages) {
      if (m && m.id) {
        msgMap.set(m.id, m)
      }
    }

    return messages.map((m: any) => {
      let replyMarkup: { rows: InlineButton[][] } | undefined = undefined
      if (m.replyMarkup && (m.replyMarkup as any).rows) {
        replyMarkup = {
          rows: (m.replyMarkup as any).rows.map((row: any) =>
            (row.buttons || []).map((btn: any) => {
              let callbackData: string | undefined = undefined
              if (btn.data) {
                try {
                  callbackData = Buffer.isBuffer(btn.data)
                    ? btn.data.toString('utf-8')
                    : String(btn.data)
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
            senderName: replied.sender?.firstName || replied.sender?.title || 'User',
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

      return {
        id: m.id,
        chatId,
        accountId,
        senderId: m.senderId?.toString(),
        senderName: m.sender?.firstName || m.sender?.title || 'Unknown',
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
   * Download message media (photo, video thumb, document) with local disk caching
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

    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) return null

    try {
      const msgs = await holder.client.getMessages(chatId, { ids: [messageId] })
      if (msgs && msgs.length > 0 && msgs[0].media) {
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
            const streamUrl = `guidegram-media://${diskPath}`
            this.mediaCache.set(cacheKey, streamUrl)
            return streamUrl
          }
        }

        const buf = await holder.client.downloadMedia(msgs[0].media, {
          thumb: thumb ? -1 : undefined,
        })
        if (buf && buf.length > 0) {
          await fs.promises.writeFile(diskPath, buf)
          if (thumb) {
            const dataUrl = `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
            this.mediaCache.set(cacheKey, dataUrl)
            return dataUrl
          } else {
            const streamUrl = `guidegram-media://${diskPath}`
            this.mediaCache.set(cacheKey, streamUrl)
            return streamUrl
          }
        }
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] Failed to download media for ${chatId}/${messageId}:`, err)
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

          // Pinned message
          if (full.fullChat?.pinnedMsgId) {
            pinnedMessage = {
              id: full.fullChat.pinnedMsgId,
            }
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
        botInfo = {
          isBot: true,
          privacyMode: !entity.botChatHistory,
          commands,
        }
      }

      const avatarUrl = await this.getProfilePhoto(accountId, chatId)

      return {
        id: chatId,
        title: entity.title || entity.firstName || 'Chat',
        username,
        about,
        membersCount,
        isChannel: isChannel && !isGroup,
        isGroup,
        isUser,
        isBot,
        avatarUrl: avatarUrl || undefined,
        verified,
        fake,
        scam,
        pinnedMessage,
        canSendMessages,
        canDeleteMessages,
        isCreator,
        permissionsMatrix,
        participants: participantsList.length > 0 ? participantsList : undefined,
        botInfo,
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
   * Send a text message with optional replyToMsgId
   */
  public async sendMessage(
    accountId: string,
    chatId: string,
    text: string,
    replyToMsgId?: number
  ): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder || !holder.client) throw new Error(`Account ${accountId} is not connected.`)

    const sendParams: any = { message: text }
    if (replyToMsgId) {
      sendParams.replyTo = replyToMsgId
    }

    const sent = await holder.client.sendMessage(chatId, sendParams)

    return {
      id: sent.id,
      chatId,
      accountId,
      text: sent.message,
      date: sent.date * 1000,
      isOutgoing: true,
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
        replyMarkup = {
          rows: (msg.replyMarkup as any).rows.map((row: any) =>
            (row.buttons || []).map((btn: any) => {
              let callbackData: string | undefined = undefined
              if (btn.data) {
                try {
                  callbackData = Buffer.isBuffer(btn.data)
                    ? btn.data.toString('utf-8')
                    : String(btn.data)
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

      const payload = {
        accountId,
        chatId: msg.chatId?.toString(),
        message: {
          id: msg.id,
          chatId: msg.chatId?.toString(),
          accountId,
          senderId: msg.senderId?.toString(),
          senderName: msg.sender?.firstName || 'Unknown',
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
        const largest = photo.sizes[photo.sizes.length - 1]
        if (largest) {
          mediaWidth = largest.w
          mediaHeight = largest.h
          mediaFileSize = largest.size
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

        const mediaFileSize = typeof doc.size === 'bigint' ? Number(doc.size) : (doc.size || 0)
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
      const cName = ent.className || ent.constructor?.name || ''
      if (cName === 'MessageEntityBold') type = 'bold'
      else if (cName === 'MessageEntityItalic') type = 'italic'
      else if (cName === 'MessageEntityCode') type = 'code'
      else if (cName === 'MessageEntityPre') type = 'pre'
      else if (cName === 'MessageEntityTextUrl') type = 'text_url'
      else if (cName === 'MessageEntityUrl') type = 'url'
      else if (cName === 'MessageEntityMention') type = 'mention'
      else if (cName === 'MessageEntityStrike') type = 'strike'
      else if (cName === 'MessageEntityUnderline') type = 'underline'
      else if (cName === 'MessageEntitySpoiler') type = 'spoiler'
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


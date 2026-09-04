import { TelegramClient, Api, sessions } from 'telegram'
import { NewMessage } from 'telegram/events/index.js'
import QRCode from 'qrcode'
import { SessionStore } from './sessionStore'
import { ProxyManager } from './proxyManager'
import { Logger } from './logger'
import { AccountInfo, DialogItem, MessageItem, ForwardOptions, ProxyConfig, QrTokenPayload, InlineButton } from './types'

export interface ClientHolder {
  client: TelegramClient
  session: sessions.StringSession
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

  constructor(store: SessionStore, onEvent?: (event: string, payload: any) => void) {
    this.store = store
    this.onEventCallback = onEvent
  }

  /**
   * Initialize all saved accounts at startup
   */
  public async initialize(): Promise<AccountInfo[]> {
    const config = this.store.getConfig()
    const loadedAccounts: AccountInfo[] = []

    for (const savedAcc of config.accounts) {
      try {
        const sessionString = this.store.getSessionString(savedAcc.id)
        if (!sessionString) continue

        const session = new sessions.StringSession(sessionString)
        const proxy = ProxyManager.toGramJsProxy(savedAcc.proxyConfig)

        const client = new TelegramClient(session, config.apiId, config.apiHash, {
          connectionRetries: 5,
          proxy: proxy,
          useWSS: false,
        })

        await client.connect()

        if (await client.isUserAuthorized()) {
          const me: any = await client.getMe()
          const info: AccountInfo = {
            id: me.id.toString(),
            phone: me.phone || savedAcc.phone,
            firstName: me.firstName || 'User',
            lastName: me.lastName || undefined,
            username: me.username || undefined,
            status: 'connected',
            unreadTotal: savedAcc.unreadTotal || 0,
            proxyConfig: savedAcc.proxyConfig,
            isPremium: me.premium || false,
          }

          this.clients.set(info.id, { client, session, info })
          this.setupEventListeners(info.id, client)
          loadedAccounts.push(info)
        } else {
          this.clients.set(savedAcc.id, {
            client,
            session,
            info: { ...savedAcc, status: 'needs_auth' },
          })
          loadedAccounts.push({ ...savedAcc, status: 'needs_auth' })
        }
      } catch (err) {
        console.error(`[AccountManager] Failed to load account ${savedAcc.id}:`, err)
        loadedAccounts.push({ ...savedAcc, status: 'disconnected' })
      }
    }

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

      // Run polling loop in background
      this.runQrLoop(qrState, tokenStr).catch((err) => {
        if (!qrState.cancelled) {
          console.error('[AccountManager] QR loop error:', err)
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
      this.pendingQrAuth.cancelled = true
      this.pendingQrAuth.wakeUp?.()
      const client = this.pendingQrAuth.client
      this.pendingQrAuth = undefined
      try {
        await client.disconnect()
      } catch (err) {
        console.warn('[AccountManager] Disconnect error during cancelQrAuth:', err)
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
   * Internal loop to poll QR token status or refresh expired QR tokens
   */
  private async runQrLoop(qrState: PendingQrAuth, initialTokenStr: string): Promise<void> {
    const { client, proxy } = qrState
    const config = this.store.getConfig()
    let lastTokenStr = initialTokenStr

    let wakeUpTrigger: (() => void) | undefined
    let isFinished = false

    const updateHandler = (update: any) => {
      if (isFinished || qrState.cancelled) return
      if (update?.className === 'UpdateLoginToken' || update instanceof Api.UpdateLoginToken) {
        wakeUpTrigger?.()
      }
    }
    client.addEventHandler(updateHandler)

    qrState.wakeUp = () => {
      wakeUpTrigger?.()
    }

    try {
      while (!qrState.cancelled) {
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
          }, 3500)
        })

        if (qrState.cancelled) break

        try {
          const res = await client.invoke(
            new Api.auth.ExportLoginToken({
              apiId: config.apiId,
              apiHash: config.apiHash,
              exceptIds: [],
            })
          )

          if (qrState.cancelled) break

          if (res instanceof Api.auth.LoginToken) {
            const tokenStr = Buffer.from(res.token).toString('base64url')
            if (tokenStr !== lastTokenStr) {
              lastTokenStr = tokenStr
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
              this.onEventCallback?.('telegram:qr-token', { url, qrDataUrl, expires })
            }
          } else if (res instanceof Api.auth.LoginTokenSuccess) {
            this.onEventCallback?.('telegram:qr-scanned', {})
            await this.finalizeQrLogin(client, proxy)
            break
          } else if (res instanceof Api.auth.LoginTokenMigrateTo) {
            this.onEventCallback?.('telegram:qr-scanned', {})
            await client._switchDC(res.dcId)
            const migrated = await client.invoke(
              new Api.auth.ImportLoginToken({
                token: res.token,
              })
            )
            if (migrated instanceof Api.auth.LoginTokenSuccess) {
              await this.finalizeQrLogin(client, proxy)
            } else {
              throw new Error('Unexpected response during DC migration.')
            }
            break
          }
        } catch (err: any) {
          if (qrState.cancelled) break

          if (
            err.errorMessage === 'SESSION_PASSWORD_NEEDED' ||
            (err.message && err.message.includes('SESSION_PASSWORD_NEEDED'))
          ) {
            this.onEventCallback?.('telegram:qr-scanned', {})
            let hint = ''
            try {
              const pwd = await client.invoke(new Api.account.GetPassword())
              hint = pwd.hint || ''
            } catch (e) {
              console.warn('[AccountManager] Could not get 2FA hint:', e)
            }
            this.onEventCallback?.('telegram:qr-2fa', { hint })
            break
          }

          console.warn('[AccountManager] Transient error in QR poll iteration:', err?.message || err)
        }
      }
    } finally {
      isFinished = true
      qrState.wakeUp = undefined
      try {
        (client as any)._eventBuilders = (client as any)._eventBuilders?.filter(
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
        await holder.client.disconnect()
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
    if (!holder) throw new Error(`Account ${accountId} not found or not connected`)

    const dialogs = await holder.client.getDialogs({ limit })
    return dialogs.map((d: any) => {
      const entity = d.entity || {}
      const isUser = d.isUser || false
      const isGroup = d.isGroup || false
      const isChannel = d.isChannel || false
      const isBot = entity.bot || false

      return {
        id: d.id.toString(),
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
      }
    })
  }

  /**
   * Get messages for a given chat
   */
  public async getMessages(accountId: string, chatId: string, limit = 40): Promise<MessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder) throw new Error(`Account ${accountId} not found`)

    const messages = await holder.client.getMessages(chatId, { limit })

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

      return {
        id: m.id,
        chatId,
        accountId,
        senderId: m.senderId?.toString(),
        senderName: m.sender?.firstName || m.sender?.title || 'Unknown',
        text: m.message || '',
        date: m.date * 1000,
        isOutgoing: m.out || false,
        isForwarded: !!m.fwdFrom,
        forwardFromName: m.fwdFrom?.fromName || undefined,
        replyToMsgId: m.replyTo?.replyToMsgId,
        mediaType: m.media ? this.detectMediaType(m.media) : undefined,
        replyMarkup,
      }
    }).reverse() // Chronological order
  }

  /**
   * Send a text message
   */
  public async sendMessage(accountId: string, chatId: string, text: string): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder) throw new Error(`Account ${accountId} not found`)

    const sent = await holder.client.sendMessage(chatId, { message: text })

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
   * Telegraph-like Direct Forwarding:
   * dropAuthor: true removes the "Forwarded From" header!
   * Supports forwarding to Saved Messages ('me' or accountId)
   */
  public async forwardMessages(
    accountId: string,
    toChatId: string,
    fromChatId: string,
    messageIds: number[],
    options: ForwardOptions
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder) throw new Error(`Account ${accountId} not found`)

    const targetPeer = (toChatId === 'me' || toChatId === accountId) ? 'me' : toChatId

    await holder.client.forwardMessages(targetPeer, {
      messages: messageIds,
      fromPeer: fromChatId,
      dropAuthor: options.withoutQuote ?? true, // Removes "Forwarded from" header
      silent: options.silent ?? false,
    })

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
    if (!holder) throw new Error(`Account ${accountId} not found`)

    await holder.client.deleteMessages(chatId, messageIds, { revoke })
    return true
  }

  /**
   * Mark all chats as read for the account (64Gram Mark All Read feature)
   */
  public async markAllAsRead(accountId: string): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder) throw new Error(`Account ${accountId} not found`)

    const config = this.store.getConfig()
    if (config.ghostMode) return // Ghost Mode blocks read receipts

    const dialogs = await holder.client.getDialogs({ limit: 100 })
    for (const d of dialogs) {
      if ((d as any).unreadCount > 0 && d.id != null) {
        try {
          await holder.client.markAsRead(d.id)
        } catch (err) {
          console.warn(`[AccountManager] Failed to mark ${d.id} as read:`, err)
        }
      }
    }
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
    if (!holder) return

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

      const payload = {
        accountId,
        chatId: msg.chatId?.toString(),
        message: {
          id: msg.id,
          chatId: msg.chatId?.toString(),
          accountId,
          senderName: msg.sender?.firstName || 'Unknown',
          text: msg.message || '',
          date: msg.date * 1000,
          isOutgoing: msg.out || false,
          mediaType: msg.media ? this.detectMediaType(msg.media) : undefined,
          replyMarkup,
        },
      }

      this.onEventCallback?.('telegram:new-message', payload)
    }, new NewMessage({}))
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
    return Array.from(this.clients.values()).map((c) => c.info)
  }
}

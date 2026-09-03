import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { NewMessage } from 'telegram/events/index.js'
import { SessionStore } from './sessionStore'
import { ProxyManager } from './proxyManager'
import { AccountInfo, DialogItem, MessageItem, ForwardOptions, ProxyConfig } from './types'

export interface ClientHolder {
  client: TelegramClient
  session: StringSession
  info: AccountInfo
}

export class AccountManager {
  private store: SessionStore
  private clients = new Map<string, ClientHolder>()
  private pendingAuthClients = new Map<string, { client: TelegramClient; phoneCodeHash: string; proxy?: ProxyConfig }>()
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

        const session = new StringSession(sessionString)
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
    const config = this.store.getConfig()
    const session = new StringSession('')
    const gramProxy = ProxyManager.toGramJsProxy(proxy)

    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 3,
      proxy: gramProxy,
    })

    await client.connect()

    const { phoneCodeHash } = await client.sendCode(
      {
        apiId: config.apiId,
        apiHash: config.apiHash,
      },
      phone
    )

    this.pendingAuthClients.set(phone, { client, phoneCodeHash, proxy })
    return { phoneCodeHash }
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

    await holder.client.forwardMessages(toChatId, {
      messages: messageIds,
      fromPeer: fromChatId,
      dropAuthor: options.withoutQuote ?? true, // Removes "Forwarded from" header
      silent: options.silent ?? false,
    })

    return true
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

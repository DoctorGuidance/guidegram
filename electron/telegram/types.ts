export type ProxyType = 'socks5' | 'http' | 'mtproto'

export interface ProxyConfig {
  id: string
  name: string
  enabled: boolean
  type: ProxyType
  host: string
  port: number
  username?: string
  password?: string
  secret?: string // for MTProto proxy
  pingMs?: number
  lastChecked?: number
}

export type AccountStatus = 'connected' | 'connecting' | 'disconnected' | 'needs_auth'

export interface AccountInfo {
  id: string
  phone: string
  firstName: string
  lastName?: string
  username?: string
  avatarUrl?: string
  status: AccountStatus
  unreadTotal: number
  proxyConfig?: ProxyConfig
  isPremium?: boolean
  sessionString?: string
}

export interface DialogItem {
  id: string
  accountId: string
  title: string
  unreadCount: number
  isUser: boolean
  isGroup: boolean
  isChannel: boolean
  isBot: boolean
  isPinned: boolean
  lastMessageText?: string
  lastMessageDate?: number
  avatarInitials?: string
}

export interface MessageItem {
  id: number
  chatId: string
  accountId: string
  senderId?: string
  senderName?: string
  text: string
  date: number
  isOutgoing: boolean
  isForwarded?: boolean
  forwardFromName?: string
  replyToMsgId?: number
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker'
}

export interface ForwardOptions {
  silent?: boolean
  withoutQuote?: boolean // Drops original author header
  caption?: string
}

export interface AppConfig {
  apiId: number
  apiHash: string
  ghostMode: boolean
  theme: 'dark' | 'oled' | 'light'
  accounts: AccountInfo[]
  proxies: ProxyConfig[]
}

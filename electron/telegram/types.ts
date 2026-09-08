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

export interface QrTokenPayload {
  url: string
  qrDataUrl: string
  expires: number
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
  deviceProfile?: {
    deviceModel: string
    systemVersion: string
    appVersion: string
    systemLangCode?: string
    langCode?: string
  }
}

export interface MessageReactionItem {
  emoji: string
  count: number
  chosen?: boolean
}

export interface PinnedMessageItem {
  id: number
  text?: string
  senderName?: string
  date?: number
}

export interface DialogItem {
  id: string
  accountId: string
  title: string
  unreadCount: number
  unreadMentionsCount?: number
  unreadSendersCount?: number
  isMuted?: boolean
  isUser: boolean
  isGroup: boolean
  isChannel: boolean
  isBot: boolean
  isPinned: boolean
  isSavedMessages?: boolean
  pinnedMessage?: PinnedMessageItem
  canSendMessages?: boolean
  lastMessageText?: string
  lastMessageDate?: number
  avatarInitials?: string
  avatarUrl?: string
  username?: string
  folderId?: number
}

export interface InlineButton {
  text: string
  url?: string
  data?: string // callback_data
}

export interface WebPagePreview {
  url: string
  siteName?: string
  title?: string
  description?: string
  photoUrl?: string
  image?: string
  domain?: string
  favicon?: string
}

export type LinkPreviewData = WebPagePreview

export interface ReplyInfo {
  replyToMsgId: number
  senderName?: string
  text?: string
}

export interface MessageEntityItem {
  type: string // 'bold' | 'italic' | 'code' | 'pre' | 'text_url' | 'url' | 'mention' | 'strike' | 'spoiler' | 'underline' | 'custom_emoji' | 'blockquote'
  offset: number
  length: number
  url?: string
  language?: string
  documentId?: string // for custom emoji
}

export interface MessageItem {
  id: number
  chatId: string
  accountId: string
  senderId?: string
  senderName?: string
  senderAvatarUrl?: string
  text: string
  date: number
  isOutgoing: boolean
  isForwarded?: boolean
  forwardFromName?: string
  replyToMsgId?: number
  replyTo?: ReplyInfo
  isSticker?: boolean
  isVoice?: boolean
  isRoundVideo?: boolean
  voiceWaveform?: number[]
  reactions?: MessageReactionItem[]
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'webpage'
  mediaUrl?: string
  mediaThumbnailUrl?: string
  mediaFileName?: string
  mediaFileSize?: number // bytes
  mediaDuration?: number // seconds
  mediaWidth?: number
  mediaHeight?: number
  mediaMimeType?: string
  mediaFilePath?: string
  webPage?: WebPagePreview
  entities?: MessageEntityItem[]
  postAuthor?: string
  senderRank?: string
  ttlSeconds?: number
  isSilent?: boolean
  replyMarkup?: {
    rows: InlineButton[][]
  }
}

export interface ChatDetails {
  id: string
  title: string
  username?: string
  about?: string
  membersCount?: number
  isChannel: boolean
  isGroup: boolean
  isUser: boolean
  isBot: boolean
  avatarUrl?: string
  verified?: boolean
  fake?: boolean
  scam?: boolean
  notificationsEnabled?: boolean
  pinnedMessage?: PinnedMessageItem
  pinnedMessages?: PinnedMessageItem[]
  canSendMessages?: boolean
  canDeleteMessages?: boolean
  isCreator?: boolean
  permissionsMatrix?: {
    sendMessages: boolean
    sendMedia: boolean
    sendStickers: boolean
    sendPolls: boolean
    embedLinks: boolean
    inviteUsers: boolean
    pinMessages: boolean
    changeInfo: boolean
  }
  participants?: Array<{
    id: string
    name: string
    username?: string
    role: 'creator' | 'admin' | 'member'
    customTitle?: string
    avatarUrl?: string
  }>
  botInfo?: {
    isBot: boolean
    privacyMode: boolean
    commands?: Array<{ command: string; description: string }>
    menuButton?: {
      text?: string
      url?: string
    }
  }
}

export interface ForwardOptions {
  silent?: boolean
  withoutQuote?: boolean // Drops original author header
  caption?: string
}

export type CloseAction = 'ask' | 'minimize' | 'quit'

export interface UpdateProgress {
  percent: number // 0 to 100
  transferredBytes: number
  totalBytes: number
  stage: 'downloading' | 'verifying' | 'extracting' | 'restarting'
}

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseNotes?: string
  downloadUrl?: string
  publishedAt?: string
  hasUpdate: boolean
}

export interface AppConfig {
  apiId: number
  apiHash: string
  ghostMode: boolean
  theme: 'dark' | 'oled' | 'light'
  accounts: AccountInfo[]
  proxies: ProxyConfig[]
  // Window & Lifecycle Preferences
  closeAction: CloseAction
  rememberCloseAction: boolean
  // 64Gram Power Features
  showChatId: boolean
  showMessageId: boolean
  showSeconds: boolean
  showSenderAvatar: boolean
  quickForwardToSaved: boolean
  alwaysDeleteBoth: boolean
  markAllReadEnabled: boolean
  copyCallbackData: boolean
  disableAnimations?: boolean
  suppressLinkWarning?: boolean
  // Device & Privacy Spoofing
  antiFingerprinting?: boolean
}

export interface OpenFileDialogOptions {
  type?: 'media' | 'document' | 'audio'
  allowMultiple?: boolean
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'multiSelections'>
}

export interface OpenFileDialogResult {
  canceled: boolean
  filePaths: string[]
}

export interface SendMessageOptions {
  replyToMsgId?: number
  silent?: boolean
  scheduleDate?: number // unix timestamp in milliseconds
}

export interface SendMediaOptions {
  caption?: string
  replyToMsgId?: number
  isVoice?: boolean
  duration?: number
  forceDocument?: boolean
  uploadId?: string
  silent?: boolean
  scheduleDate?: number // unix timestamp in milliseconds
}

export interface UploadProgressPayload {
  accountId: string
  chatId: string
  uploadId: string
  progress: number
  filePath?: string
}

export interface DownloadProgressPayload {
  accountId: string
  chatId: string
  messageId: number
  progress: number
  bytesReceived: number
  totalBytes: number
}

export interface BotCallbackResult {
  message?: string
  alert?: boolean
  url?: string
}



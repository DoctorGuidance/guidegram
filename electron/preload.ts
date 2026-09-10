import { contextBridge, ipcRenderer, webUtils } from 'electron'
import {
  ProxyConfig,
  ForwardOptions,
  AppConfig,
  QrTokenPayload,
  AccountInfo,
  UpdateInfo,
  ChatDetails,
  MessageItem,
  DialogItem,
  PortableLocatorInfo,
  OpenFileDialogOptions,
  OpenFileDialogResult,
  SendMediaOptions,
  SendMessageOptions,
  WebPagePreview,
  BotCallbackResult,
  CustomEmojiPayload,
} from './telegram/types'

const guidegramAPI = {
  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  requestClose: (): Promise<{ action: 'ask' | 'minimize' | 'quit' }> =>
    ipcRenderer.invoke('window:request-close'),
  confirmClose: (action: 'minimize' | 'quit', remember: boolean): Promise<void> =>
    ipcRenderer.invoke('window:confirm-close', { action, remember }),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Accounts
  getAccounts: (): Promise<AccountInfo[]> => ipcRenderer.invoke('telegram:get-accounts'),
  startPhoneAuth: (phone: string, proxy?: ProxyConfig) =>
    ipcRenderer.invoke('telegram:start-phone-auth', { phone, proxy }),
  completePhoneAuth: (phone: string, code: string, password?: string) =>
    ipcRenderer.invoke('telegram:complete-phone-auth', { phone, code, password }),
  startQrAuth: (proxy?: ProxyConfig): Promise<QrTokenPayload> =>
    ipcRenderer.invoke('telegram:start-qr-auth', { proxy }),
  cancelQrAuth: (): Promise<void> =>
    ipcRenderer.invoke('telegram:cancel-qr-auth'),
  submitQrPassword: (password: string): Promise<AccountInfo> =>
    ipcRenderer.invoke('telegram:submit-qr-password', { password }),
  logoutAccount: (accountId: string) =>
    ipcRenderer.invoke('telegram:logout-account', { accountId }),
  reconnectAccount: (accountId: string): Promise<AccountInfo> =>
    ipcRenderer.invoke('telegram:reconnect-account', { accountId }),

  // Dialogs & Messages
  getDialogs: (accountId: string) =>
    ipcRenderer.invoke('telegram:get-dialogs', { accountId }),
  getMessages: (accountId: string, chatId: string, limit?: number) =>
    ipcRenderer.invoke('telegram:get-messages', { accountId, chatId, limit }),
  sendMessage: (
    accountId: string,
    chatId: string,
    text: string,
    replyToMsgId?: number,
    options?: SendMessageOptions
  ): Promise<MessageItem> =>
    ipcRenderer.invoke('telegram:send-message', { accountId, chatId, text, replyToMsgId, options }),
  sendMedia: (
    accountId: string,
    chatId: string,
    filePath: string,
    options?: SendMediaOptions
  ): Promise<MessageItem> =>
    ipcRenderer.invoke('telegram:send-media', { accountId, chatId, filePath, options }),
  openFileDialog: (options?: OpenFileDialogOptions): Promise<OpenFileDialogResult> =>
    ipcRenderer.invoke('dialog:open-file', options),
  saveTempFile: (params: { buffer: ArrayBuffer | Uint8Array; filename: string }): Promise<string> =>
    ipcRenderer.invoke('system:save-temp-file', params),
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return (file as any).path || ''
    }
  },
  forwardMessages: (
    accountId: string,
    toChatId: string | string[],
    fromChatId: string,
    messageIds: number[],
    options: ForwardOptions
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:forward-messages', {
      accountId,
      toChatId: Array.isArray(toChatId) ? toChatId[0] : toChatId,
      toChatIds: Array.isArray(toChatId) ? toChatId : [toChatId],
      fromChatId,
      messageIds,
      options,
    }),
  markAsRead: (accountId: string, chatId: string): Promise<void> =>
    ipcRenderer.invoke('telegram:mark-as-read', { accountId, chatId }),
  markAllAsRead: (accountId: string): Promise<{ success: boolean; count: number }> =>
    ipcRenderer.invoke('telegram:mark-all-as-read', { accountId }),
  deleteMessages: (
    accountId: string,
    chatId: string,
    messageIds: number[],
    revoke?: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-messages', { accountId, chatId, messageIds, revoke }),
  getProfilePhoto: (accountId: string, peerId: string): Promise<string | null> =>
    ipcRenderer.invoke('telegram:get-profile-photo', { accountId, peerId }),
  downloadMedia: (
    accountId: string,
    chatId: string,
    messageId: number,
    thumb?: boolean
  ): Promise<string | null> =>
    ipcRenderer.invoke('telegram:download-media', { accountId, chatId, messageId, thumb }),
  cancelDownloadMedia: (
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:cancel-download-media', { accountId, chatId, messageId }),
  sendBotCallbackQuery: (
    accountId: string,
    chatId: string,
    messageId: number,
    data?: string,
    row?: number,
    col?: number
  ): Promise<BotCallbackResult> =>
    ipcRenderer.invoke('telegram:send-bot-callback', { accountId, chatId, messageId, data, row, col }),
  getCustomEmojiUrl: (
    accountId: string,
    documentId: string
  ): Promise<string | null> =>
    ipcRenderer.invoke('telegram:get-custom-emoji', { accountId, documentId }),
  getCustomEmojiData: (
    accountId: string,
    documentId: string
  ): Promise<CustomEmojiPayload | null> =>
    ipcRenderer.invoke('telegram:get-custom-emoji-data', { accountId, documentId }),
  saveMediaToFile: (
    accountId: string,
    chatId: string,
    messageId: number,
    defaultName?: string
  ): Promise<{ success: boolean; filePath?: string; canceled?: boolean }> =>
    ipcRenderer.invoke('telegram:save-media-to-file', { accountId, chatId, messageId, defaultName }),
  getChatDetails: (accountId: string, chatId: string): Promise<ChatDetails> =>
    ipcRenderer.invoke('telegram:get-chat-details', { accountId, chatId }),
  resolvePeer: (accountId: string, target: string): Promise<any> =>
    ipcRenderer.invoke('telegram:resolve-peer', { accountId, target }),
  toggleChatNotifications: (accountId: string, chatId: string, mute: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:toggle-chat-notifications', { accountId, chatId, mute }),
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('system:open-external', { url }),
  getLinkPreview: (url: string): Promise<WebPagePreview | null> =>
    ipcRenderer.invoke('web:get-link-preview', { url }),

  // Global Telegram Search & Historical Messages
  searchPublicPeers: (accountId: string, query: string): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:search-public-peers', { accountId, query }),
  searchGlobal: (accountId: string, query: string, filterType?: string, limit?: number): Promise<MessageItem[]> =>
    ipcRenderer.invoke('telegram:search-global', { accountId, query, filterType, limit }),
  getHistoricalMessages: (accountId: string, chatId: string, limit?: number, offsetDate?: number): Promise<MessageItem[]> =>
    ipcRenderer.invoke('telegram:get-historical-messages', { accountId, chatId, limit, offsetDate }),

  // Proxy & Settings
  testProxyPing: (proxy: ProxyConfig) =>
    ipcRenderer.invoke('telegram:test-proxy-ping', { proxy }),
  getConfig: () => ipcRenderer.invoke('telegram:get-config'),
  updateConfig: (partial: Partial<AppConfig>) =>
    ipcRenderer.invoke('telegram:update-config', { partial }),
  getPortableDataPath: () => ipcRenderer.invoke('system:get-portable-data-path'),
  getPortableLocator: (): Promise<PortableLocatorInfo | null> =>
    ipcRenderer.invoke('system:get-portable-locator'),
  syncFromPortable: (sourceDataPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('system:sync-from-portable', { sourceDataPath }),

  // Software Updates
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('app:get-version'),
  checkForUpdates: (): Promise<UpdateInfo | null> =>
    ipcRenderer.invoke('system:check-for-updates'),
  installUpdate: (downloadUrl: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('system:install-update', { downloadUrl }),

  // Logging & Diagnostics
  getLogs: (maxLines?: number) => ipcRenderer.invoke('system:get-logs', { maxLines }),
  openLogsFolder: () => ipcRenderer.invoke('system:open-logs-folder'),
  logError: (message: string, stack?: string) =>
    ipcRenderer.invoke('system:log-renderer-error', { message, stack }),

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

export type GuidegramAPI = typeof guidegramAPI

contextBridge.exposeInMainWorld('guidegram', guidegramAPI)

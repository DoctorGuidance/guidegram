import { contextBridge, ipcRenderer } from 'electron'
import { ProxyConfig, ForwardOptions, AppConfig, QrTokenPayload, AccountInfo } from './telegram/types'

const guidegramAPI = {
  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Accounts
  getAccounts: () => ipcRenderer.invoke('telegram:get-accounts'),
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

  // Dialogs & Messages
  getDialogs: (accountId: string) =>
    ipcRenderer.invoke('telegram:get-dialogs', { accountId }),
  getMessages: (accountId: string, chatId: string, limit?: number) =>
    ipcRenderer.invoke('telegram:get-messages', { accountId, chatId, limit }),
  sendMessage: (accountId: string, chatId: string, text: string) =>
    ipcRenderer.invoke('telegram:send-message', { accountId, chatId, text }),
  forwardMessages: (
    accountId: string,
    toChatId: string,
    fromChatId: string,
    messageIds: number[],
    options: ForwardOptions
  ) =>
    ipcRenderer.invoke('telegram:forward-messages', {
      accountId,
      toChatId,
      fromChatId,
      messageIds,
      options,
    }),
  markAsRead: (accountId: string, chatId: string) =>
    ipcRenderer.invoke('telegram:mark-as-read', { accountId, chatId }),

  // Proxy & Settings
  testProxyPing: (proxy: ProxyConfig) =>
    ipcRenderer.invoke('telegram:test-proxy-ping', { proxy }),
  getConfig: () => ipcRenderer.invoke('telegram:get-config'),
  updateConfig: (partial: Partial<AppConfig>) =>
    ipcRenderer.invoke('telegram:update-config', { partial }),
  getPortableDataPath: () => ipcRenderer.invoke('system:get-portable-data-path'),

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },
}

export type GuidegramAPI = typeof guidegramAPI

contextBridge.exposeInMainWorld('guidegram', guidegramAPI)

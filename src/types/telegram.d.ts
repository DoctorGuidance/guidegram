import type { GuidegramAPI } from '../../electron/preload'
import type {
  AccountInfo,
  DialogItem,
  MessageItem,
  ProxyConfig,
  AppConfig,
  ForwardOptions,
} from '../../electron/telegram/types'

declare global {
  interface Window {
    guidegram: GuidegramAPI
  }
}

export type {
  AccountInfo,
  DialogItem,
  MessageItem,
  ProxyConfig,
  AppConfig,
  ForwardOptions,
}

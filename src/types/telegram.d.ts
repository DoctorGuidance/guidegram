import type { GuidegramAPI } from '../../electron/preload'
import type {
  AccountInfo,
  DialogItem,
  MessageItem,
  ProxyConfig,
  AppConfig,
  ForwardOptions,
  QrTokenPayload,
  InlineButton,
  ChatDetails,
  WebPagePreview,
  ReplyInfo,
  MessageEntityItem,
  MessageReactionItem,
  PinnedMessageItem,
  CloseAction,
  UpdateInfo,
  OpenFileDialogOptions,
  OpenFileDialogResult,
  SendMediaOptions,
  UploadProgressPayload,
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
  QrTokenPayload,
  InlineButton,
  ChatDetails,
  WebPagePreview,
  ReplyInfo,
  MessageEntityItem,
  MessageReactionItem,
  PinnedMessageItem,
  CloseAction,
  UpdateInfo,
  OpenFileDialogOptions,
  OpenFileDialogResult,
  SendMediaOptions,
  UploadProgressPayload,
}

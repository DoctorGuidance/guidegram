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
  LinkPreviewData,
  ReplyInfo,
  MessageEntityItem,
  MessageReactionItem,
  PinnedMessageItem,
  CloseAction,
  UpdateInfo,
  UpdateProgress,
  OpenFileDialogOptions,
  OpenFileDialogResult,
  SendMediaOptions,
  SendMessageOptions,
  UploadProgressPayload,
  DownloadProgressPayload,
  BotCallbackResult,
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
  LinkPreviewData,
  ReplyInfo,
  MessageEntityItem,
  MessageReactionItem,
  PinnedMessageItem,
  CloseAction,
  UpdateInfo,
  UpdateProgress,
  OpenFileDialogOptions,
  OpenFileDialogResult,
  SendMediaOptions,
  SendMessageOptions,
  UploadProgressPayload,
  DownloadProgressPayload,
  BotCallbackResult,
}

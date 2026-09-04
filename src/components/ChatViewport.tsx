import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Forward,
  EyeOff,
  Paperclip,
  Check,
  CheckCheck,
  Hash,
  Copy,
  Bookmark,
  Trash2,
  ExternalLink,
  Code,
} from 'lucide-react'
import { DialogItem, MessageItem } from '../types/telegram'

interface ChatViewportProps {
  chat: DialogItem | null
  messages: MessageItem[]
  ghostMode: boolean
  // 64Gram Fork Power Preferences
  showChatId?: boolean
  showMessageId?: boolean
  showSeconds?: boolean
  showSenderAvatar?: boolean
  quickForwardToSaved?: boolean
  alwaysDeleteBoth?: boolean
  copyCallbackData?: boolean
  onSendMessage: (text: string) => void
  onOpenDirectForward: (message: MessageItem) => void
  onQuickForwardToSaved?: (message: MessageItem) => void
  onDeleteMessage?: (message: MessageItem) => void
  onToggleGhostMode: () => void
  onSelectUserOrChat?: (target: string) => void
}

export const ChatViewport: React.FC<ChatViewportProps> = ({
  chat,
  messages,
  ghostMode,
  showChatId = true,
  showMessageId = true,
  showSeconds = true,
  showSenderAvatar = true,
  quickForwardToSaved = true,
  alwaysDeleteBoth = true,
  copyCallbackData = true,
  onSendMessage,
  onOpenDirectForward,
  onQuickForwardToSaved,
  onDeleteMessage,
  onToggleGhostMode,
  onSelectUserOrChat,
}) => {
  const [inputText, setInputText] = useState('')
  const [copiedChatId, setCopiedChatId] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null)
  const [hoveredMessage, setHoveredMessage] = useState<MessageItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast(msg)
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 2200)
  }

  // 64Gram Keyboard Shortcuts: Alt+F (Fast Forward) and Alt+C (Copy message text)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = selectedMessage || hoveredMessage
      if (!target) return

      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        onOpenDirectForward(target)
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        navigator.clipboard.writeText(target.text)
        showToast(`Copied text of message #${target.id}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMessage, hoveredMessage, onOpenDirectForward])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleCopyChatId = () => {
    if (!chat) return
    navigator.clipboard.writeText(chat.id)
    setCopiedChatId(true)
    showToast(`Copied Chat ID: ${chat.id}`)
    setTimeout(() => setCopiedChatId(false), 2000)
  }

  // 64Gram Feature: Format Message Timestamps with Seconds (HH:mm:ss)
  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: false,
    })
  }

  // 64Gram Feature: Clickable Mentions (@user), Deep links (tg://user?id=...), and URLs
  const renderMessageContent = (text: string) => {
    const regex = /(https?:\/\/[^\s]+|tg:\/\/[^\s]+|@[a-zA-Z0-9_]{3,32})/g
    const parts = text.split(regex)

    return parts.map((part, index) => {
      if (!part) return null

      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            onClick={(e) => {
              e.preventDefault()
              window.guidegram?.openExternal?.(part)
            }}
            className="text-accent-cyan underline hover:text-cyan-300 transition-colors break-all inline cursor-pointer"
            title={`Open ${part}`}
          >
            {part}
          </a>
        )
      }

      if (part.startsWith('tg://')) {
        return (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (part.includes('tg://user?id=')) {
                const id = part.replace('tg://user?id=', '')
                onSelectUserOrChat?.(id)
              } else {
                window.guidegram?.openExternal?.(part)
              }
            }}
            className="text-primary-300 font-mono hover:underline inline-flex items-center gap-0.5 cursor-pointer bg-white/5 px-1 rounded"
            title={`Telegram Deep Link: ${part}`}
          >
            {part}
          </button>
        )
      }

      if (part.startsWith('@')) {
        const username = part.slice(1)
        return (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectUserOrChat?.(username)
            }}
            className="text-accent-cyan font-semibold hover:underline inline cursor-pointer"
            title={`User profile: @${username}`}
          >
            {part}
          </button>
        )
      }

      return <span key={index}>{part}</span>
    })
  }

  if (!chat) {
    return (
      <div className="flex-1 bg-dark-900 flex flex-col items-center justify-center text-gray-500 gap-3">
        <div className="w-16 h-16 rounded-3xl bg-dark-800/80 border border-white/5 flex items-center justify-center text-gray-400">
          <Forward className="w-8 h-8" />
        </div>
        <div className="text-sm font-medium">Select a conversation to start chatting</div>
        <div className="text-xs text-gray-600">
          64Gram Power Client • Unlimited Accounts • Fast Forward (Alt+F)
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 bg-dark-900 flex flex-col h-full overflow-hidden select-none titlebar-no-drag">
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 right-6 z-40 px-4 py-2.5 rounded-2xl bg-dark-800/95 border border-primary-500/30 text-xs font-semibold text-white shadow-glow flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
          <Check className="w-4 h-4 text-accent-emerald shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Chat Header */}
      <div className="h-14 bg-dark-850/80 border-b border-white/5 px-4 flex items-center justify-between backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {chat.avatarInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-100">{chat.title}</span>
            </div>
            <div className="text-[11px] text-gray-400">
              {chat.isChannel
                ? 'Broadcast Channel'
                : chat.isGroup
                ? 'Group'
                : chat.isBot
                ? 'Bot'
                : 'Online'}
            </div>
          </div>
        </div>

        {/* Quick Action Tools */}
        <div className="flex items-center gap-2">
          {/* 64Gram Power Feature: Chat ID Badge with 1-Click Copy */}
          {showChatId && (
            <button
              onClick={handleCopyChatId}
              title="Click to copy numeric Chat ID"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer"
            >
              <Hash className="w-3.5 h-3.5 text-primary-400" />
              <span>ID: {chat.id}</span>
              {copiedChatId ? (
                <Check className="w-3 h-3 text-accent-emerald" />
              ) : (
                <Copy className="w-3 h-3 text-gray-500" />
              )}
            </button>
          )}

          {/* Ghost Mode Quick Toggle */}
          <button
            onClick={onToggleGhostMode}
            title={ghostMode ? 'Ghost Mode Active (No read receipt sent)' : 'Ghost Mode Off'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              ghostMode
                ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30'
                : 'bg-dark-800 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Ghost Mode: {ghostMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-500">
            No messages in this chat yet.
          </div>
        ) : (
          messages.map((msg) => {
            const isSelected = selectedMessage?.id === msg.id

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMessage(msg)}
                onMouseLeave={() => setHoveredMessage(null)}
                onClick={() => setSelectedMessage(isSelected ? null : msg)}
                className={`flex flex-col group ${
                  msg.isOutgoing ? 'items-end' : 'items-start'
                }`}
              >
                <div className="relative max-w-[75%] flex items-end gap-1.5">
                  {/* Outgoing Message Hover Action Bar */}
                  {msg.isOutgoing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity self-center bg-dark-850/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-md">
                      {/* 64Gram Quick Forward to Saved Messages */}
                      {quickForwardToSaved && onQuickForwardToSaved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onQuickForwardToSaved(msg)
                            showToast('Forwarded to Saved Messages!')
                          }}
                          title="Quick Forward to Saved Messages"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Direct Forward Modal (Alt+F) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDirectForward(msg)
                        }}
                        title="Direct Forward without Quote (Alt+F)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy Text (Alt+C) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(msg.text)
                          showToast(`Copied message #${msg.id} text`)
                        }}
                        title="Copy Text (Alt+C)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Message (alwaysDeleteBoth) */}
                      {onDeleteMessage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteMessage(msg)
                          }}
                          title={alwaysDeleteBoth ? 'Delete for everyone' : 'Delete message'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* 64Gram Feature: Group Sender Avatar */}
                  {!msg.isOutgoing && showSenderAvatar && chat.isGroup && (
                    <div
                      className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent-cyan/30 to-primary-600/30 text-white font-bold text-[10px] flex items-center justify-center shrink-0 self-end mb-1 border border-white/10 shadow-sm"
                      title={msg.senderName || 'Sender'}
                    >
                      {(msg.senderName || 'U').substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm transition-all ${
                      isSelected ? 'ring-2 ring-primary-400' : ''
                    } ${
                      msg.isOutgoing
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-dark-800 text-gray-200 border border-white/5 rounded-bl-sm'
                    }`}
                  >
                    {/* Group Sender Name */}
                    {!msg.isOutgoing && chat.isGroup && msg.senderName && (
                      <div className="text-[11px] font-bold text-accent-cyan mb-1">
                        {msg.senderName}
                      </div>
                    )}

                    {/* Forwarded Header Info */}
                    {msg.isForwarded && (
                      <div className="text-[10px] text-primary-200/90 font-medium mb-1 flex items-center gap-1">
                        <Forward className="w-3 h-3 inline" />
                        <span>Forwarded from {msg.forwardFromName || 'unknown'}</span>
                      </div>
                    )}

                    {/* Message Body with Clickable Links / Mentions */}
                    <div className="whitespace-pre-wrap break-words">
                      {renderMessageContent(msg.text)}
                    </div>

                    {/* 64Gram Inline Keyboard Buttons with Callback Data Inspection */}
                    {msg.replyMarkup && msg.replyMarkup.rows && msg.replyMarkup.rows.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                        {msg.replyMarkup.rows.map((row, rIdx) => (
                          <div key={rIdx} className="flex gap-1.5 flex-wrap">
                            {row.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (btn.url) {
                                    window.guidegram?.openExternal?.(btn.url)
                                  } else if (btn.data && copyCallbackData) {
                                    navigator.clipboard.writeText(btn.data)
                                    showToast(`Copied callback data: "${btn.data}"`)
                                  }
                                }}
                                onContextMenu={(e) => {
                                  if (btn.data && copyCallbackData) {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(btn.data)
                                    showToast(`Copied callback data: "${btn.data}"`)
                                  }
                                }}
                                title={
                                  btn.data
                                    ? `Callback data: "${btn.data}" (Click or Right-click to copy)`
                                    : btn.url
                                    ? `Open: ${btn.url}`
                                    : undefined
                                }
                                className="flex-1 min-w-[70px] px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-medium text-white transition-all flex items-center justify-center gap-1 border border-white/10 cursor-pointer"
                              >
                                <span>{btn.text}</span>
                                {btn.url && <ExternalLink className="w-3 h-3 text-gray-300" />}
                                {btn.data && copyCallbackData && (
                                  <span className="text-[9px] px-1 py-0.2 bg-black/40 rounded text-accent-cyan font-mono">
                                    DATA
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Footer: Message ID badge + Seconds Timestamp + Checkmarks */}
                    <div
                      className={`text-[10px] flex items-center justify-end gap-1.5 mt-1 ${
                        msg.isOutgoing ? 'text-primary-200' : 'text-gray-500'
                      }`}
                    >
                      {/* 64Gram Feature: Message ID Badge */}
                      {showMessageId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(msg.id.toString())
                            showToast(`Copied Message ID #${msg.id}`)
                          }}
                          title="Click to copy Message ID"
                          className="opacity-60 hover:opacity-100 px-1 py-0.2 rounded bg-black/20 hover:bg-black/40 font-mono transition-opacity flex items-center gap-0.5 cursor-pointer"
                        >
                          <Hash className="w-2.5 h-2.5" />
                          <span>{msg.id}</span>
                        </button>
                      )}

                      {/* Precise Timestamp with Seconds */}
                      <span>{formatMessageTime(msg.date)}</span>
                      {msg.isOutgoing && <CheckCheck className="w-3 h-3 inline" />}
                    </div>
                  </div>

                  {/* Incoming Message Hover Action Bar */}
                  {!msg.isOutgoing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity self-center bg-dark-850/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-md">
                      {/* 64Gram Quick Forward to Saved Messages */}
                      {quickForwardToSaved && onQuickForwardToSaved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onQuickForwardToSaved(msg)
                            showToast('Forwarded to Saved Messages!')
                          }}
                          title="Quick Forward to Saved Messages"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Direct Forward Modal (Alt+F) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDirectForward(msg)
                        }}
                        title="Direct Forward without Quote (Alt+F)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy Text (Alt+C) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(msg.text)
                          showToast(`Copied message #${msg.id} text`)
                        }}
                        title="Copy Text (Alt+C)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Message */}
                      {onDeleteMessage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteMessage(msg)
                          }}
                          title={alwaysDeleteBoth ? 'Delete for everyone' : 'Delete message'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-dark-850/60 border-t border-white/5 backdrop-blur-sm">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-200 rounded-xl hover:bg-dark-800 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder="Write a message... (Alt+F to forward selected, Alt+C to copy text)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-dark-800 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:hover:bg-primary-600 text-white rounded-xl transition-all shadow-glow flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

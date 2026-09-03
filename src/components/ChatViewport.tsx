import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Forward,
  EyeOff,
  MoreVertical,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
} from 'lucide-react'
import { DialogItem, MessageItem } from '../types/telegram'

interface ChatViewportProps {
  chat: DialogItem | null
  messages: MessageItem[]
  ghostMode: boolean
  onSendMessage: (text: string) => void
  onOpenDirectForward: (message: MessageItem) => void
  onToggleGhostMode: () => void
}

export const ChatViewport: React.FC<ChatViewportProps> = ({
  chat,
  messages,
  ghostMode,
  onSendMessage,
  onOpenDirectForward,
  onToggleGhostMode,
}) => {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
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
          Manage unlimited accounts & forward directly without quotes
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-dark-900 flex flex-col h-full overflow-hidden select-none titlebar-no-drag">
      {/* Chat Header */}
      <div className="h-14 bg-dark-850/80 border-b border-white/5 px-4 flex items-center justify-between backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {chat.avatarInitials}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-100">{chat.title}</div>
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
          {/* Ghost Mode Quick Toggle */}
          <button
            onClick={onToggleGhostMode}
            title={ghostMode ? 'Ghost Mode Active (No read receipt sent)' : 'Ghost Mode Off'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
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
            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${
                  msg.isOutgoing ? 'items-end' : 'items-start'
                }`}
              >
                <div className="relative max-w-[75%] flex items-end gap-1.5">
                  {/* Direct Forward Shortcut Button (Telegraph feature!) */}
                  <button
                    onClick={() => onOpenDirectForward(msg)}
                    title="Direct Forward (Without Quote / Silent)"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-dark-750 text-gray-400 hover:text-white transition-opacity shadow-sm"
                  >
                    <Forward className="w-3.5 h-3.5" />
                  </button>

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                      msg.isOutgoing
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-dark-800 text-gray-200 border border-white/5 rounded-bl-sm'
                    }`}
                  >
                    {/* Forwarded Header Info if present */}
                    {msg.isForwarded && (
                      <div className="text-[10px] text-primary-200/90 font-medium mb-1 flex items-center gap-1">
                        <Forward className="w-3 h-3 inline" />
                        <span>Forwarded from {msg.forwardFromName || 'unknown'}</span>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                    {/* Message Footer: Timestamp + Checkmarks */}
                    <div
                      className={`text-[10px] flex items-center justify-end gap-1 mt-1 ${
                        msg.isOutgoing ? 'text-primary-200' : 'text-gray-500'
                      }`}
                    >
                      <span>{formatMessageTime(msg.date)}</span>
                      {msg.isOutgoing && <CheckCheck className="w-3 h-3 inline" />}
                    </div>
                  </div>
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
            placeholder="Write a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-dark-800 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:hover:bg-primary-600 text-white rounded-xl transition-all shadow-glow flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

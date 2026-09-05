import React, { useState, useEffect } from 'react'
import { X, Forward, Check, EyeOff, VolumeX, Bookmark } from 'lucide-react'
import { DialogItem, MessageItem } from '../types/telegram'

interface DirectForwardModalProps {
  isOpen: boolean
  message: MessageItem | null
  dialogs: DialogItem[]
  onClose: () => void
  onForward: (targetChatIds: string[], withoutQuote: boolean, silent: boolean) => Promise<void>
}

export const DirectForwardModal: React.FC<DirectForwardModalProps> = ({
  isOpen,
  message,
  dialogs,
  onClose,
  onForward,
}) => {
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set())
  const [withoutQuote, setWithoutQuote] = useState(true) // Default true (Telegraph style)
  const [silent, setSilent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedChatIds(new Set())
      setSearch('')
      setLoading(false)
    }
  }, [isOpen, message])

  if (!isOpen || !message) return null

  const handleToggleChat = (chatId: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev)
      if (next.has(chatId)) {
        next.delete(chatId)
      } else {
        next.add(chatId)
      }
      return next
    })
  }

  const handleForward = async () => {
    if (selectedChatIds.size === 0) return
    setLoading(true)
    try {
      await onForward(Array.from(selectedChatIds), withoutQuote, silent)
      onClose()
    } catch (err) {
      console.error('Failed to forward:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = dialogs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <Forward className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100">Multi-Chat Direct Forward</div>
              <div className="text-[10px] text-gray-400">Select one or multiple destination chats</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="px-5 py-3 bg-dark-850/70 border-b border-white/5">
          <div className="text-[11px] text-gray-400 mb-1">Original Message:</div>
          <div className="text-xs text-gray-200 line-clamp-2 bg-dark-800 p-2.5 rounded-xl border border-white/5">
            {message.text || '[Media content]'}
          </div>
        </div>

        {/* Telegraph Options (Without Quote / Silent) */}
        <div className="px-5 py-3 border-b border-white/10 space-y-2 bg-dark-900/40">
          <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
            Forwarding Options
          </div>

          <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <EyeOff className="w-4 h-4 text-primary-400" />
              <div>
                <div className="text-xs font-semibold text-gray-200">
                  Forward Without Quote (Direct Forward)
                </div>
                <div className="text-[10px] text-gray-400">
                  Removes the original sender & channel name
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={withoutQuote}
              onChange={(e) => setWithoutQuote(e.target.checked)}
              className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <VolumeX className="w-4 h-4 text-accent-amber" />
              <div>
                <div className="text-xs font-semibold text-gray-200">Send Silently</div>
                <div className="text-[10px] text-gray-400">
                  Recipient receives message without notification sound
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={silent}
              onChange={(e) => setSilent(e.target.checked)}
              className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Target Chat Selection */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <input
              type="text"
              placeholder="Search destination chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-dark-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
            />
            {selectedChatIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedChatIds(new Set())}
                className="text-[11px] text-accent-cyan hover:underline shrink-0 px-2 cursor-pointer"
              >
                Clear ({selectedChatIds.size})
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {(!search || 'saved messages'.includes(search.toLowerCase())) && (
              <div
                onClick={() => handleToggleChat('me')}
                className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs border ${
                  selectedChatIds.has('me')
                    ? 'bg-primary-600/20 border-primary-500/40 text-white'
                    : 'bg-dark-850/50 hover:bg-dark-800 border-white/5 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0">
                    <Bookmark className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-medium">Saved Messages</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                    selectedChatIds.has('me')
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'border-white/20 bg-dark-900/60'
                  }`}
                >
                  {selectedChatIds.has('me') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            )}
            {filtered.map((d) => {
              const isSelected = selectedChatIds.has(d.id)
              return (
                <div
                  key={d.id}
                  onClick={() => handleToggleChat(d.id)}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs border ${
                    isSelected
                      ? 'bg-primary-600/20 border-primary-500/40 text-white'
                      : 'bg-dark-850/50 hover:bg-dark-800 border-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-dark-800 text-gray-400 flex items-center justify-center font-bold text-[11px] shrink-0 border border-white/5">
                      {d.avatarInitials || d.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.title}</div>
                      {d.username && (
                        <div className="text-[10px] text-gray-500 truncate">@{d.username}</div>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'border-white/20 bg-dark-900/60'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2 bg-dark-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleForward}
            disabled={selectedChatIds.size === 0 || loading}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white shadow-glow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Forward className="w-3.5 h-3.5" />
            <span>
              {loading
                ? 'Forwarding...'
                : selectedChatIds.size > 1
                ? `Forward to ${selectedChatIds.size} chats`
                : selectedChatIds.size === 1
                ? 'Forward Now'
                : 'Select Chats'}
            </span>
            {selectedChatIds.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                {selectedChatIds.size}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

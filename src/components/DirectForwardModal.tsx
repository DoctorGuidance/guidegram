import React, { useState } from 'react'
import { X, Forward, Check, EyeOff, VolumeX, ShieldAlert } from 'lucide-react'
import { DialogItem, MessageItem } from '../types/telegram'

interface DirectForwardModalProps {
  isOpen: boolean
  message: MessageItem | null
  dialogs: DialogItem[]
  onClose: () => void
  onForward: (targetChatId: string, withoutQuote: boolean, silent: boolean) => Promise<void>
}

export const DirectForwardModal: React.FC<DirectForwardModalProps> = ({
  isOpen,
  message,
  dialogs,
  onClose,
  onForward,
}) => {
  const [selectedChatId, setSelectedChatId] = useState<string>('')
  const [withoutQuote, setWithoutQuote] = useState(true) // Default true (Telegraph style)
  const [silent, setSilent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  if (!isOpen || !message) return null

  const handleForward = async () => {
    if (!selectedChatId) return
    setLoading(true)
    try {
      await onForward(selectedChatId, withoutQuote, silent)
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
            <div className="text-sm font-bold text-gray-100">Direct / Silent Forward</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
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
                  Forward Without Quote (بدون نقل قول)
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
              className="w-4 h-4 accent-primary-600 rounded"
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
              className="w-4 h-4 accent-primary-600 rounded"
            />
          </label>
        </div>

        {/* Target Chat Selection */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          <input
            type="text"
            placeholder="Search destination chat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 mb-2"
          />

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filtered.map((d) => {
              const isSelected = selectedChatId === d.id
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedChatId(d.id)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-dark-800 text-gray-300'
                  }`}
                >
                  <div className="truncate font-medium">{d.title}</div>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2 bg-dark-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleForward}
            disabled={!selectedChatId || loading}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white shadow-glow transition-all flex items-center gap-1.5"
          >
            <Forward className="w-3.5 h-3.5" />
            <span>{loading ? 'Sending...' : 'Forward Now'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

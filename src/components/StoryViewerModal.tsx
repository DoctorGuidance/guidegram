import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, EyeOff, Calendar, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { PeerStoriesPayload, StoryItemPayload } from '../types/telegram'

interface StoryViewerModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  peerId: string
  peerTitle: string
  ghostMode: boolean
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  accountId,
  peerId,
  peerTitle,
  ghostMode,
}) => {
  const [peerStories, setPeerStories] = useState<PeerStoriesPayload | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !accountId || !peerId) return
    let active = true
    setLoading(true)

    window.guidegram
      ?.getPeerStories?.(accountId, peerId)
      .then((data) => {
        if (!active) return
        setPeerStories(data)
        setCurrentIndex(0)

        // Mark as read only if NOT in Ghost Mode
        if (data && data.stories.length > 0 && !ghostMode) {
          window.guidegram?.readStories?.(accountId, peerId, data.stories[0].id).catch(() => {})
        }
      })
      .catch((err) => {
        console.error('Failed to load stories:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, accountId, peerId, ghostMode])

  // Handle advancing stories and stealth read logic
  const handleNext = () => {
    if (!peerStories || currentIndex >= peerStories.stories.length - 1) {
      onClose()
      return
    }
    const nextIdx = currentIndex + 1
    setCurrentIndex(nextIdx)
    if (!ghostMode && peerStories.stories[nextIdx]) {
      window.guidegram?.readStories?.(accountId, peerId, peerStories.stories[nextIdx].id).catch(() => {})
    }
  }

  const handlePrev = () => {
    if (currentIndex <= 0) return
    setCurrentIndex((prev) => prev - 1)
  }

  if (!isOpen) return null

  const stories = peerStories?.stories || []
  const currentStory: StoryItemPayload | undefined = stories[currentIndex]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm h-[640px] bg-dark-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
      >
        {/* Top Header & Progress Segments */}
        <div className="p-4 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-3">
          {/* Progress Bars */}
          <div className="flex items-center gap-1.5 w-full">
            {stories.map((s, idx) => (
              <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    idx < currentIndex
                      ? 'w-full bg-white'
                      : idx === currentIndex
                      ? 'w-full bg-primary-400'
                      : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* User Info & Ghost Badge */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                {peerTitle.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight truncate max-w-[140px]">{peerTitle}</h4>
                {currentStory && (
                  <span className="text-[10px] text-gray-400">
                    {new Date(currentStory.date * 1000).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {ghostMode && (
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-violet/20 border border-accent-violet/40 text-accent-violet text-[10px] font-semibold"
                  title="Ghost Mode Active: View stealthily without sender knowing"
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Stealth</span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/40 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Content Area */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading story...</span>
            </div>
          ) : !currentStory ? (
            <div className="text-center text-gray-400 text-xs px-4">
              No active stories found for this contact.
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-dark-950 p-6">
              {/* Tap to Navigate Left / Right zones */}
              <div
                onClick={handlePrev}
                className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer"
              />
              <div
                onClick={handleNext}
                className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-pointer"
              />

              {/* Story Content Mock/Placeholder or Caption display */}
              <div className="flex flex-col items-center text-center gap-4 max-w-xs z-0">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary-500/30 to-accent-cyan/30 border border-white/10 flex items-center justify-center text-primary-400">
                  <Sparkles className="w-10 h-10" />
                </div>
                {currentStory.caption ? (
                  <p className="text-sm font-medium text-white leading-relaxed">
                    {currentStory.caption}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    {currentStory.isVideo ? 'Video Story' : 'Photo Story'} #{currentStory.id}
                  </p>
                )}
                <span className="text-[10px] text-gray-500 font-mono">
                  Expires: {new Date(currentStory.expireDate * 1000).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Arrows at sides */}
        {stories.length > 1 && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-20">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`p-2 rounded-full bg-black/50 text-white backdrop-blur pointer-events-auto transition-opacity ${
                currentIndex === 0 ? 'opacity-0 cursor-default' : 'opacity-80 hover:opacity-100 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-full bg-black/50 text-white backdrop-blur pointer-events-auto opacity-80 hover:opacity-100 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Bottom Bar: Ghost Stealth Notice */}
        <div className="p-4 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-accent-violet" />
            <span className="text-[11px] text-gray-400">
              {ghostMode
                ? 'Ghost Mode: Sender will NOT see you in their viewer list'
                : 'Normal Mode: View recorded on Telegram'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

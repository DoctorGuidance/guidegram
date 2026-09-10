import React from 'react'
import { Hash, MessageSquare, Layers, Pin, Lock } from 'lucide-react'
import { ForumTopicItem } from '../types/telegram'
import { isRTL } from '../utils/textUtils'

interface ForumTopicsBarProps {
  topics: ForumTopicItem[]
  activeTopicId: number | null
  onSelectTopic: (topicId: number | null) => void
}

export const ForumTopicsBar: React.FC<ForumTopicsBarProps> = ({
  topics,
  activeTopicId,
  onSelectTopic,
}) => {
  if (!topics || topics.length === 0) return null

  return (
    <div className="h-10 shrink-0 bg-dark-900/90 border-b border-white/5 px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none z-10 backdrop-blur-md">
      {/* "All Topics" Chip */}
      <button
        type="button"
        onClick={() => onSelectTopic(null)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
          activeTopicId === null
            ? 'bg-primary-600 text-white shadow-glow'
            : 'bg-dark-800/80 text-gray-400 hover:text-gray-200 hover:bg-dark-750 border border-white/5'
        }`}
      >
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span>All Topics</span>
      </button>

      {/* Individual Topic Chips */}
      {topics.map((topic) => {
        const isActive = activeTopicId === topic.id
        const rtl = isRTL(topic.title)

        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelectTopic(topic.id)}
            dir={rtl ? 'rtl' : 'ltr'}
            title={`${topic.title} • ${topic.unreadCount || 0} unread`}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer max-w-[200px] truncate ${
              isActive
                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-glow'
                : 'bg-dark-800/80 text-gray-300 hover:text-white hover:bg-dark-750 border border-white/5'
            }`}
          >
            {topic.isPinned ? (
              <Pin className="w-3 h-3 text-amber-400 shrink-0" />
            ) : topic.isClosed ? (
              <Lock className="w-3 h-3 text-gray-500 shrink-0" />
            ) : (
              <Hash className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            )}

            <span className="truncate">{topic.title}</span>

            {topic.unreadCount && topic.unreadCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-primary-500 text-white text-[9px] font-bold shrink-0">
                {topic.unreadCount}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

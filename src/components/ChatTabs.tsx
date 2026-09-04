import React from 'react'
import { MessageSquare, Users, Radio, Bot, BellRing, Layers, CheckCheck } from 'lucide-react'

export type TabCategory = 'all' | 'users' | 'groups' | 'channels' | 'bots' | 'unread'

interface ChatTabsProps {
  activeTab: TabCategory
  onTabChange: (tab: TabCategory) => void
  unreadCounts: Record<TabCategory, number>
  markAllReadEnabled?: boolean
  onMarkAllAsRead?: () => Promise<boolean> | void
}

export const ChatTabs: React.FC<ChatTabsProps> = ({
  activeTab,
  onTabChange,
  unreadCounts,
  markAllReadEnabled = true,
  onMarkAllAsRead,
}) => {
  const [isMarking, setIsMarking] = React.useState(false)

  const tabs: { id: TabCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'users', label: 'Personal', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'groups', label: 'Groups', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'channels', label: 'Channels', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'bots', label: 'Bots', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'unread', label: 'Unread', icon: <BellRing className="w-3.5 h-3.5" /> },
  ]

  const totalUnread = unreadCounts.all || 0

  const handleMarkAll = async () => {
    if (!onMarkAllAsRead || isMarking) return
    setIsMarking(true)
    try {
      await onMarkAllAsRead()
    } finally {
      setIsMarking(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-none titlebar-no-drag">
      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const count = unreadCounts[tab.id] || 0

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-primary-500 text-white' : 'bg-dark-750 text-gray-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 64Gram Power Feature: Mark All Chats As Read */}
      {markAllReadEnabled && onMarkAllAsRead && totalUnread > 0 && (
        <button
          onClick={handleMarkAll}
          disabled={isMarking}
          title="Mark all dialogs as read"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-accent-cyan hover:text-white bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCheck className={`w-3.5 h-3.5 ${isMarking ? 'animate-pulse text-gray-400' : ''}`} />
          <span className="text-[11px] hidden sm:inline">
            {isMarking ? 'Marking...' : 'Mark All Read'}
          </span>
        </button>
      )}
    </div>
  )
}

import React from 'react'
import { MessageSquare, Users, Radio, Bot, BellRing, Layers } from 'lucide-react'

export type TabCategory = 'all' | 'users' | 'groups' | 'channels' | 'bots' | 'unread'

interface ChatTabsProps {
  activeTab: TabCategory
  onTabChange: (tab: TabCategory) => void
  unreadCounts: Record<TabCategory, number>
}

export const ChatTabs: React.FC<ChatTabsProps> = ({
  activeTab,
  onTabChange,
  unreadCounts,
}) => {
  const tabs: { id: TabCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'users', label: 'Personal', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'groups', label: 'Groups', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'channels', label: 'Channels', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'bots', label: 'Bots', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'unread', label: 'Unread', icon: <BellRing className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-none titlebar-no-drag">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const count = unreadCounts[tab.id] || 0

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
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
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-750 text-gray-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

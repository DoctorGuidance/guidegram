import React from 'react'
import { Search, Pin, ShieldCheck } from 'lucide-react'
import { DialogItem, AccountInfo } from '../types/telegram'
import { TabCategory } from './ChatTabs'

interface ChatListProps {
  account: AccountInfo | null
  dialogs: DialogItem[]
  activeChatId: string | null
  activeTab: TabCategory
  searchQuery: string
  showChatId?: boolean
  onSearchChange: (query: string) => void
  onSelectChat: (chatId: string) => void
}

export const ChatList: React.FC<ChatListProps> = ({
  account,
  dialogs,
  activeChatId,
  activeTab,
  searchQuery,
  showChatId = true,
  onSearchChange,
  onSelectChat,
}) => {
  // Filter dialogs based on active tab & search query
  const filteredDialogs = dialogs.filter((dialog) => {
    // Search match
    if (
      searchQuery.trim() &&
      !dialog.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !dialog.lastMessageText?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !dialog.id.includes(searchQuery.trim())
    ) {
      return false
    }

    // Tab category match
    if (activeTab === 'users' && !dialog.isUser) return false
    if (activeTab === 'groups' && !dialog.isGroup) return false
    if (activeTab === 'channels' && !dialog.isChannel) return false
    if (activeTab === 'bots' && !dialog.isBot) return false
    if (activeTab === 'unread' && dialog.unreadCount === 0) return false

    return true
  })

  // Format time (e.g. 14:20 or Yesterday)
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="w-80 bg-dark-850 border-r border-white/5 flex flex-col h-full select-none titlebar-no-drag">
      {/* Account Info Bar */}
      {account && (
        <div className="px-4 py-3 bg-dark-900/60 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-primary-600/30 text-primary-400 font-bold text-xs flex items-center justify-center border border-primary-500/20">
              {(account.firstName || 'U').charAt(0)}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-gray-200 truncate">
                {account.firstName || 'User'} {account.lastName || ''}
              </div>
              <div className="text-[11px] text-gray-400 truncate">{account.phone || ''}</div>
            </div>
          </div>

          {account.proxyConfig?.enabled && (
            <div
              title={`Protected by ${account.proxyConfig.type.toUpperCase()} Proxy`}
              className="flex items-center gap-1 bg-accent-cyan/10 text-accent-cyan px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-accent-cyan/20"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Proxy</span>
            </div>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chats, IDs, groups..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-dark-800 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Dialogs List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filteredDialogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-xs gap-2">
            <div>No chats found</div>
          </div>
        ) : (
          filteredDialogs.map((dialog) => {
            const isSelected = dialog.id === activeChatId

            return (
              <div
                key={dialog.id}
                onClick={() => onSelectChat(dialog.id)}
                className={`p-2.5 rounded-2xl cursor-pointer flex items-center gap-3 transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'hover:bg-dark-800/70 text-gray-300'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-dark-750 text-gray-300 border border-white/5'
                  }`}
                >
                  {dialog.avatarInitials}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-gray-200'
                        }`}
                      >
                        {dialog.title}
                      </span>
                      {showChatId && (
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-dark-900 text-gray-500 border border-white/5'
                          }`}
                        >
                          #{dialog.id}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] shrink-0 ml-1 ${
                        isSelected ? 'text-primary-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(dialog.lastMessageDate)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div
                      className={`text-xs truncate ${
                        isSelected ? 'text-primary-100' : 'text-gray-400'
                      }`}
                    >
                      {dialog.lastMessageText || 'No messages'}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {dialog.isPinned && (
                        <Pin
                          className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-gray-500'}`}
                        />
                      )}
                      {dialog.unreadCount > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-white text-primary-600'
                              : 'bg-primary-600 text-white'
                          }`}
                        >
                          {dialog.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

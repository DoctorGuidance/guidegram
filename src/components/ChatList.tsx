import React, { useState, useEffect } from 'react'
import { Search, Pin, ShieldCheck, X, Clock, Trash2 } from 'lucide-react'
import { DialogItem, AccountInfo } from '../types/telegram'
import { TabCategory } from './ChatTabs'
import { Avatar } from './Avatar'
import { isRTL } from '../utils/textUtils'

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
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('guidegram_recent_searches')
      return saved ? JSON.parse(saved) : []
    } catch (_) {
      return []
    }
  })

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8)
    setRecentSearches(updated)
    try {
      localStorage.setItem('guidegram_recent_searches', JSON.stringify(updated))
    } catch (_) {}
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem('guidegram_recent_searches')
    } catch (_) {}
  }

  // Filter dialogs based on active tab & search query
  const cleanQuery = searchQuery.trim().toLowerCase().replace(/^@/, '')
  const filteredDialogs = dialogs.filter((dialog) => {
    // Search match
    if (cleanQuery) {
      const matchTitle = dialog.title.toLowerCase().includes(cleanQuery)
      const matchMsg = dialog.lastMessageText?.toLowerCase().includes(cleanQuery)
      const matchId = dialog.id.includes(cleanQuery)
      if (!matchTitle && !matchMsg && !matchId) {
        return false
      }
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
    <div className="w-full flex-1 min-h-0 bg-dark-850 flex flex-col select-none titlebar-no-drag">
      {/* Account Info Bar */}
      {account && (
        <div className="px-3.5 py-2.5 bg-dark-900/60 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar
              accountId={account.id}
              peerId={account.id}
              title={account.firstName || 'User'}
              initials={(account.firstName || 'U').charAt(0)}
              avatarUrl={account.avatarUrl}
              size="sm"
            />
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
              className="flex items-center gap-1 bg-accent-cyan/10 text-accent-cyan px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-accent-cyan/20 shrink-0"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Proxy</span>
            </div>
          )}
        </div>
      )}

      {/* Search Input with Clear button and Recent Searches */}
      <div className="p-2.5 shrink-0 relative">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chats, IDs, groups..."
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                saveRecentSearch(searchQuery.trim())
              }
            }}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-dark-800 border border-white/5 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Recent Searches Overlay Popover */}
        {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
          <div className="absolute left-2.5 right-2.5 top-full z-40 mt-1 bg-dark-900 border border-white/10 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold px-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary-400" />
                <span>Recent Searches</span>
              </span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  clearRecentSearches()
                }}
                className="text-gray-500 hover:text-accent-rose text-[10px] transition-colors cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onSearchChange(item)
                    saveRecentSearch(item)
                  }}
                  className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-primary-600/20 text-gray-300 hover:text-primary-300 border border-white/5 hover:border-primary-500/30 text-[11px] transition-colors cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {filteredDialogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-xs gap-2">
            <div>No chats found</div>
          </div>
        ) : (
          filteredDialogs.map((dialog) => {
            const isSelected = dialog.id === activeChatId
            const titleRtl = isRTL(dialog.title)
            const textRtl = isRTL(dialog.lastMessageText)

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
                {/* Real Avatar */}
                <Avatar
                  accountId={dialog.accountId}
                  peerId={dialog.id}
                  title={dialog.title}
                  initials={dialog.avatarInitials}
                  avatarUrl={dialog.avatarUrl}
                  size="md"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        dir={titleRtl ? 'rtl' : 'ltr'}
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-gray-200'
                        } ${titleRtl ? 'text-right' : 'text-left'}`}
                      >
                        {dialog.title}
                      </span>
                      {showChatId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(dialog.id)
                          }}
                          title={`Click to copy Chat ID #${dialog.id}`}
                          className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/20 text-white hover:bg-white/30'
                              : 'bg-dark-900 text-gray-400 hover:text-white border border-white/5 hover:border-white/20'
                          }`}
                        >
                          #{dialog.id}
                        </button>
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
                      dir={textRtl ? 'rtl' : 'ltr'}
                      className={`text-xs truncate ${
                        isSelected ? 'text-primary-100' : 'text-gray-400'
                      } ${textRtl ? 'text-right' : 'text-left'}`}
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

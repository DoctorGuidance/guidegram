import React, { useState, useEffect } from 'react'
import { TitleBar } from './components/TitleBar'
import { WelcomeScreen } from './components/WelcomeScreen'
import { AccountDock } from './components/AccountDock'
import { ChatTabs, TabCategory } from './components/ChatTabs'
import { ChatList } from './components/ChatList'
import { ChatViewport } from './components/ChatViewport'
import { DirectForwardModal } from './components/DirectForwardModal'
import { AddAccountModal } from './components/AddAccountModal'
import { ProxySettingsModal } from './components/ProxySettingsModal'
import { SettingsModal } from './components/SettingsModal'
import { UnifiedInbox } from './components/UnifiedInbox'
import { AccountInfo, DialogItem, MessageItem } from './types/telegram'

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [dialogsByAccount, setDialogsByAccount] = useState<Record<string, DialogItem[]>>({})
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messagesByChat, setMessagesByChat] = useState<Record<string, MessageItem[]>>({})

  const [activeTab, setActiveTab] = useState<TabCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [ghostMode, setGhostMode] = useState(false)

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUnifiedInboxOpen, setIsUnifiedInboxOpen] = useState(false)
  const [forwardMessage, setForwardMessage] = useState<MessageItem | null>(null)

  // Initial Data Load
  useEffect(() => {
    const initApp = async () => {
      try {
        if (window.guidegram) {
          const accs = await window.guidegram.getAccounts()
          setAccounts(accs || [])

          if (accs && accs.length > 0) {
            setActiveAccountId(accs[0].id)
            loadDialogsForAccount(accs[0].id)
          }

          const cfg = await window.guidegram.getConfig()
          if (cfg) {
            setGhostMode(cfg.ghostMode || false)
          }
        }
      } catch (err) {
        console.error('App init error:', err)
      } finally {
        setIsLoaded(true)
      }
    }

    initApp()

    // Realtime new-message listener
    if (window.guidegram?.on) {
      const unsubscribe = window.guidegram.on('telegram:new-message', (payload: any) => {
        const { accountId, chatId, message } = payload
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), message],
        }))
        if (chatId !== activeChatId) {
          setDialogsByAccount((prev) => {
            const list = prev[accountId] || []
            return {
              ...prev,
              [accountId]: list.map((d) =>
                d.id === chatId ? { ...d, unreadCount: d.unreadCount + 1, lastMessageText: message.text } : d
              ),
            }
          })
        }
      })

      return () => {
        unsubscribe?.()
      }
    }
  }, [])

  const loadDialogsForAccount = async (accountId: string) => {
    if (!window.guidegram?.getDialogs) return
    try {
      const dialogs = await window.guidegram.getDialogs(accountId)
      setDialogsByAccount((prev) => ({ ...prev, [accountId]: dialogs }))
      if (dialogs.length > 0 && !activeChatId) {
        setActiveChatId(dialogs[0].id)
        loadMessages(accountId, dialogs[0].id)
      }
    } catch (err) {
      console.error('Failed to load dialogs:', err)
    }
  }

  const loadMessages = async (accountId: string, chatId: string) => {
    if (!window.guidegram?.getMessages) return
    try {
      const msgs = await window.guidegram.getMessages(accountId, chatId, 40)
      setMessagesByChat((prev) => ({ ...prev, [chatId]: msgs }))
      window.guidegram.markAsRead(accountId, chatId)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  const handleSelectAccount = (accountId: string) => {
    setActiveAccountId(accountId)
    setIsUnifiedInboxOpen(false)
    setActiveChatId(null)
    loadDialogsForAccount(accountId)
  }

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    if (activeAccountId) {
      loadMessages(activeAccountId, chatId)
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!activeAccountId || !activeChatId || !window.guidegram) return
    try {
      const sent = await window.guidegram.sendMessage(activeAccountId, activeChatId, text)
      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), sent],
      }))
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const handleDirectForward = async (
    targetChatId: string,
    withoutQuote: boolean,
    silent: boolean
  ) => {
    if (!activeAccountId || !forwardMessage || !window.guidegram) return
    await window.guidegram.forwardMessages(
      activeAccountId,
      targetChatId,
      forwardMessage.chatId,
      [forwardMessage.id],
      { withoutQuote, silent }
    )
  }

  const handleToggleGhostMode = async () => {
    const next = !ghostMode
    setGhostMode(next)
    await window.guidegram?.updateConfig({ ghostMode: next })
  }

  const handleAccountAdded = (newAccount: AccountInfo) => {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === newAccount.id)
      if (exists) {
        return prev.map((a) => (a.id === newAccount.id ? newAccount : a))
      }
      return [...prev, newAccount]
    })
    setActiveAccountId(newAccount.id)
    loadDialogsForAccount(newAccount.id)
  }

  const handleLogoutAccount = async (accountId: string) => {
    if (!window.guidegram) return
    await window.guidegram.logoutAccount(accountId)
    setAccounts((prev) => prev.filter((a) => a.id !== accountId))
    if (activeAccountId === accountId) {
      setActiveAccountId(null)
      setActiveChatId(null)
    }
  }

  const currentAccount = accounts.find((a) => a.id === activeAccountId) || null
  const currentDialogs = (activeAccountId && dialogsByAccount[activeAccountId]) || []
  const currentChat = currentDialogs.find((d) => d.id === activeChatId) || null
  const currentMessages = (activeChatId && messagesByChat[activeChatId]) || []

  // Compute unread counts for tabs
  const unreadCounts: Record<TabCategory, number> = {
    all: currentDialogs.reduce((acc, d) => acc + d.unreadCount, 0),
    users: currentDialogs.filter((d) => d.isUser).reduce((acc, d) => acc + d.unreadCount, 0),
    groups: currentDialogs.filter((d) => d.isGroup).reduce((acc, d) => acc + d.unreadCount, 0),
    channels: currentDialogs.filter((d) => d.isChannel).reduce((acc, d) => acc + d.unreadCount, 0),
    bots: currentDialogs.filter((d) => d.isBot).reduce((acc, d) => acc + d.unreadCount, 0),
    unread: currentDialogs.filter((d) => d.unreadCount > 0).length,
  }

  // Smooth Loading Splash
  if (!isLoaded) {
    return (
      <div className="h-screen w-screen bg-dark-950 flex flex-col items-center justify-center text-white select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center shadow-glow mb-4 animate-pulse">
          <span className="text-2xl font-black">G</span>
        </div>
        <div className="text-xs font-semibold text-gray-400">Loading Guidegram...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-950 font-sans">
      {/* 1. Integrated Custom TitleBar (No Windows DWM black screen bugs) */}
      <TitleBar activeAccount={currentAccount} ghostMode={ghostMode} />

      {/* 2. Main Content: Welcome Screen (when no accounts) OR Active Multi-Account Workspace */}
      {accounts.length === 0 ? (
        <WelcomeScreen
          onOpenAddAccount={() => setIsAddAccountOpen(true)}
          onOpenProxyModal={() => setIsProxyModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : isUnifiedInboxOpen ? (
        <div className="flex flex-1 overflow-hidden">
          <AccountDock
            accounts={accounts}
            activeAccountId={activeAccountId}
            isUnifiedInboxOpen={isUnifiedInboxOpen}
            onSelectAccount={handleSelectAccount}
            onOpenAddAccount={() => setIsAddAccountOpen(true)}
            onToggleUnifiedInbox={() => setIsUnifiedInboxOpen(!isUnifiedInboxOpen)}
            onOpenProxyModal={() => setIsProxyModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          <UnifiedInbox
            accounts={accounts}
            allDialogs={dialogsByAccount}
            onSelectAccountAndChat={(accId, chatId) => {
              setActiveAccountId(accId)
              setIsUnifiedInboxOpen(false)
              setActiveChatId(chatId)
              loadMessages(accId, chatId)
            }}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Vertical Multi-Account Dock */}
          <AccountDock
            accounts={accounts}
            activeAccountId={activeAccountId}
            isUnifiedInboxOpen={isUnifiedInboxOpen}
            onSelectAccount={handleSelectAccount}
            onOpenAddAccount={() => setIsAddAccountOpen(true)}
            onToggleUnifiedInbox={() => setIsUnifiedInboxOpen(!isUnifiedInboxOpen)}
            onOpenProxyModal={() => setIsProxyModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Chat List Column with Telegraph Tabs */}
          <div className="flex flex-col border-r border-white/5 h-full">
            <ChatTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unreadCounts={unreadCounts}
            />
            <ChatList
              account={currentAccount}
              dialogs={currentDialogs}
              activeChatId={activeChatId}
              activeTab={activeTab}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectChat={handleSelectChat}
            />
          </div>

          {/* Active Conversation Viewport */}
          <ChatViewport
            chat={currentChat}
            messages={currentMessages}
            ghostMode={ghostMode}
            onSendMessage={handleSendMessage}
            onOpenDirectForward={(msg) => setForwardMessage(msg)}
            onToggleGhostMode={handleToggleGhostMode}
          />
        </div>
      )}

      {/* Modals */}
      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onAccountAdded={handleAccountAdded}
      />

      <DirectForwardModal
        isOpen={!!forwardMessage}
        message={forwardMessage}
        dialogs={currentDialogs}
        onClose={() => setForwardMessage(null)}
        onForward={handleDirectForward}
      />

      <ProxySettingsModal
        isOpen={isProxyModalOpen}
        accounts={accounts}
        onClose={() => setIsProxyModalOpen(false)}
        onUpdateAccountProxy={() => {}}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        accounts={accounts}
        onClose={() => setIsSettingsOpen(false)}
        onLogoutAccount={handleLogoutAccount}
      />
    </div>
  )
}

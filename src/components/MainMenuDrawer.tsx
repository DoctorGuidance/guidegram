import React, { useState } from 'react'
import {
  Bookmark,
  Users,
  Settings,
  ShieldCheck,
  Moon,
  Sun,
  UserPlus,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Check,
  Radio,
  Gift,
} from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import { Avatar } from './Avatar'
import { StarGiftsModal } from './StarGiftsModal'

interface MainMenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountInfo[]
  activeAccount: AccountInfo | null
  onSelectAccount: (accountId: string) => void
  onOpenAddAccount: () => void
  onOpenSettings: () => void
  onOpenProxyModal: () => void
  onOpenSavedMessages: () => void
  ghostMode: boolean
  onToggleGhostMode: () => void
}

export const MainMenuDrawer: React.FC<MainMenuDrawerProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  onSelectAccount,
  onOpenAddAccount,
  onOpenSettings,
  onOpenProxyModal,
  onOpenSavedMessages,
  ghostMode,
  onToggleGhostMode,
}) => {
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false)
  const [isStarGiftsOpen, setIsStarGiftsOpen] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-72 md:w-80 h-full bg-dark-900 border-r border-white/10 shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-left duration-200">
        {/* Profile Card Header */}
        <div className="p-4 bg-gradient-to-b from-dark-800 to-dark-850 border-b border-white/10 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {activeAccount && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Avatar
                  accountId={activeAccount.id}
                  peerId={activeAccount.id}
                  title={activeAccount.firstName || 'User'}
                  initials={(activeAccount.firstName || 'U').charAt(0)}
                  avatarUrl={activeAccount.avatarUrl}
                  size="lg"
                />

                {activeAccount.isPremium && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3" />
                    <span>Premium</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-100 truncate">
                    {activeAccount.firstName || 'Telegram User'} {activeAccount.lastName || ''}
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {activeAccount.phone || `@${activeAccount.username || activeAccount.id}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Switch accounts"
                >
                  {isAccountsExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expanded Accounts Switcher List */}
        {isAccountsExpanded && (
          <div className="p-2 bg-dark-950/70 border-b border-white/5 max-h-48 overflow-y-auto space-y-1 animate-in fade-in duration-150">
            {accounts.map((acc) => {
              const isActive = acc.id === activeAccount?.id
              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(acc.id)
                    setIsAccountsExpanded(false)
                  }}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isActive ? 'bg-primary-600/20 text-white border border-primary-500/30' : 'hover:bg-dark-800 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      accountId={acc.id}
                      peerId={acc.id}
                      title={acc.firstName || 'User'}
                      initials={(acc.firstName || 'U').charAt(0)}
                      avatarUrl={acc.avatarUrl}
                      size="sm"
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">{acc.firstName || 'Account'}</div>
                      <div className="text-[10px] text-gray-400 truncate">{acc.phone || ''}</div>
                    </div>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-primary-400 shrink-0" />}
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => {
                setIsAccountsExpanded(false)
                onClose()
                onOpenAddAccount()
              }}
              className="w-full mt-1 p-2 rounded-xl border border-dashed border-white/10 hover:border-primary-500/40 text-primary-400 hover:bg-primary-600/10 flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>
        )}

        {/* Navigation Menu Options */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {/* Saved Messages */}
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenSavedMessages()
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-gray-200 hover:text-white hover:bg-dark-800 transition-colors text-xs font-medium cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-600/20 text-primary-400 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Saved Messages</div>
              <div className="text-[10px] text-gray-400">Cloud Storage</div>
            </div>
          </button>

          {/* Star Gifts Shelf */}
          <button
            type="button"
            onClick={() => setIsStarGiftsOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-200 hover:text-white hover:bg-dark-800 transition-colors text-xs font-medium cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Star Gifts</div>
                <div className="text-[10px] text-gray-400">Telegram Stars Showcase</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
              Shelf
            </span>
          </button>

          {/* Proxy Manager */}
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenProxyModal()
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-gray-200 hover:text-white hover:bg-dark-800 transition-colors text-xs font-medium cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 text-accent-cyan flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Proxy Settings</div>
              <div className="text-[10px] text-gray-400">SOCKS5 / HTTP / MTProto</div>
            </div>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenSettings()
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-gray-200 hover:text-white hover:bg-dark-800 transition-colors text-xs font-medium cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 text-gray-300 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Settings</div>
              <div className="text-[10px] text-gray-400">Appearance, 64Gram Power, Cache</div>
            </div>
          </button>

          {/* Ghost Mode Toggle */}
          <button
            type="button"
            onClick={onToggleGhostMode}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-200 hover:text-white hover:bg-dark-800 transition-colors text-xs font-medium cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                ghostMode ? 'bg-accent-emerald/20 text-accent-emerald' : 'bg-white/10 text-gray-400'
              }`}>
                <Radio className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Ghost Mode</div>
                <div className="text-[10px] text-gray-400">Don't send read receipts</div>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${ghostMode ? 'bg-accent-emerald animate-pulse' : 'bg-gray-600'}`} />
          </button>
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 bg-dark-950 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
          <div>Guidegram Desktop v{__APP_VERSION__}</div>
          <div className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">Portable</div>
        </div>
      </div>

      {/* Star Gifts Modal */}
      {activeAccount && (
        <StarGiftsModal
          isOpen={isStarGiftsOpen}
          onClose={() => setIsStarGiftsOpen(false)}
          accountId={activeAccount.id}
          userName={activeAccount.firstName}
        />
      )}
    </div>
  )
}

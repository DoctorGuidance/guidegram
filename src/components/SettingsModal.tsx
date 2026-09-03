import React, { useState, useEffect } from 'react'
import {
  X,
  Settings,
  FolderLock,
  Key,
  EyeOff,
  LogOut,
  Save,
  Check,
  Copy,
} from 'lucide-react'
import { AppConfig, AccountInfo } from '../types/telegram'

interface SettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
  onClose: () => void
  onLogoutAccount: (accountId: string) => Promise<void>
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onLogoutAccount,
}) => {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [portablePath, setPortablePath] = useState('')
  const [apiId, setApiId] = useState<number>(2040)
  const [apiHash, setApiHash] = useState<string>('')
  const [ghostMode, setGhostMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.guidegram.getConfig().then((cfg) => {
        setConfig(cfg)
        setApiId(cfg.apiId)
        setApiHash(cfg.apiHash)
        setGhostMode(cfg.ghostMode)
      })
      window.guidegram.getPortableDataPath().then(setPortablePath)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    await window.guidegram.updateConfig({
      apiId: Number(apiId),
      apiHash: apiHash.trim(),
      ghostMode,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(portablePath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <Settings className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-gray-100">Guidegram Preferences</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Portable Storage Location Info */}
          <div className="p-3.5 rounded-2xl bg-dark-800/80 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
              <FolderLock className="w-4 h-4 text-accent-emerald" />
              <span>100% Portable Storage Location</span>
            </div>
            <div className="text-[11px] text-gray-400">
              All Telegram sessions, credentials, and settings are saved inside this folder.
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={portablePath}
                className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-300 font-mono"
              />
              <button
                onClick={handleCopyPath}
                className="p-2 rounded-xl bg-dark-750 hover:bg-dark-700 text-gray-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Ghost Mode Setting */}
          <div className="p-3.5 rounded-2xl bg-dark-800/80 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <EyeOff className="w-4 h-4 text-accent-violet" />
              <div>
                <div className="text-xs font-bold text-gray-200">Ghost Mode (حالت روح)</div>
                <div className="text-[11px] text-gray-400">
                  Read messages without sending read markers (ticks) to sender
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={ghostMode}
              onChange={(e) => setGhostMode(e.target.checked)}
              className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
            />
          </div>

          {/* Telegram API Credentials */}
          <div className="space-y-2.5 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
              <Key className="w-4 h-4 text-accent-amber" />
              <span>Telegram API ID & API Hash (my.telegram.org)</span>
            </div>
            <div className="text-[11px] text-gray-400">
              Guidegram comes with default keys, but you can provide your own dedicated app credentials.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">API ID</label>
                <input
                  type="number"
                  value={apiId}
                  onChange={(e) => setApiId(Number(e.target.value))}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-primary-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">API Hash</label>
                <input
                  type="text"
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-primary-500/50"
                />
              </div>
            </div>
          </div>

          {/* Manage Connected Accounts */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="text-xs font-bold text-gray-200">
              Active Connected Accounts ({accounts.length})
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-2.5 rounded-xl bg-dark-800 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="truncate">
                    <span className="font-bold text-gray-200">{acc.firstName}</span>{' '}
                    <span className="text-gray-400">({acc.phone})</span>
                  </div>
                  <button
                    onClick={() => onLogoutAccount(acc.id)}
                    title="Logout & Delete Session"
                    className="p-1.5 text-accent-rose hover:bg-accent-rose/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-dark-900 flex items-center justify-between">
          <div className="text-[10px] text-gray-500">Guidegram v1.0.0 (Portable Edition)</div>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all flex items-center gap-1.5"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

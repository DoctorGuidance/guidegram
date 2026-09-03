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
  Terminal,
  ExternalLink,
  RefreshCw,
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

  // Log Viewer State
  const [showLogs, setShowLogs] = useState(false)
  const [logText, setLogText] = useState('')
  const [logPath, setLogPath] = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.guidegram.getConfig().then((cfg) => {
        setConfig(cfg)
        setApiId(cfg.apiId)
        setApiHash(cfg.apiHash)
        setGhostMode(cfg.ghostMode)
      })
      window.guidegram.getPortableDataPath().then(setPortablePath)
      loadLogs()
    }
  }, [isOpen])

  const loadLogs = async () => {
    setLoadingLogs(true)
    try {
      if (window.guidegram?.getLogs) {
        const res = await window.guidegram.getLogs(150)
        setLogPath(res.logPath)
        setLogText(res.content)
      }
    } catch (e) {
      setLogText('Could not load logs.')
    } finally {
      setLoadingLogs(false)
    }
  }

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

  const handleOpenLogDir = () => {
    window.guidegram?.openLogsFolder?.()
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
            <div className="text-sm font-bold text-gray-100">Guidegram Preferences & Logs</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Portable Data Location */}
          <div className="p-3.5 rounded-2xl bg-dark-850 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-400 text-xs font-semibold">
                <FolderLock className="w-4 h-4" />
                <span>100% Portable Storage Directory</span>
              </div>
              <button
                onClick={handleCopyPath}
                className="text-[10px] text-gray-400 hover:text-gray-200 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-[11px] font-mono text-gray-300 bg-dark-900 px-3 py-1.5 rounded-xl border border-white/5 truncate">
              {portablePath || './data/'}
            </div>
          </div>

          {/* System Diagnostics & Logs Section */}
          <div className="p-3.5 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-cyan text-xs font-semibold">
                <Terminal className="w-4 h-4" />
                <span>System Logging & Diagnostics</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenLogDir}
                  className="text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Open logs folder in Windows Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-[11px] text-accent-cyan hover:text-white px-2 py-1 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{showLogs ? 'Hide Viewer' : 'View Live Logs'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              All runtime events, Telegram connections, and crash diagnostics are recorded to <code className="text-gray-300 font-mono text-[10px]">data/logs/guidegram.log</code>.
            </p>

            {showLogs && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span className="truncate max-w-[280px]">{logPath}</span>
                  <button
                    type="button"
                    onClick={loadLogs}
                    disabled={loadingLogs}
                    className="flex items-center gap-1 text-primary-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="bg-black/80 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[10px] text-gray-300 leading-normal whitespace-pre-wrap select-text">
                  {logText || 'No logs recorded.'}
                </div>
              </div>
            )}
          </div>

          {/* Telegram MTProto API Credentials */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
              <Key className="w-4 h-4 text-primary-400" />
              <span>Telegram API Credentials</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">API ID</label>
                <input
                  type="number"
                  value={apiId}
                  onChange={(e) => setApiId(Number(e.target.value))}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-primary-500/50"
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
                    <span className="font-bold text-gray-200">{acc.firstName || 'User'}</span>{' '}
                    <span className="text-gray-400">({acc.phone || 'No phone'})</span>
                  </div>
                  <button
                    onClick={() => onLogoutAccount(acc.id)}
                    title="Logout & Delete Session"
                    className="p-1.5 text-accent-rose hover:bg-accent-rose/10 rounded-lg transition-colors cursor-pointer"
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
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

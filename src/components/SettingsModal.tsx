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
  Hash,
  Clock,
  Users,
  Bookmark,
  Trash2,
  Code,
  Zap,
  CheckCheck,
  Minimize2,
  Power,
  HelpCircle,
  Download,
} from 'lucide-react'
import { AppConfig, AccountInfo, CloseAction, UpdateInfo } from '../types/telegram'

interface SettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
  onClose: () => void
  onLogoutAccount: (accountId: string) => Promise<void>
  onConfigUpdated?: (config: AppConfig) => void
}

interface ToggleItemProps {
  title: string
  desc: string
  icon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

const ToggleItem: React.FC<ToggleItemProps> = ({ title, desc, icon, checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    className="p-3 rounded-2xl bg-dark-800 hover:bg-dark-750 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none"
  >
    <div className="flex items-start gap-2.5">
      <div
        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
          checked
            ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
            : 'bg-dark-900 text-gray-500 border border-white/5'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-200">{title}</div>
        <div className="text-[11px] text-gray-400 leading-snug">{desc}</div>
      </div>
    </div>
    <div
      className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
        checked ? 'bg-primary-600 justify-end' : 'bg-dark-950 justify-start border border-white/10'
      }`}
    >
      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
    </div>
  </div>
)

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onLogoutAccount,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [portablePath, setPortablePath] = useState('')
  const [apiId, setApiId] = useState<number>(2040)
  const [apiHash, setApiHash] = useState<string>('')
  const [ghostMode, setGhostMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  // 64Gram Fork Power Features
  const [showChatId, setShowChatId] = useState(true)
  const [showMessageId, setShowMessageId] = useState(true)
  const [showSeconds, setShowSeconds] = useState(true)
  const [showSenderAvatar, setShowSenderAvatar] = useState(true)
  const [quickForwardToSaved, setQuickForwardToSaved] = useState(true)
  const [alwaysDeleteBoth, setAlwaysDeleteBoth] = useState(true)
  const [markAllReadEnabled, setMarkAllReadEnabled] = useState(true)
  const [copyCallbackData, setCopyCallbackData] = useState(true)

  // Window Close Action Preference
  const [closeAction, setCloseAction] = useState<CloseAction>('ask')

  // Updater State
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateCheckResult, setUpdateCheckResult] = useState<string | null>(null)

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
        setShowChatId(cfg.showChatId ?? true)
        setShowMessageId(cfg.showMessageId ?? true)
        setShowSeconds(cfg.showSeconds ?? true)
        setShowSenderAvatar(cfg.showSenderAvatar ?? true)
        setQuickForwardToSaved(cfg.quickForwardToSaved ?? true)
        setAlwaysDeleteBoth(cfg.alwaysDeleteBoth ?? true)
        setMarkAllReadEnabled(cfg.markAllReadEnabled ?? true)
        setCopyCallbackData(cfg.copyCallbackData ?? true)
        setCloseAction(cfg.closeAction || 'ask')
      })
      window.guidegram.getPortableDataPath().then(setPortablePath)
      loadLogs()
    }
  }, [isOpen])

  const handleManualCheckUpdates = async () => {
    setCheckingUpdate(true)
    setUpdateCheckResult(null)
    try {
      if (window.guidegram?.checkForUpdates) {
        const res = await window.guidegram.checkForUpdates()
        if (res && res.hasUpdate) {
          setUpdateCheckResult(`New update found: v${res.latestVersion}! Click Update in the banner.`)
        } else {
          setUpdateCheckResult(`Guidegram is up to date (v${res?.currentVersion || '1.0.0'}).`)
        }
      }
    } catch (e: any) {
      setUpdateCheckResult('Check failed. Make sure your connection or proxy is active.')
    } finally {
      setCheckingUpdate(false)
    }
  }

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
    const updated = await window.guidegram.updateConfig({
      apiId: Number(apiId),
      apiHash: apiHash.trim(),
      ghostMode,
      closeAction,
      showChatId,
      showMessageId,
      showSeconds,
      showSenderAvatar,
      quickForwardToSaved,
      alwaysDeleteBoth,
      markAllReadEnabled,
      copyCallbackData,
    })
    setConfig(updated)
    onConfigUpdated?.(updated)
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
      <div className="glass-modal w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100">Guidegram Preferences</div>
              <div className="text-[10px] text-gray-400">Settings & 64Gram Power Enhancements</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Window & Application Lifecycle Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
              <Power className="w-4 h-4 text-primary-400" />
              <span>Window & Lifecycle Behavior</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-200">When clicking the Close (X) button</div>
                  <div className="text-[11px] text-gray-400">Control how Guidegram behaves on exit</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCloseAction('ask')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    closeAction === 'ask'
                      ? 'bg-primary-600/20 text-primary-300 border-primary-500/50 shadow-glow'
                      : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Ask every time</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCloseAction('minimize')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    closeAction === 'minimize'
                      ? 'bg-primary-600/20 text-primary-300 border-primary-500/50 shadow-glow'
                      : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Minimize</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCloseAction('quit')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    closeAction === 'quit'
                      ? 'bg-accent-rose/20 text-accent-rose border-accent-rose/50 shadow-glow'
                      : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Quit completely</span>
                </button>
              </div>
            </div>
          </div>

          {/* Software Updates Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
              <Download className="w-4 h-4 text-accent-cyan" />
              <span>Software Updates (Auto-checks hourly)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                  <span>Current Version: v1.0.1</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300 font-mono">
                    Portable
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {updateCheckResult || 'Checks for new GitHub releases automatically every hour.'}
                </div>
              </div>

              <button
                type="button"
                disabled={checkingUpdate}
                onClick={handleManualCheckUpdates}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-750 hover:bg-dark-700 disabled:opacity-50 text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'Checking...' : 'Check Now'}</span>
              </button>
            </div>
          </div>

          {/* 64Gram Fork Power Features Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
              <Zap className="w-4 h-4 text-accent-cyan" />
              <span>64Gram Fork Power Enhancements</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <ToggleItem
                title="Show Chat ID"
                desc="Display Chat ID badge in header & list with 1-click copy"
                icon={<Hash className="w-3.5 h-3.5" />}
                checked={showChatId}
                onChange={setShowChatId}
              />

              <ToggleItem
                title="Show Message ID"
                desc="Show #msgId pill badge and quick copy on hover"
                icon={<Code className="w-3.5 h-3.5" />}
                checked={showMessageId}
                onChange={setShowMessageId}
              />

              <ToggleItem
                title="Message Seconds"
                desc="Format message timestamps with seconds (HH:mm:ss)"
                icon={<Clock className="w-3.5 h-3.5" />}
                checked={showSeconds}
                onChange={setShowSeconds}
              />

              <ToggleItem
                title="Sender Avatar in Groups"
                desc="Render sender avatar & author initials next to group messages"
                icon={<Users className="w-3.5 h-3.5" />}
                checked={showSenderAvatar}
                onChange={setShowSenderAvatar}
              />

              <ToggleItem
                title="Quick Forward to Saved"
                desc="1-click direct forward button to Saved Messages on hover"
                icon={<Bookmark className="w-3.5 h-3.5" />}
                checked={quickForwardToSaved}
                onChange={setQuickForwardToSaved}
              />

              <ToggleItem
                title="Always Delete for Both"
                desc="Default revoke/delete messages for both sides"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                checked={alwaysDeleteBoth}
                onChange={setAlwaysDeleteBoth}
              />

              <ToggleItem
                title="Mark All As Read Button"
                desc="Quick action button in tab bar to mark all dialogs read"
                icon={<CheckCheck className="w-3.5 h-3.5" />}
                checked={markAllReadEnabled}
                onChange={setMarkAllReadEnabled}
              />

              <ToggleItem
                title="Inspect Callback Data"
                desc="Right-click or click inline buttons to copy callback_data"
                icon={<Zap className="w-3.5 h-3.5 text-accent-amber" />}
                checked={copyCallbackData}
                onChange={setCopyCallbackData}
              />
            </div>
          </div>

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
              All runtime events, Telegram connections, and crash diagnostics are recorded to{' '}
              <code className="text-gray-300 font-mono text-[10px]">data/logs/guidegram.log</code>.
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
          <div className="text-[10px] text-gray-500">Guidegram (64Gram Enhanced Edition)</div>
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

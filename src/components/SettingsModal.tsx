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
  Sparkles,
  ShieldCheck,
  Laptop,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  User,
  Globe,
  Bell,
  MessageSquare,
  HardDrive,
  Database,
  Radio,
} from 'lucide-react'
import { AppConfig, AccountInfo, CloseAction, UpdateInfo, UpdateProgress, PortableLocatorInfo, AutoDownloadConfig } from '../types/telegram'
import { useI18n } from '../i18n'

interface SettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
  onClose: () => void
  onLogoutAccount: (accountId: string) => Promise<void>
  onConfigUpdated?: (config: AppConfig) => void
  onUpdateFound?: (info: UpdateInfo) => void
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
    <div className="flex items-start gap-2.5 min-w-0">
      <div
        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
          checked
            ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
            : 'bg-dark-900 text-gray-500 border border-white/5'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-gray-200 truncate">{title}</div>
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

type SettingsTab = 'profile' | 'general' | 'notifications' | 'privacy' | 'chat' | 'advanced'

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onLogoutAccount,
  onConfigUpdated,
  onUpdateFound,
}) => {
  const { t, language, setLanguage } = useI18n()
  const isPersian = language === 'fa'

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
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
  const [disableAnimations, setDisableAnimations] = useState(false)
  const [suppressLinkWarning, setSuppressLinkWarning] = useState(false)
  const [antiFingerprinting, setAntiFingerprinting] = useState(true)

  // Automatic Media Download Configuration
  const [autoDownload, setAutoDownload] = useState<AutoDownloadConfig>({
    enabled: true,
    photosInPrivate: true,
    photosInGroups: true,
    photosInChannels: false,
    videosInPrivate: false,
    videosInGroups: false,
    videosInChannels: false,
    filesInPrivate: false,
    filesInGroups: false,
    filesInChannels: false,
    maxPhotoSizeMB: 5,
    maxVideoSizeMB: 10,
    maxFileSizeMB: 5,
  })

  // Window Close Action Preference
  const [closeAction, setCloseAction] = useState<CloseAction>('ask')

  // Portable Locator & Sync state
  const [portableLocator, setPortableLocator] = useState<PortableLocatorInfo | null>(null)
  const [isSyncingPortable, setIsSyncingPortable] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Dynamic App Version & Updater State
  const [appVersion, setAppVersion] = useState<string>(__APP_VERSION__)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateCheckResult, setUpdateCheckResult] = useState<string | null>(null)
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null)
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false)
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Log Viewer State
  const [showLogs, setShowLogs] = useState(false)
  const [logText, setLogText] = useState('')
  const [logPath, setLogPath] = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    if (!window.guidegram?.on) return
    const cleanup = window.guidegram.on('app:update-progress', (p: UpdateProgress) => {
      setUpdateProgress(p)
    })
    return () => {
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      window.guidegram?.getAppVersion?.().then((ver) => {
        if (ver) setAppVersion(ver)
      })
      window.guidegram?.getConfig?.().then((cfg) => {
        if (!cfg) return
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
        setDisableAnimations(cfg.disableAnimations ?? false)
        setSuppressLinkWarning(cfg.suppressLinkWarning ?? false)
        setAntiFingerprinting(cfg.antiFingerprinting ?? true)
        setCloseAction(cfg.closeAction || 'ask')
        if (cfg.autoDownload) {
          setAutoDownload(cfg.autoDownload)
        }
      })
      window.guidegram?.getPortableDataPath?.().then(setPortablePath)
      window.guidegram?.getPortableLocator?.().then((info) => {
        if (info) setPortableLocator(info)
      })
      loadLogs()
    }
  }, [isOpen])

  const handleManualCheckUpdates = async () => {
    setCheckingUpdate(true)
    setUpdateCheckResult(null)
    setUpdateError(null)
    try {
      if (window.guidegram?.checkForUpdates) {
        const res = await window.guidegram.checkForUpdates()
        if (res) {
          if (res.currentVersion) setAppVersion(res.currentVersion)
          if (res.hasUpdate) {
            setAvailableUpdate(res)
            setUpdateCheckResult(`New update found: v${res.latestVersion}!`)
            onUpdateFound?.(res)
          } else {
            setAvailableUpdate(null)
            setUpdateCheckResult(`Guidegram is up to date (v${res.currentVersion || appVersion}).`)
          }
        } else {
          setUpdateCheckResult('Check failed. Unable to fetch release info.')
        }
      }
    } catch (e: any) {
      setUpdateCheckResult('Check failed. Make sure your connection or proxy is active.')
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleInstallUpdate = async () => {
    if (!availableUpdate) return
    if (!availableUpdate.downloadUrl) {
      window.guidegram?.openExternal?.('https://github.com/DoctorGuidance/guidegram/releases/latest')
      return
    }

    setIsInstallingUpdate(true)
    setUpdateError(null)

    try {
      if (window.guidegram?.installUpdate) {
        const res = await window.guidegram.installUpdate(availableUpdate.downloadUrl)
        if (!res.success) {
          setUpdateError(res.error || 'Failed to apply update.')
          setIsInstallingUpdate(false)
        }
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Update failed')
      setIsInstallingUpdate(false)
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

  const handleSave = async () => {
    if (!window.guidegram) return
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
      disableAnimations,
      suppressLinkWarning,
      antiFingerprinting,
      autoDownload,
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

  const handleSyncFromPortable = async () => {
    if (!portableLocator?.dataPath || !window.guidegram?.syncFromPortable) return
    setIsSyncingPortable(true)
    setSyncMessage(null)
    try {
      const res = await window.guidegram.syncFromPortable(portableLocator.dataPath)
      if (res.success) {
        setSyncMessage(t('settings.portable_sync_success'))
      } else {
        setSyncMessage(t('settings.portable_sync_failed', { error: res.error || 'Unknown error' }))
      }
    } catch (err: any) {
      setSyncMessage(t('settings.portable_sync_failed', { error: err?.message || 'Error' }))
    } finally {
      setIsSyncingPortable(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[750px] border border-white/10 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-dark-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100">{t('settings.title')}</div>
              <div className="text-[10px] text-gray-400">Telegram Desktop & 64Gram Power Preferences</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Layout: Telegram Desktop Sidebar + Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Tab Navigation Sidebar */}
          <div className="w-48 sm:w-56 bg-dark-900/50 border-r border-white/5 p-3 flex flex-col gap-1 overflow-y-auto shrink-0 select-none">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="truncate">{t('app.my_profile')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="truncate">{t('settings.general')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="truncate">{t('settings.notifications')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="truncate">{t('settings.privacy')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="truncate">{t('settings.chat_settings')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'advanced'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span className="truncate">{t('settings.advanced')}</span>
            </button>

            <div className="mt-auto pt-3 border-t border-white/5">
              <div className="px-3 py-1 text-[10px] text-gray-500 font-mono">
                v{appVersion} • 64Gram Mod
              </div>
            </div>
          </div>

          {/* Right Tab Content Viewport */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB: MY PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-400" />
                  <span>{t('app.my_profile')} & Connected Accounts ({accounts.length})</span>
                </div>

                <div className="space-y-2.5">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                          {(acc.firstName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-100 truncate flex items-center gap-1.5">
                            <span>{acc.firstName || 'User'} {acc.lastName || ''}</span>
                            {acc.username && (
                              <span className="text-primary-400 font-normal">@{acc.username}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {acc.phone || 'No phone'} • ID: {acc.id}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onLogoutAccount(acc.id)}
                        title="Logout & Delete Session"
                        className="px-3 py-1.5 rounded-xl bg-accent-rose/10 hover:bg-accent-rose/20 text-accent-rose text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                {/* Language Switcher */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200">{t('settings.language')}</div>
                      <div className="text-[11px] text-gray-400">{t('settings.language_desc')}</div>
                    </div>
                    <Globe className="w-4 h-4 text-primary-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        language === 'en'
                          ? 'bg-primary-600 text-white border-primary-500 shadow-glow'
                          : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                      }`}
                    >
                      <span>🇬🇧 {t('settings.lang_en')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLanguage('fa')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer font-persian ${
                        language === 'fa'
                          ? 'bg-primary-600 text-white border-primary-500 shadow-glow'
                          : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                      }`}
                    >
                      <span>🇮🇷 {t('settings.lang_fa')}</span>
                    </button>
                  </div>
                </div>

                {/* Window Close Action */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200">When clicking the Close (X) button</div>
                      <div className="text-[11px] text-gray-400">Control application lifecycle behavior</div>
                    </div>
                    <Power className="w-4 h-4 text-primary-400" />
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
                      <span>Quit</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary-400" />
                  <span>{t('settings.notifications')}</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <ToggleItem
                    title="Desktop Notifications"
                    desc="Show toast notifications when new messages arrive"
                    icon={<Bell className="w-3.5 h-3.5" />}
                    checked={true}
                    onChange={() => {}}
                  />
                  <ToggleItem
                    title="Sound Effects"
                    desc="Play sound on incoming direct messages"
                    icon={<Sparkles className="w-3.5 h-3.5 text-accent-cyan" />}
                    checked={true}
                    onChange={() => {}}
                  />
                </div>
              </div>
            )}

            {/* TAB: PRIVACY & SECURITY */}
            {activeTab === 'privacy' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{t('settings.privacy')}</span>
                </div>

                <div className="space-y-2.5">
                  <ToggleItem
                    title="Ghost Mode (حالت روح)"
                    desc="Read messages without sending read receipts or online status"
                    icon={<EyeOff className="w-3.5 h-3.5 text-accent-cyan" />}
                    checked={ghostMode}
                    onChange={setGhostMode}
                  />

                  <ToggleItem
                    title="Always Delete for Both"
                    desc="Default revoke/delete messages for all participants"
                    icon={<Trash2 className="w-3.5 h-3.5 text-accent-rose" />}
                    checked={alwaysDeleteBoth}
                    onChange={setAlwaysDeleteBoth}
                  />

                  <ToggleItem
                    title="Randomize Hardware Fingerprint per Account"
                    desc="Generate authentic PC models and OS builds per account to prevent correlation"
                    icon={<Laptop className="w-3.5 h-3.5 text-emerald-400" />}
                    checked={antiFingerprinting}
                    onChange={setAntiFingerprinting}
                  />

                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-200/90 leading-relaxed">
                      <span className="font-semibold text-amber-300">Active Devices Protection:</span> Each account appears as an authentic laptop (e.g. Dell XPS, ThinkPad) in official Telegram under <span className="font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded text-amber-200">Settings &gt; Devices</span>.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CHAT SETTINGS */}
            {activeTab === 'chat' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent-cyan" />
                  <span>64Gram Chat Enhancements</span>
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
                    desc="Render sender avatar next to group messages"
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
                    title="Mark All As Read Button"
                    desc="Quick action button in tab bar to mark all dialogs read"
                    icon={<CheckCheck className="w-3.5 h-3.5" />}
                    checked={markAllReadEnabled}
                    onChange={setMarkAllReadEnabled}
                  />

                  <ToggleItem
                    title="Inspect Callback Data"
                    desc="Copy callback_data from inline buttons on click"
                    icon={<Zap className="w-3.5 h-3.5 text-accent-amber" />}
                    checked={copyCallbackData}
                    onChange={setCopyCallbackData}
                  />

                  <ToggleItem
                    title="Suppress Link Warning"
                    desc="Open external web URLs directly without prompts"
                    icon={<ExternalLink className="w-3.5 h-3.5 text-accent-cyan" />}
                    checked={suppressLinkWarning}
                    onChange={setSuppressLinkWarning}
                  />
                </div>
              </div>
            )}

            {/* TAB: ADVANCED & STORAGE */}
            {activeTab === 'advanced' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                {/* 1. Portable Storage Directory */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary-400 text-xs font-bold">
                      <FolderLock className="w-4 h-4" />
                      <span>{t('settings.portable_title')}</span>
                    </div>
                    <button
                      onClick={handleCopyPath}
                      className="text-[10px] text-gray-400 hover:text-gray-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? t('app.copied') : t('app.copy')}</span>
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-gray-300 bg-dark-900 px-3 py-2 rounded-xl border border-white/5 truncate">
                    {portablePath || './data/'}
                  </div>
                </div>

                {/* 2. Portable Installation Locator & Sync (Item 9) */}
                {portableLocator && portableLocator.dataPath && (
                  <div className="p-4 rounded-2xl bg-primary-950/40 border border-primary-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary-300 text-xs font-bold">
                        <Database className="w-4 h-4 text-primary-400" />
                        <span>{t('settings.portable_detected')}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 font-mono">
                        v{portableLocator.version}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-300 leading-relaxed">
                      Portable data found at:{' '}
                      <span className="font-mono text-accent-cyan break-all">{portableLocator.dataPath}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isSyncingPortable}
                        onClick={handleSyncFromPortable}
                        className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPortable ? 'animate-spin' : ''}`} />
                        <span>{isSyncingPortable ? t('settings.portable_syncing') : t('settings.portable_sync_btn')}</span>
                      </button>
                    </div>
                    {syncMessage && (
                      <div className="text-[11px] text-accent-emerald font-semibold pt-1">
                        {syncMessage}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Automatic Media Download Controls */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                      <Download className="w-4 h-4 text-accent-cyan" />
                      <span>Automatic Media Download</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] text-gray-400">Master Switch</span>
                      <input
                        type="checkbox"
                        checked={autoDownload.enabled}
                        onChange={(e) => setAutoDownload(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="text-[11px] text-gray-400">
                    Control which media types automatically download into memory or cache for each chat type.
                  </div>

                  <div className={`space-y-3 transition-opacity ${autoDownload.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    {/* Private Chats */}
                    <div className="bg-dark-900/60 p-3 rounded-xl border border-white/5 space-y-2">
                      <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                        <span>Private Chats</span>
                        <span className="text-[10px] text-gray-500">Direct 1-on-1 conversations</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.photosInPrivate}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, photosInPrivate: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Photos</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.videosInPrivate}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, videosInPrivate: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Videos</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.filesInPrivate}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, filesInPrivate: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Files</span>
                        </label>
                      </div>
                    </div>

                    {/* Groups */}
                    <div className="bg-dark-900/60 p-3 rounded-xl border border-white/5 space-y-2">
                      <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                        <span>Groups</span>
                        <span className="text-[10px] text-gray-500">Small and supergroups</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.photosInGroups}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, photosInGroups: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Photos</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.videosInGroups}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, videosInGroups: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Videos</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.filesInGroups}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, filesInGroups: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Files</span>
                        </label>
                      </div>
                    </div>

                    {/* Channels */}
                    <div className="bg-dark-900/60 p-3 rounded-xl border border-white/5 space-y-2">
                      <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          Channels
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Data Saver</span>
                        </span>
                        <span className="text-[10px] text-gray-500">Broadcast channels</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.photosInChannels}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, photosInChannels: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Photos</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.videosInChannels}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, videosInChannels: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Videos</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDownload.filesInChannels}
                            onChange={(e) => setAutoDownload(prev => ({ ...prev, filesInChannels: e.target.checked }))}
                            className="rounded bg-dark-800 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Files</span>
                        </label>
                      </div>
                      <p className="text-[10px] text-gray-400 italic">
                        * Photos in channels are disabled by default to prevent unwanted high-volume downloading when viewing channels.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Performance & Animations Toggle */}
                <div className="space-y-2">
                  <ToggleItem
                    title="Disable UI Animations (Low-CPU Mode)"
                    desc="Cut CPU and RAM usage by eliminating transitions, blur and effects"
                    icon={<Sparkles className="w-3.5 h-3.5 text-accent-amber" />}
                    checked={disableAnimations}
                    onChange={setDisableAnimations}
                  />
                </div>

                {/* 4. Software Updates */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                        <Download className="w-4 h-4 text-accent-cyan" />
                        <span>Software Updates (Auto-checks hourly)</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        {updateCheckResult || `Current Version: v${appVersion}`}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={checkingUpdate || isInstallingUpdate}
                      onClick={handleManualCheckUpdates}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-750 hover:bg-dark-700 disabled:opacity-50 text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                      <span>{checkingUpdate ? 'Checking...' : 'Check Now'}</span>
                    </button>
                  </div>
                </div>

                {/* 5. MTProto API Credentials */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                    <Key className="w-4 h-4 text-primary-400" />
                    <span>Telegram API Credentials</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">API ID</label>
                      <input
                        type="number"
                        value={apiId}
                        onChange={(e) => setApiId(Number(e.target.value))}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-primary-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">API Hash</label>
                      <input
                        type="text"
                        value={apiHash}
                        onChange={(e) => setApiHash(e.target.value)}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. System Logging */}
                <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-accent-cyan text-xs font-semibold">
                      <Terminal className="w-4 h-4" />
                      <span>System Logging & Diagnostics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.guidegram?.openLogsFolder?.()}
                        className="text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
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

                  {showLogs && (
                    <div className="mt-2 space-y-2">
                      <div className="bg-black/80 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[10px] text-gray-300 leading-normal whitespace-pre-wrap select-text">
                        {logText || 'No logs recorded.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-dark-900 flex items-center justify-between">
          <div className="text-[11px] text-gray-500">Guidegram (64Gram Enhanced Edition)</div>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? t('app.copied') : t('app.save')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

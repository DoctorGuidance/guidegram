import React from 'react'
import {
  Plus,
  Shield,
  Forward,
  FolderLock,
  Sparkles,
  Layers,
  Settings,
  ArrowRight,
  Lock,
} from 'lucide-react'

interface WelcomeScreenProps {
  onOpenAddAccount: () => void
  onOpenProxyModal: () => void
  onOpenSettings: () => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onOpenAddAccount,
  onOpenProxyModal,
  onOpenSettings,
}) => {
  return (
    <div className="flex-1 bg-dark-950 flex flex-col items-center justify-center p-8 relative overflow-hidden select-none titlebar-no-drag">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-accent-cyan/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Hero Container */}
      <div className="max-w-2xl w-full text-center relative z-10 flex flex-col items-center">
        {/* Glowing Logo Badge */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-accent-cyan via-primary-600 to-accent-violet flex items-center justify-center shadow-glow mb-6 transform hover:scale-105 transition-all duration-300 p-4">
          <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current text-white transform -translate-x-0.5 translate-y-0.5" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' }}>
            <path d="M2.5 11.5L21.5 3.5L14.5 21.5L11 13.5L2.5 11.5Z" fill="white" />
            <path d="M11 13.5L21.5 3.5L14.5 21.5Z" fill="#CBDDF8" opacity="0.8" />
          </svg>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Portable Edition • Unlimited Multi-Account</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Welcome to <span className="bg-gradient-to-r from-primary-400 to-accent-cyan bg-clip-text text-transparent">Guidegram</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-gray-400 max-w-lg mb-8 leading-relaxed">
          The ultimate desktop Telegram client built for power users. Manage dozens or hundreds of accounts concurrently with dedicated per-account proxies, direct quote-free forwarding, and zero installation footprint.
        </p>

        {/* Primary CTA */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={onOpenAddAccount}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-500 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-glow transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Telegram Account</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={onOpenProxyModal}
            className="px-4 py-3 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/5 font-semibold text-sm rounded-2xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-accent-cyan" />
            <span>Proxy Manager</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-3 bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/5 rounded-2xl transition-all duration-200 cursor-pointer"
            title="Preferences & API"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Bento Grid - 4 Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-primary-500/20 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-primary-600/10 text-primary-400 border border-primary-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">No 3-Account Limit</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Log in to 10, 50, or 100+ accounts concurrently without paying for Premium.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-accent-cyan/20 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Per-Account Proxies</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Assign dedicated SOCKS5 or MTProto proxies to each account to isolate network traffic.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-accent-violet/20 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                <Forward className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Direct Forward (No Quote)</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Forward messages silently with original author and channel headers completely removed.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-accent-emerald/20 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">
                <FolderLock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">100% Portable Storage</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              All credentials and databases reside in <code className="text-gray-300 font-mono">./data/</code>. Zero registry clutter.
            </p>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
          <Lock className="w-3.5 h-3.5 text-accent-emerald" />
          <span>Local MTProto 2.0 Encryption • Your sessions never leave your local computer</span>
        </div>
      </div>
    </div>
  )
}

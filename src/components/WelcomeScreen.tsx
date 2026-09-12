import React from 'react'
import {
  Plus,
  Shield,
  Sparkles,
  Layers,
  Settings,
  ArrowRight,
  Lock,
  ShieldCheck,
  BarChart2,
  Zap,
} from 'lucide-react'
import logoImg from '../assets/logo.png'

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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary-500/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-primary-400/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Hero Container */}
      <div className="max-w-2xl w-full text-center relative z-10 flex flex-col items-center">
        {/* Glowing Logo Badge */}
        <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-glow mb-6 border border-primary-400/40 transform hover:scale-105 transition-all duration-300">
          <img src={logoImg} alt="Guidegram Logo" className="w-full h-full object-cover" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-600/15 border border-primary-500/30 text-primary-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          <span>Portable Edition • Unlimited Multi-Account</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Welcome to <span className="bg-gradient-to-r from-primary-400 via-[#4EE0B5] to-primary-300 bg-clip-text text-transparent">Guidegram</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-gray-400 max-w-lg mb-8 leading-relaxed">
          The ultimate desktop Telegram client built for power users. Manage dozens or hundreds of accounts concurrently with dedicated per-account proxies, deep group analytics, and multi-worker downloads.
        </p>

        {/* Primary CTA */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={onOpenAddAccount}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-glow border border-primary-400/30 transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Telegram Account</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={onOpenProxyModal}
            className="px-4 py-3 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/5 font-semibold text-sm rounded-2xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-primary-400" />
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

        {/* Bento Grid - 4 Killer Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-primary-500/30 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-primary-600/15 text-primary-400 border border-primary-500/25">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Unlimited Multi-Account</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Run 10, 50, or 100+ accounts concurrently without paying for Telegram Premium.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-accent-cyan/20 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Anti-Ban Hardware Shield</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Dedicated per-account proxies coupled with cryptographic hardware fingerprint masking.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-accent-violet/20 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Deep Group Intelligence</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Real-time active member leaderboards, 24-hour heatmaps, and message analytics.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-primary-500/20 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-primary-600/10 text-primary-400 border border-primary-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Turbo Parallel Downloads</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Up to 3x faster media streaming and large file transfers via 4 concurrent MTProto workers.
            </p>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
          <Lock className="w-3.5 h-3.5 text-primary-400" />
          <span>Local MTProto 2.0 Encryption • Your sessions never leave your local computer</span>
        </div>
      </div>
    </div>
  )
}

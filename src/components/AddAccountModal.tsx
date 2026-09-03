import React, { useState } from 'react'
import { X, Phone, KeyRound, Lock, Shield, ArrowRight, CheckCircle2 } from 'lucide-react'
import { ProxyConfig, AccountInfo } from '../types/telegram'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAccountAdded: (account: AccountInfo) => void
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountAdded,
}) => {
  const [step, setStep] = useState<'phone' | 'code' | '2fa' | 'success'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Per-account proxy state
  const [useProxy, setUseProxy] = useState(false)
  const [proxyType, setProxyType] = useState<'socks5' | 'http' | 'mtproto'>('socks5')
  const [proxyHost, setProxyHost] = useState('')
  const [proxyPort, setProxyPort] = useState(1080)
  const [proxyUser, setProxyUser] = useState('')
  const [proxyPass, setProxyPass] = useState('')

  if (!isOpen) return null

  const getProxyConfig = (): ProxyConfig | undefined => {
    if (!useProxy || !proxyHost) return undefined
    return {
      id: `proxy_${Date.now()}`,
      name: `${proxyType.toUpperCase()} - ${proxyHost}`,
      enabled: true,
      type: proxyType,
      host: proxyHost.trim(),
      port: Number(proxyPort),
      username: proxyUser ? proxyUser.trim() : undefined,
      password: proxyPass ? proxyPass.trim() : undefined,
    }
  }

  // Step 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const proxy = getProxyConfig()
      await window.guidegram.startPhoneAuth(phone.trim(), proxy)
      setStep('code')
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send code. Check phone or proxy settings.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 & 3: Submit Code or Password
  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const account = await window.guidegram.completePhoneAuth(
        phone.trim(),
        code.trim(),
        password.trim() || undefined
      )
      setStep('success')
      setTimeout(() => {
        onAccountAdded(account)
        onClose()
      }, 1000)
    } catch (err: any) {
      if (err.message === '2FA_REQUIRED') {
        setStep('2fa')
      } else {
        setErrorMessage(err.message || 'Invalid code or verification error.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <Phone className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-gray-100">Add Telegram Account</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs">
              {errorMessage}
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Phone Number (International format)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+989123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-dark-800 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>

              {/* Per-Account Proxy Settings (Collapsible) */}
              <div className="pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setUseProxy(!useProxy)}
                  className="flex items-center gap-2 text-xs font-medium text-accent-cyan hover:underline"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{useProxy ? 'Remove dedicated proxy' : '+ Assign dedicated proxy to this account'}</span>
                </button>

                {useProxy && (
                  <div className="mt-3 p-3 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5 text-xs">
                    <div className="flex gap-2">
                      <select
                        value={proxyType}
                        onChange={(e) => setProxyType(e.target.value as any)}
                        className="bg-dark-800 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-200"
                      >
                        <option value="socks5">SOCKS5</option>
                        <option value="http">HTTP</option>
                        <option value="mtproto">MTProto</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Host (e.g. 127.0.0.1)"
                        value={proxyHost}
                        onChange={(e) => setProxyHost(e.target.value)}
                        className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                      />

                      <input
                        type="number"
                        placeholder="Port"
                        value={proxyPort}
                        onChange={(e) => setProxyPort(Number(e.target.value))}
                        className="w-20 bg-dark-800 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-200"
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Username (optional)"
                        value={proxyUser}
                        onChange={(e) => setProxyUser(e.target.value)}
                        className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                      />
                      <input
                        type="password"
                        placeholder="Password (optional)"
                        value={proxyPass}
                        onChange={(e) => setProxyPass(e.target.value)}
                        className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{loading ? 'Requesting Code...' : 'Send Login Code'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Telegram Verification Code (Sent to your active Telegram or SMS)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="12345"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="w-full bg-dark-800 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 text-center tracking-widest font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all"
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Two-Step Verification Password (2FA)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Enter your 2FA password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-dark-800 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all"
              >
                {loading ? 'Verifying 2FA...' : 'Complete Login'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-accent-emerald mb-3 animate-bounce" />
              <div className="text-sm font-bold text-gray-100">Account Added Successfully!</div>
              <div className="text-xs text-gray-400 mt-1">
                Your session is saved portably and ready to use.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

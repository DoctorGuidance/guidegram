import React, { useState } from 'react'
import { X, Shield, Plus, RefreshCw, Check, Trash2, Globe } from 'lucide-react'
import { ProxyConfig, AccountInfo } from '../types/telegram'

interface ProxySettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
  onClose: () => void
  onUpdateAccountProxy: (accountId: string, proxy?: ProxyConfig) => void
}

export const ProxySettingsModal: React.FC<ProxySettingsModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onUpdateAccountProxy,
}) => {
  const [proxies, setProxies] = useState<ProxyConfig[]>([
    {
      id: 'local_socks',
      name: 'Local SOCKS5 (v2ray/Clash)',
      enabled: true,
      type: 'socks5',
      host: '127.0.0.1',
      port: 10808,
      pingMs: 45,
    },
  ])

  const [testingPing, setTestingPing] = useState<Record<string, boolean>>({})

  const [type, setType] = useState<'socks5' | 'http' | 'mtproto'>('socks5')
  const [host, setHost] = useState('')
  const [port, setPort] = useState(1080)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [secret, setSecret] = useState('')

  if (!isOpen) return null

  const handleTestPing = async (proxy: ProxyConfig) => {
    setTestingPing((prev) => ({ ...prev, [proxy.id]: true }))
    try {
      const ping = await window.guidegram.testProxyPing(proxy)
      setProxies((prev) =>
        prev.map((p) =>
          p.id === proxy.id ? { ...p, pingMs: ping, lastChecked: Date.now() } : p
        )
      )
    } finally {
      setTestingPing((prev) => ({ ...prev, [proxy.id]: false }))
    }
  }

  const handleAddProxy = (e: React.FormEvent) => {
    e.preventDefault()
    if (!host.trim()) return

    const newProxy: ProxyConfig = {
      id: `proxy_${Date.now()}`,
      name: `${type.toUpperCase()} - ${host}`,
      enabled: true,
      type,
      host: host.trim(),
      port: Number(port),
      username: user ? user.trim() : undefined,
      password: pass ? pass.trim() : undefined,
      secret: secret ? secret.trim() : undefined,
    }

    setProxies([...proxies, newProxy])
    setHost('')
    setUser('')
    setPass('')
    setSecret('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center border border-accent-cyan/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100">Per-Account Proxy Manager</div>
              <div className="text-[10px] text-gray-400">
                Isolate each account with dedicated proxies to prevent IP bans
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Proxy List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-gray-300">Configured Proxies</div>
            {proxies.map((p) => {
              const isChecking = testingPing[p.id]

              return (
                <div
                  key={p.id}
                  className="p-3 bg-dark-800/90 border border-white/5 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-dark-750 flex items-center justify-center text-accent-cyan font-bold text-xs uppercase">
                      {p.type}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-200">{p.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        {p.host}:{p.port}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Ping status */}
                    <div
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                        p.pingMs && p.pingMs > 0
                          ? p.pingMs < 150
                            ? 'text-accent-emerald bg-accent-emerald/10'
                            : 'text-accent-amber bg-accent-amber/10'
                          : 'text-accent-rose bg-accent-rose/10'
                      }`}
                    >
                      <span>{p.pingMs && p.pingMs > 0 ? `${p.pingMs}ms` : 'Failed'}</span>
                    </div>

                    <button
                      onClick={() => handleTestPing(p)}
                      disabled={isChecking}
                      title="Test Latency"
                      className="p-2 rounded-xl bg-dark-750 hover:bg-dark-700 text-gray-300 hover:text-white transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Proxy Form */}
          <div className="pt-3 border-t border-white/10">
            <div className="text-xs font-bold text-gray-300 mb-2">Add New Proxy</div>
            <form onSubmit={handleAddProxy} className="space-y-2.5">
              <div className="flex gap-2">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="bg-dark-800 border border-white/10 rounded-xl px-2 py-2 text-xs text-gray-200"
                >
                  <option value="socks5">SOCKS5</option>
                  <option value="http">HTTP</option>
                  <option value="mtproto">MTProto</option>
                </select>

                <input
                  type="text"
                  placeholder="Host (IP or domain)"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                  className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />

                <input
                  type="number"
                  placeholder="Port"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  required
                  className="w-24 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
              </div>

              {type !== 'mtproto' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Username (optional)"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500"
                  />
                  <input
                    type="password"
                    placeholder="Password (optional)"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="MTProto Secret (Hex or dd...)"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 font-mono"
                />
              )}

              <button
                type="submit"
                className="w-full py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Proxy</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-dark-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Minus, Square, X, Shield, Sparkles } from 'lucide-react'
import { AccountInfo } from '../types/telegram'

interface TitleBarProps {
  activeAccount: AccountInfo | null
  ghostMode: boolean
  onRequestClose?: () => void
}

export const TitleBar: React.FC<TitleBarProps> = ({ activeAccount, ghostMode, onRequestClose }) => {
  const [isMax, setIsMax] = useState(false)

  const handleMinimize = () => {
    window.guidegram?.minimizeWindow?.()
  }

  const handleMaximize = async () => {
    if (window.guidegram?.maximizeWindow) {
      const maxState = await window.guidegram.maximizeWindow()
      setIsMax(maxState)
    }
  }

  const handleClose = () => {
    if (onRequestClose) {
      onRequestClose()
    } else {
      window.guidegram?.closeWindow?.()
    }
  }

  return (
    <header className="h-10 bg-dark-950 border-b border-white/5 flex items-center justify-between px-3 select-none titlebar-drag z-50">
      {/* Left Brand Badge */}
      <div className="flex items-center gap-2.5 titlebar-no-drag">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center shadow-glow">
          <span className="text-[10px] font-black text-white">G</span>
        </div>
        <span className="text-xs font-bold text-gray-200 tracking-wide">Guidegram</span>
        <span className="text-[10px] font-medium px-1.5 py-0.2 bg-primary-600/20 text-primary-400 border border-primary-500/20 rounded-md">
          Portable
        </span>

        {/* Active Account Pill */}
        {activeAccount && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10 text-xs">
            <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-gray-300 font-medium">{activeAccount.firstName || 'User'}</span>
            {activeAccount.proxyConfig?.enabled && (
              <span className="text-[10px] text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.2 rounded border border-accent-cyan/20">
                Proxy
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle Status / Drag Area */}
      <div className="flex-1 h-full flex items-center justify-center titlebar-drag">
        {ghostMode && (
          <div className="flex items-center gap-1.5 text-[11px] text-accent-violet font-semibold bg-accent-violet/10 px-2.5 py-0.5 rounded-full border border-accent-violet/20 titlebar-no-drag">
            <Sparkles className="w-3 h-3" />
            <span>Ghost Mode Active</span>
          </div>
        )}
      </div>

      {/* Right Window Controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title={isMax ? 'Restore' : 'Maximize'}
        >
          <Square className="w-3 h-3" />
        </button>

        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-accent-rose text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}

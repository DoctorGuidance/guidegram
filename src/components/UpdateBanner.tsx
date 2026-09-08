import React, { useState, useEffect } from 'react'
import { Sparkles, Download, X, ArrowUpRight, AlertCircle, RefreshCw } from 'lucide-react'
import { UpdateInfo, UpdateProgress } from '../types/telegram'

interface UpdateBannerProps {
  updateInfo: UpdateInfo
  onDismiss: () => void
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ updateInfo, onDismiss }) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)

  useEffect(() => {
    if (!window.guidegram?.on) return
    const cleanup = window.guidegram.on('app:update-progress', (p: UpdateProgress) => {
      setProgress(p)
    })
    return () => {
      cleanup?.()
    }
  }, [])

  const handleUpdate = async () => {
    if (!updateInfo.downloadUrl) {
      if (window.guidegram?.openExternal) {
        window.guidegram.openExternal('https://github.com/DoctorGuidance/guidegram/releases/latest')
      }
      return
    }

    setIsUpdating(true)
    setUpdateError(null)

    try {
      if (window.guidegram?.installUpdate) {
        const res = await window.guidegram.installUpdate(updateInfo.downloadUrl)
        if (!res.success) {
          setUpdateError(res.error || 'Failed to apply update.')
          setIsUpdating(false)
        }
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Update failed')
      setIsUpdating(false)
    }
  }

  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1) + ' MB'

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-dark-900/95 border border-primary-500/40 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200 select-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center text-white shadow-glow shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Guidegram v{updateInfo.latestVersion}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-accent-emerald/20 text-accent-emerald font-semibold border border-accent-emerald/30">
                New
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              An update is ready to install without touching your data.
            </p>
          </div>
        </div>

        {!isUpdating && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Real-time Download & Extraction Progress */}
      {isUpdating && (
        <div className="mt-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-primary-300 font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin text-accent-cyan" />
              {progress?.stage === 'extracting'
                ? 'Extracting update files...'
                : progress?.stage === 'restarting'
                ? 'Restarting Guidegram...'
                : `Downloading update... ${progress?.percent ? `${progress.percent}%` : ''}`}
            </span>
            {progress && progress.totalBytes > 0 && (
              <span className="text-gray-400 font-mono text-[10px]">
                {formatMB(progress.transferredBytes)} / {formatMB(progress.totalBytes)}
              </span>
            )}
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan transition-all duration-300 ease-out"
              style={{ width: `${progress?.percent ?? 5}%` }}
            />
          </div>

          <p className="text-[10px] text-gray-500">
            Guidegram will close and reopen automatically once ready.
          </p>
        </div>
      )}

      {updateError && (
        <div className="mt-2.5 p-2 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-[10px] text-accent-rose flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2 mt-3.5 pt-2.5 border-t border-white/5">
        <button
          type="button"
          onClick={() => {
            if (window.guidegram?.openExternal) {
              window.guidegram.openExternal(
                'https://github.com/DoctorGuidance/guidegram/releases/latest'
              )
            }
          }}
          className="text-[11px] font-medium text-gray-400 hover:text-primary-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Release Notes</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>

        <div className="flex items-center gap-2">
          {!isUpdating && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Later
            </button>
          )}
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleUpdate}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white shadow-glow flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>
                  {progress?.stage === 'restarting'
                    ? 'Restarting...'
                    : progress?.stage === 'extracting'
                    ? 'Extracting...'
                    : progress?.percent !== undefined
                    ? `${progress.percent}%`
                    : 'Updating...'}
                </span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Update Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

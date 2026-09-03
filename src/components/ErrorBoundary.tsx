import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught React render error:', error, errorInfo)
    this.setState({ errorInfo })

    // Send error to main process logger if available
    try {
      if (window.guidegram?.logError) {
        window.guidegram.logError(
          `[React ErrorBoundary] ${error.message}`,
          `${error.stack}\nComponentStack:\n${errorInfo.componentStack}`
        )
      }
    } catch (_) {}
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#08090C] text-gray-100 flex flex-col items-center justify-center p-8 select-none font-sans">
          <div className="max-w-lg w-full bg-dark-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-white mb-1">Guidegram Interface Exception</h2>
            <p className="text-xs text-gray-400 mb-4">
              An unexpected error occurred in the UI renderer. Your session and settings remain safe.
            </p>

            {this.state.error && (
              <div className="w-full bg-black/50 border border-white/5 rounded-xl p-3 mb-5 text-left overflow-x-auto max-h-40">
                <div className="text-xs font-mono text-accent-rose font-semibold break-all">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <pre className="text-[10px] font-mono text-gray-500 mt-2 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-primary-600 hover:bg-primary-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-glow"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Interface</span>
              </button>

              <button
                onClick={() => {
                  try {
                    window.guidegram?.openLogsFolder?.()
                  } catch (_) {}
                }}
                className="py-2.5 px-4 bg-dark-800 hover:bg-dark-750 text-gray-300 rounded-xl text-xs font-semibold border border-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Terminal className="w-4 h-4 text-accent-cyan" />
                <span>Open Logs</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

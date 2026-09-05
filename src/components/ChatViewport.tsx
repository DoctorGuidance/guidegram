import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Forward,
  EyeOff,
  Paperclip,
  Check,
  CheckCheck,
  Hash,
  Copy,
  Bookmark,
  Trash2,
  ExternalLink,
  Info,
  X,
  Radio,
  Users,
  Bot,
  User,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FileText,
  Music,
  Download,
  Maximize2,
  ChevronRight,
  Search,
  Pin,
  Camera,
  Sparkles,
  CornerUpLeft,
  Quote,
  Reply,
} from 'lucide-react'
import { DialogItem, MessageItem, ChatDetails, MessageEntityItem } from '../types/telegram'
import { Avatar } from './Avatar'
import { VideoPlayer } from './VideoPlayer'
import { isRTL, formatFileSize, formatDuration, formatNumber } from '../utils/textUtils'

interface ChatViewportProps {
  chat: DialogItem | null
  messages: MessageItem[]
  ghostMode: boolean
  // 64Gram Fork Power Preferences
  showChatId?: boolean
  showMessageId?: boolean
  showSeconds?: boolean
  showSenderAvatar?: boolean
  quickForwardToSaved?: boolean
  alwaysDeleteBoth?: boolean
  copyCallbackData?: boolean
  onSendMessage: (text: string) => void
  onOpenDirectForward: (message: MessageItem) => void
  onQuickForwardToSaved?: (message: MessageItem) => Promise<boolean> | void
  onDeleteMessage?: (message: MessageItem) => Promise<boolean> | void
  onToggleGhostMode: () => void
  onSelectUserOrChat?: (target: string) => void
}

export const ChatViewport: React.FC<ChatViewportProps> = ({
  chat,
  messages,
  ghostMode,
  showChatId = true,
  showMessageId = true,
  showSeconds = true,
  showSenderAvatar = true,
  quickForwardToSaved = true,
  alwaysDeleteBoth = true,
  copyCallbackData = true,
  onSendMessage,
  onOpenDirectForward,
  onQuickForwardToSaved,
  onDeleteMessage,
  onToggleGhostMode,
  onSelectUserOrChat,
}) => {
  const [inputText, setInputText] = useState('')
  const [copiedChatId, setCopiedChatId] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null)
  const [hoveredMessage, setHoveredMessage] = useState<MessageItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Media cache in component state (cacheKey -> dataUrl or guidegram-media url)
  const [downloadedMedia, setDownloadedMedia] = useState<Record<string, string>>({})
  const [loadingMediaIds, setLoadingMediaIds] = useState<Record<string, boolean>>({})

  // Fullscreen image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Channel / User Info Drawer
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // In-chat search state (Ctrl+F)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Voice playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null)
  const [voicePlaybackSpeed, setVoicePlaybackSpeed] = useState<number>(1)
  const [voiceCurrentTime, setVoiceCurrentTime] = useState<number>(0)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Active video message playing in-app
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null)

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    message: MessageItem
    selectedText?: string
  } | null>(null)

  // Close context menu on global click or Escape
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) setContextMenu(null)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu) {
        setContextMenu(null)
      }
    }
    window.addEventListener('click', handleGlobalClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleGlobalClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  // Reset drawer state & auto-fetch chat details for header banner & mute button
  useEffect(() => {
    setIsInfoOpen(false)
    setChatDetails(null)
    setIsSearchOpen(false)
    setSearchQuery('')
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
    }
    setPlayingVoiceId(null)

    if (chat && window.guidegram?.getChatDetails) {
      window.guidegram.getChatDetails(chat.accountId, chat.id).then((details) => {
        if (details) setChatDetails(details)
      }).catch(() => {})
    }
  }, [chat?.id])

  // Ctrl+F hotkey listener for in-chat search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen])

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isSearchOpen])

  // Filter messages based on search query
  const filteredMessages = React.useMemo(() => {
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter(
      (m) =>
        (m.text && m.text.toLowerCase().includes(q)) ||
        (m.senderName && m.senderName.toLowerCase().includes(q)) ||
        (m.mediaFileName && m.mediaFileName.toLowerCase().includes(q))
    )
  }, [messages, searchQuery])

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast(msg)
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 2200)
  }

  // Load chat details when drawer opens
  const handleOpenInfo = async () => {
    if (!chat) return
    setIsInfoOpen(true)
    setIsLoadingDetails(true)
    try {
      if (window.guidegram?.getChatDetails) {
        const details = await window.guidegram.getChatDetails(chat.accountId, chat.id)
        setChatDetails(details)
      }
    } catch (err) {
      console.warn('Failed to fetch chat details:', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Toggle notifications (Mute / Unmute)
  const handleToggleNotifications = async () => {
    if (!chat || !window.guidegram?.toggleChatNotifications) return
    const nextMuted = !isMuted
    const ok = await window.guidegram.toggleChatNotifications(chat.accountId, chat.id, nextMuted)
    if (ok) {
      setIsMuted(nextMuted)
      showToast(nextMuted ? 'Notifications muted' : 'Notifications unmuted')
    }
  }

  // Check whether current user can delete a message
  const canDeleteMessage = useCallback(
    (msg: MessageItem) => {
      // Outgoing message (sent by me) -> always allow delete
      if (msg.isOutgoing) return true
      // In 1-on-1 private chat (not channel, not group) -> allow delete
      if (!chat?.isChannel && !chat?.isGroup) return true
      // In supergroup/group/channel -> only allow if user is creator or has canDeleteMessages right
      if (chatDetails?.isCreator || chatDetails?.canDeleteMessages) return true
      return false
    },
    [chat, chatDetails]
  )

  // Lazy download media (photo thumbnail or full media)
  const requestMediaDownload = useCallback(
    async (msg: MessageItem, thumb = true) => {
      const cacheKey = thumb ? `${msg.id}_thumb` : `${msg.id}`
      if (
        downloadedMedia[cacheKey] ||
        loadingMediaIds[cacheKey] ||
        !window.guidegram?.downloadMedia
      ) {
        return downloadedMedia[cacheKey] || null
      }

      setLoadingMediaIds((prev) => ({ ...prev, [cacheKey]: true }))
      try {
        const dataUrl = await window.guidegram.downloadMedia(
          msg.accountId,
          msg.chatId,
          msg.id,
          thumb
        )
        if (dataUrl) {
          setDownloadedMedia((prev) => ({ ...prev, [cacheKey]: dataUrl }))
          return dataUrl
        }
      } catch (err) {
        console.warn(`Failed to download media for ${msg.id}:`, err)
      } finally {
        setLoadingMediaIds((prev) => {
          const next = { ...prev }
          delete next[cacheKey]
          return next
        })
      }
      return null
    },
    [downloadedMedia, loadingMediaIds]
  )

  // Audio Playback Controller
  const handlePlayVoice = async (msg: MessageItem) => {
    // If clicking on already playing voice, toggle pause/play
    if (playingVoiceId === msg.id && audioPlayerRef.current) {
      if (audioPlayerRef.current.paused) {
        audioPlayerRef.current.play()
      } else {
        audioPlayerRef.current.pause()
        setPlayingVoiceId(null)
      }
      return
    }

    // Stop current playing audio if any
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
    }

    let audioSrc = downloadedMedia[msg.id] || msg.mediaUrl
    if (!audioSrc && window.guidegram?.downloadMedia) {
      setLoadingMediaIds((prev) => ({ ...prev, [msg.id]: true }))
      try {
        const dl = await window.guidegram.downloadMedia(msg.accountId, msg.chatId, msg.id, false)
        if (dl) {
          audioSrc = dl
          setDownloadedMedia((prev) => ({ ...prev, [msg.id]: dl }))
        }
      } catch (err) {
        console.warn('Failed to load voice audio:', err)
      } finally {
        setLoadingMediaIds((prev) => {
          const next = { ...prev }
          delete next[msg.id]
          return next
        })
      }
    }

    if (!audioSrc) {
      showToast('Could not load voice audio')
      return
    }

    const audio = new Audio(audioSrc)
    audio.playbackRate = voicePlaybackSpeed
    audio.ontimeupdate = () => {
      setVoiceCurrentTime(audio.currentTime)
    }
    audio.onended = () => {
      setPlayingVoiceId(null)
      setVoiceCurrentTime(0)
    }
    audio.onerror = () => {
      setPlayingVoiceId(null)
      showToast('Error playing audio format')
    }

    audioPlayerRef.current = audio
    setPlayingVoiceId(msg.id)
    setVoiceCurrentTime(0)
    audio.play().catch(() => {
      setPlayingVoiceId(null)
    })
  }

  const handleToggleVoiceSpeed = (e: React.MouseEvent) => {
    e.stopPropagation()
    const speeds = [1, 1.5, 2]
    const nextIdx = (speeds.indexOf(voicePlaybackSpeed) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setVoicePlaybackSpeed(nextSpeed)
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = nextSpeed
    }
  }

  // 64Gram Keyboard Shortcuts: Alt+F and Alt+C
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxUrl) {
          setLightboxUrl(null)
          return
        }
        if (isInfoOpen) {
          setIsInfoOpen(false)
          return
        }
        setSelectedMessage(null)
        return
      }

      const activeEl = document.activeElement
      const isInputFocused =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')

      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        const target =
          selectedMessage ||
          hoveredMessage ||
          (messages.length > 0 ? messages[messages.length - 1] : null)
        if (!target) return
        e.preventDefault()
        onOpenDirectForward(target)
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        if (isInputFocused && window.getSelection()?.toString()) return

        const target =
          selectedMessage ||
          hoveredMessage ||
          (messages.length > 0 ? messages[messages.length - 1] : null)
        if (!target) return
        e.preventDefault()

        if (!target.text || !target.text.trim()) {
          showToast(`Message #${target.id} has no text to copy`)
          return
        }

        navigator.clipboard
          .writeText(target.text)
          .then(() => {
            showToast(`Copied text of message #${target.id}`)
          })
          .catch(() => {
            showToast('Failed to copy to clipboard')
          })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMessage, hoveredMessage, messages, onOpenDirectForward, lightboxUrl, isInfoOpen])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleCopyChatId = () => {
    if (!chat) return
    navigator.clipboard.writeText(chat.id)
    setCopiedChatId(true)
    showToast(`Copied Chat ID: ${chat.id}`)
    setTimeout(() => setCopiedChatId(false), 2000)
  }

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: false,
    })
  }

  // Scroll to replied message and highlight it
  const handleScrollToReply = (replyId: number) => {
    const el = document.getElementById(`msg-${replyId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('reply-highlight')
      setTimeout(() => el.classList.remove('reply-highlight'), 1800)
    } else {
      showToast(`Original message #${replyId} not in loaded history`)
    }
  }

  /**
   * Rich text renderer supporting:
   * 1. Telegram DC Entities (bold, italic, code, pre, text_url, etc.)
   * 2. Raw Markdown syntax (**bold**, __italic__, `code`, ```code blocks```, [links](url))
   * 3. Clickable URLs, tg:// deep links, t.me links, @mentions
   * 4. BiDi / RTL text direction
   */
  const renderFormattedText = (text: string, entities?: MessageEntityItem[]) => {
    if (!text) return null

    // Helper to render inline tokens (links, mentions, code, bold, italic)
    const renderInlineTokens = (str: string, keyPrefix: string) => {
      // Token regex for URLs, Telegram links, mentions, markdown bold/italic/code
      const tokenRegex =
        /(```[\s\S]*?```|`[^`\n]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+|tg:\/\/[^\s]+|\bt\.me\/[a-zA-Z0-9_]+(?:\/[0-9]+)?|@[a-zA-Z0-9_]{3,32})/g

      const parts = str.split(tokenRegex)

      return parts.map((part, index) => {
        if (!part) return null
        const partKey = `${keyPrefix}-${index}`

        // Code block: ```lang\ncode\n```
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3).replace(/^\n/, '')
          return (
            <pre
              key={partKey}
              className="my-1.5 p-3 rounded-xl bg-black/50 text-accent-cyan font-mono text-xs overflow-x-auto border border-white/10 select-text"
              dir="ltr"
            >
              <code>{content}</code>
            </pre>
          )
        }

        // Inline code: `code`
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={partKey}
              className="px-1.5 py-0.5 rounded-md bg-black/40 text-accent-cyan font-mono text-[11px] border border-white/10"
              dir="ltr"
            >
              {part.slice(1, -1)}
            </code>
          )
        }

        // Bold: **text**
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={partKey} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          )
        }

        // Italic: __text__
        if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
          return (
            <em key={partKey} className="italic text-gray-200">
              {part.slice(2, -2)}
            </em>
          )
        }

        // Markdown Link: [Title](url)
        const mdLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
        if (mdLinkMatch) {
          const [, title, url] = mdLinkMatch
          return (
            <a
              key={partKey}
              href={url}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.guidegram?.openExternal?.(url)
              }}
              className="text-accent-cyan underline hover:text-cyan-300 transition-colors font-medium cursor-pointer"
              title={`Open ${url}`}
            >
              {title}
            </a>
          )
        }

        // Strip trailing punctuation from standalone URLs
        let cleanPart = part
        let trailingPunct = ''
        if (
          cleanPart.startsWith('http://') ||
          cleanPart.startsWith('https://') ||
          cleanPart.startsWith('tg://')
        ) {
          const match = cleanPart.match(/([.,!?;:)>\]]+)$/)
          if (match) {
            trailingPunct = match[1]
            cleanPart = cleanPart.slice(0, -trailingPunct.length)
          }
        }

        // Telegram Deep Link (tg://...)
        if (cleanPart.startsWith('tg://')) {
          return (
            <React.Fragment key={partKey}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  window.guidegram?.openExternal?.(cleanPart)
                }}
                className="text-primary-300 font-mono hover:underline inline-flex items-center gap-0.5 cursor-pointer bg-white/5 px-1 rounded"
                title={`Telegram Deep Link: ${cleanPart}`}
              >
                {cleanPart}
              </button>
              {trailingPunct}
            </React.Fragment>
          )
        }

        // Telegram t.me link (e.g. t.me/username or https://t.me/username)
        const tMeMatch = cleanPart.match(/^(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{3,32})(?:\/([0-9]+))?$/)
        if (tMeMatch) {
          const username = tMeMatch[1]
          const targetMsgId = tMeMatch[2]
          return (
            <React.Fragment key={partKey}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onSelectUserOrChat) {
                    onSelectUserOrChat(username)
                  } else {
                    window.guidegram?.openExternal?.(cleanPart.startsWith('http') ? cleanPart : `https://${cleanPart}`)
                  }
                }}
                className="text-accent-cyan underline hover:text-cyan-300 transition-colors font-medium inline cursor-pointer"
                title={`Open @${username}${targetMsgId ? ` message #${targetMsgId}` : ''}`}
              >
                {cleanPart}
              </button>
              {trailingPunct}
            </React.Fragment>
          )
        }

        // Standard Web URL
        if (cleanPart.startsWith('http://') || cleanPart.startsWith('https://')) {
          return (
            <React.Fragment key={partKey}>
              <a
                href={cleanPart}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.guidegram?.openExternal?.(cleanPart)
                }}
                className="text-accent-cyan underline hover:text-cyan-300 transition-colors break-all inline cursor-pointer"
                title={`Open ${cleanPart}`}
              >
                {cleanPart}
              </a>
              {trailingPunct}
            </React.Fragment>
          )
        }

        // User Mentions (@username)
        if (cleanPart.startsWith('@')) {
          const username = cleanPart.slice(1)
          return (
            <button
              key={partKey}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onSelectUserOrChat) {
                  onSelectUserOrChat(username)
                } else {
                  window.guidegram?.openExternal?.(`https://t.me/${username}`)
                }
              }}
              className="text-accent-cyan font-semibold hover:underline inline cursor-pointer"
              title={`Open @${username}`}
            >
              {cleanPart}
            </button>
          )
        }

        return <span key={partKey}>{part}</span>
      })
    }

    // Split paragraphs to handle BiDi per block
    const paragraphs = text.split('\n')
    return (
      <div className="space-y-1">
        {paragraphs.map((para, pIdx) => {
          if (!para) return <div key={pIdx} className="h-2" />
          const paraIsRtl = isRTL(para)

          return (
            <div
              key={pIdx}
              dir={paraIsRtl ? 'rtl' : 'ltr'}
              className={`leading-relaxed break-words ${
                paraIsRtl ? 'text-right font-sans' : 'text-left font-sans'
              }`}
            >
              {renderInlineTokens(para, `p-${pIdx}`)}
            </div>
          )
        })}
      </div>
    )
  }

  // Render media cards (Photo, Video, Document, Voice, Web Preview)
  const renderMediaCard = (msg: MessageItem) => {
    const mediaUrl = downloadedMedia[msg.id] || msg.mediaUrl

    // 1. Photo Card
    // 1. Sticker (Transparent, bubbleless image)
    if (msg.isSticker || msg.mediaType === 'sticker') {
      if (!mediaUrl) {
        requestMediaDownload(msg, false)
      }
      return (
        <div className="my-1 max-w-[200px] max-h-[200px] flex items-center justify-center">
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt="Telegram Sticker"
              className="w-44 h-44 object-contain transition-transform duration-150 hover:scale-105 select-none"
            />
          ) : (
            <div
              onClick={() => requestMediaDownload(msg, false)}
              className="w-36 h-36 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer hover:bg-white/10 transition-colors"
            >
              {loadingMediaIds[msg.id] ? (
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-6 h-6 text-primary-400" />
              )}
              <span className="text-[10px] font-medium">
                {loadingMediaIds[msg.id] ? 'Loading sticker...' : 'Load sticker'}
              </span>
            </div>
          )}
        </div>
      )
    }

    if (msg.mediaType === 'photo') {
      // Trigger lazy download if not present
      if (!mediaUrl) {
        requestMediaDownload(msg, false)
      }

      return (
        <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-white/10 bg-dark-900/50">
          {mediaUrl ? (
            <div className="relative group cursor-pointer" onClick={() => setLightboxUrl(mediaUrl)}>
              <img
                src={mediaUrl}
                alt="Telegram Photo"
                className="w-full max-h-80 object-cover rounded-2xl transition-transform duration-200 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                <span className="p-2 bg-dark-900/80 rounded-xl text-white shadow-md">
                  <Maximize2 className="w-4 h-4" />
                </span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => requestMediaDownload(msg, false)}
              className="w-72 h-48 bg-dark-850 flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer hover:bg-dark-800 transition-colors"
            >
              {loadingMediaIds[msg.id] ? (
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-6 h-6 text-primary-400" />
              )}
              <span className="text-[11px] font-medium">
                {loadingMediaIds[msg.id] ? 'Loading image...' : 'Click to load image'}
              </span>
            </div>
          )}
        </div>
      )
    }

    // 2. Video Card
    if (msg.mediaType === 'video') {
      const fullVideoUrl = downloadedMedia[`${msg.id}`] || (msg.mediaFilePath ? `guidegram-media://${encodeURIComponent(msg.mediaFilePath)}` : null)
      const thumbUrl = downloadedMedia[`${msg.id}_thumb`] || msg.mediaUrl
      const isThisVideoPlaying = activeVideoId === msg.id

      // Auto-fetch thumbnail if not yet available
      if (!thumbUrl && !downloadedMedia[`${msg.id}_thumb`]) {
        requestMediaDownload(msg, true)
      }

      // If active video is playing and we have the video URL
      if (isThisVideoPlaying && fullVideoUrl) {
        return (
          <div className="mb-2 w-full max-w-md">
            <VideoPlayer
              src={fullVideoUrl}
              poster={thumbUrl}
              fileName={msg.mediaFileName}
              duration={msg.mediaDuration}
              onClose={() => setActiveVideoId(null)}
              onShowToast={showToast}
            />
          </div>
        )
      }

      const isLoadingVideo = loadingMediaIds[`${msg.id}`]

      return (
        <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-white/10 bg-dark-850/90 shadow-md group/video">
          {/* Poster or Thumbnail with Circular Play Button */}
          <div
            onClick={async () => {
              if (fullVideoUrl) {
                setActiveVideoId(msg.id)
              } else {
                showToast('Buffering video...')
                const videoDataUrl = await requestMediaDownload(msg, false)
                if (videoDataUrl) {
                  setActiveVideoId(msg.id)
                } else {
                  showToast('Failed to load video stream')
                }
              }
            }}
            className="relative w-full h-48 bg-dark-900 cursor-pointer overflow-hidden flex items-center justify-center"
          >
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt="Video Thumbnail"
                className="w-full h-full object-cover group-hover/video:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="absolute inset-0 bg-linear-to-br from-primary-900/40 via-dark-850 to-dark-900 flex items-center justify-center">
                <Play className="w-12 h-12 text-white/20" />
              </div>
            )}

            {/* Dark Overlay with Blur on Hover */}
            <div className="absolute inset-0 bg-black/35 group-hover/video:bg-black/20 transition-colors" />

            {/* Play Button or Loading Spinner */}
            <div className="relative z-10 w-14 h-14 rounded-full bg-primary-600/90 hover:bg-primary-500 text-white flex items-center justify-center shadow-glow group-hover/video:scale-110 active:scale-95 transition-all">
              {isLoadingVideo ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </div>

            {/* Duration Badge Bottom Right */}
            {msg.mediaDuration && (
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono font-medium text-white flex items-center gap-1">
                <span>{formatDuration(msg.mediaDuration)}</span>
              </div>
            )}

            {/* File Size Badge Bottom Left */}
            {msg.mediaFileSize && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono font-medium text-gray-300">
                {formatFileSize(msg.mediaFileSize)}
              </div>
            )}
          </div>

          {/* Video Footer info */}
          <div className="p-2.5 flex items-center justify-between gap-2 border-t border-white/5">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-200 truncate">
                {msg.mediaFileName || 'Video'}
              </div>
              <div className="text-[10px] text-gray-400">
                Click to stream and play with full speed controls
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 3. Document / File Card
    if (msg.mediaType === 'document') {
      return (
        <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-white/10 bg-dark-850/80 p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-200 truncate">
                {msg.mediaFileName || 'Attached File'}
              </div>
              <div className="text-[10px] text-gray-400">
                {formatFileSize(msg.mediaFileSize)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => requestMediaDownload(msg, false)}
              title="Download File"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )
    }

    // 4. Voice / Audio Card with Waveform & Speed Switcher
    if (msg.isVoice || msg.mediaType === 'voice') {
      const isPlaying = playingVoiceId === msg.id
      const isLoading = loadingMediaIds[msg.id]
      const duration = msg.mediaDuration || 0
      const currentPos = isPlaying ? voiceCurrentTime : 0
      const progressRatio = duration > 0 ? Math.min(1, currentPos / duration) : 0

      // Normalize waveform bars (up to 32 bars)
      const rawWaveform = msg.voiceWaveform || [40, 70, 30, 90, 60, 45, 80, 55, 35, 65, 85, 40, 60, 30, 80, 50]
      const bars = rawWaveform.slice(0, 36)

      return (
        <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-white/10 bg-dark-850/90 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Play / Pause button */}
            <button
              type="button"
              onClick={() => handlePlayVoice(msg)}
              className="w-10 h-10 rounded-xl bg-accent-emerald/25 hover:bg-accent-emerald text-accent-emerald hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
              title={isPlaying ? 'Pause' : 'Play Voice Message'}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Waveform and scrubber */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-0.5 h-6 cursor-pointer">
                {bars.map((val, i) => {
                  const barProgress = i / bars.length
                  const isPassed = barProgress <= progressRatio
                  const heightPercent = Math.max(15, Math.min(100, Math.round((val / 255) * 100) || val))
                  return (
                    <div
                      key={i}
                      style={{ height: `${heightPercent}%` }}
                      className={`w-1 rounded-full transition-colors ${
                        isPassed ? 'bg-accent-emerald' : 'bg-white/20'
                      }`}
                    />
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                <span>
                  {isPlaying
                    ? `${formatDuration(Math.round(voiceCurrentTime))} / ${formatDuration(duration)}`
                    : `Voice • ${formatDuration(duration)}`}
                </span>

                {/* 1x / 1.5x / 2x Speed Controller */}
                <button
                  type="button"
                  onClick={handleToggleVoiceSpeed}
                  title="Toggle playback speed"
                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-mono text-[9px] transition-colors cursor-pointer"
                >
                  {voicePlaybackSpeed}x
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 5. Web Page Preview Card
    if (msg.webPage) {
      const wp = msg.webPage
      return (
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (wp.url) window.guidegram?.openExternal?.(wp.url)
          }}
          className="mt-2 p-3 rounded-2xl bg-black/30 border-l-2 border-primary-500 hover:bg-black/45 transition-colors cursor-pointer text-left"
          dir={isRTL(wp.title || wp.description) ? 'rtl' : 'ltr'}
        >
          {wp.siteName && (
            <div className="text-[10px] font-bold text-primary-400 mb-0.5 flex items-center gap-1">
              <span>{wp.siteName}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </div>
          )}
          {wp.title && (
            <div className="text-xs font-bold text-gray-100 line-clamp-1 mb-0.5">{wp.title}</div>
          )}
          {wp.description && (
            <div className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
              {wp.description}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  if (!chat) {
    return (
      <div className="flex-1 min-w-0 bg-dark-900 flex flex-col items-center justify-center text-gray-500 gap-3 select-none">
        <div className="w-16 h-16 rounded-3xl bg-dark-800/80 border border-white/5 flex items-center justify-center text-gray-400 shadow-glow">
          <Forward className="w-8 h-8" />
        </div>
        <div className="text-sm font-semibold text-gray-300">Select a conversation to start chatting</div>
        <div className="text-xs text-gray-600">
          Guidegram • Multi-Account • Fast Direct Forward (Alt+F)
        </div>
      </div>
    )
  }

  const isChannel = chat.isChannel
  const isGroup = chat.isGroup
  const isBot = chat.isBot

  return (
    <div className="relative flex-1 min-w-0 bg-dark-900 flex flex-col h-full overflow-hidden titlebar-no-drag">
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 right-6 z-50 px-4 py-2.5 rounded-2xl bg-dark-800/95 border border-primary-500/30 text-xs font-semibold text-white shadow-glow flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
          <Check className="w-4 h-4 text-accent-emerald shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Chat Header with Generous Spacing & Clickable Channel Info */}
      <div className="h-16 shrink-0 bg-dark-850/90 border-b border-white/5 px-4 flex items-center justify-between backdrop-blur-md z-20 shadow-sm">
        {/* Clickable Header Profile Button */}
        <div
          onClick={handleOpenInfo}
          title="Click to view channel/chat details"
          className="flex items-center gap-3 hover:bg-white/5 p-1.5 -ml-1.5 rounded-2xl transition-colors cursor-pointer group max-w-lg"
        >
          <Avatar
            accountId={chat.accountId}
            peerId={chat.id}
            title={chat.title}
            initials={chat.avatarInitials}
            avatarUrl={chat.avatarUrl}
            size="md"
            className="ring-2 ring-transparent group-hover:ring-primary-500/50 transition-all"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                dir={isRTL(chat.title) ? 'rtl' : 'ltr'}
                className="text-xs font-bold text-gray-100 group-hover:text-primary-300 transition-colors truncate"
              >
                {chat.title}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            <div className="text-[11px] text-gray-400 truncate">
              {isChannel
                ? 'Broadcast Channel'
                : isGroup
                ? 'Group Chat'
                : isBot
                ? 'Bot'
                : 'Online'}
            </div>
          </div>
        </div>

        {/* Quick Action Tools */}
        <div className="flex items-center gap-2">
          {/* Chat ID Badge with 1-Click Copy */}
          {showChatId && (
            <button
              onClick={handleCopyChatId}
              title="Click to copy numeric Chat ID"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer"
            >
              <Hash className="w-3.5 h-3.5 text-primary-400" />
              <span>ID: {chat.id}</span>
              {copiedChatId ? (
                <Check className="w-3 h-3 text-accent-emerald" />
              ) : (
                <Copy className="w-3 h-3 text-gray-500" />
              )}
            </button>
          )}

          {/* Ghost Mode Quick Toggle */}
          <button
            onClick={onToggleGhostMode}
            title={ghostMode ? 'Ghost Mode Active (No read receipt sent)' : 'Ghost Mode Off'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              ghostMode
                ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30'
                : 'bg-dark-800 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ghost: {ghostMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* In-Chat Search Toggle (Ctrl+F) */}
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title="Search in Chat (Ctrl+F)"
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              isSearchOpen
                ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                : 'bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Chat Info Drawer Button */}
          <button
            onClick={handleOpenInfo}
            title="Channel / Chat Info"
            className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating In-Chat Search Bar (Ctrl+F) */}
      {isSearchOpen && (
        <div className="shrink-0 px-4 py-2 bg-dark-800/95 border-b border-white/10 flex items-center gap-2 z-20 shadow-md animate-in slide-in-from-top duration-150 backdrop-blur-md">
          <Search className="w-4 h-4 text-primary-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            dir={isRTL(searchQuery) ? 'rtl' : 'ltr'}
            placeholder="Search messages in this conversation... (Esc to close)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-dark-750 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
          />
          {searchQuery && (
            <span className="text-[11px] text-gray-400 px-2">
              {filteredMessages.length} match{filteredMessages.length === 1 ? '' : 'es'}
            </span>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false)
              setSearchQuery('')
            }}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pinned Message Banner */}
      {chatDetails?.pinnedMessage && (
        <div
          onClick={() => handleScrollToReply(chatDetails.pinnedMessage!.id)}
          className="shrink-0 px-4 py-2 bg-dark-850/95 border-b border-white/5 flex items-center justify-between gap-3 cursor-pointer hover:bg-dark-800 transition-colors z-10"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0">
              <Pin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-accent-cyan">Pinned Message</div>
              <div className="text-[10px] text-gray-400 truncate max-w-xl">
                {chatDetails.pinnedMessage.text || `Message #${chatDetails.pinnedMessage.id} (Click to jump)`}
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        </div>
      )}

      {/* 2. Messages Feed */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedMessage(null)
        }}
      >
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 gap-2">
            <div>
              {searchQuery ? `No messages found matching "${searchQuery}"` : 'No messages in this chat yet.'}
            </div>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isSelected = selectedMessage?.id === msg.id

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                onMouseEnter={() => setHoveredMessage(msg)}
                onMouseLeave={() => setHoveredMessage(null)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const selection = window.getSelection()?.toString()
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    message: msg,
                    selectedText: selection && selection.trim() ? selection.trim() : undefined,
                  })
                }}
                onClick={async (e) => {
                  // 64Gram Feature: Quick forward when pressed ctrl
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault()
                    e.stopPropagation()
                    if (onQuickForwardToSaved) {
                      const ok = await onQuickForwardToSaved(msg)
                      if (ok !== false) {
                        showToast(`Forwarded message #${msg.id} to Saved Messages!`)
                      } else {
                        showToast('Failed to forward to Saved Messages')
                      }
                    }
                    return
                  }
                  setSelectedMessage(isSelected ? null : msg)
                }}
                className={`flex flex-col group transition-all select-text ${
                  msg.isOutgoing ? 'items-end' : 'items-start'
                }`}
              >
                <div className="relative max-w-[80%] md:max-w-[70%] flex items-end gap-1.5">
                  {/* Outgoing Message Action Bar */}
                  {msg.isOutgoing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity self-center bg-dark-850/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-md">
                      {quickForwardToSaved && onQuickForwardToSaved && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const ok = await onQuickForwardToSaved(msg)
                            if (ok !== false) {
                              showToast('Forwarded to Saved Messages!')
                            } else {
                              showToast('Failed to forward to Saved Messages')
                            }
                          }}
                          title="Quick Forward to Saved Messages (Ctrl+Click on message)"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDirectForward(msg)
                        }}
                        title="Direct Forward without Quote (Alt+F)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!msg.text || !msg.text.trim()) {
                            showToast(`Message #${msg.id} has no text to copy`)
                            return
                          }
                          navigator.clipboard
                            .writeText(msg.text)
                            .then(() => {
                              showToast(`Copied message #${msg.id} text`)
                            })
                            .catch(() => {
                              showToast('Failed to copy text')
                            })
                        }}
                        title="Copy Text (Alt+C)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteMessage && canDeleteMessage(msg) && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const confirmMsg = alwaysDeleteBoth
                              ? `Delete message #${msg.id} for both sides?`
                              : `Delete message #${msg.id}?`
                            if (window.confirm(confirmMsg)) {
                              const ok = await onDeleteMessage(msg)
                              if (ok !== false) {
                                showToast(`Deleted message #${msg.id}`)
                              } else {
                                showToast('Failed to delete message')
                              }
                            }
                          }}
                          title={alwaysDeleteBoth ? 'Delete for everyone' : 'Delete message'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Group Sender Avatar */}
                  {!msg.isOutgoing && showSenderAvatar && chat.isGroup && (
                    <Avatar
                      accountId={msg.accountId}
                      peerId={msg.senderId}
                      title={msg.senderName || 'Sender'}
                      initials={(msg.senderName || 'U').substring(0, 2).toUpperCase()}
                      size="sm"
                      className="shrink-0 self-end mb-1"
                    />
                  )}

                  {/* Message Bubble (Stickers render transparently without bubble frame) */}
                  <div
                    className={`transition-all ${
                      msg.isSticker || msg.mediaType === 'sticker'
                        ? 'bg-transparent p-0'
                        : `rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                            msg.isOutgoing
                              ? 'bg-primary-600 text-white rounded-br-sm'
                              : 'bg-dark-800 text-gray-200 border border-white/5 rounded-bl-sm'
                          }`
                    } ${isSelected ? 'ring-2 ring-primary-400' : ''}`}
                  >
                    {/* Group Sender Name */}
                    {!msg.isOutgoing && chat.isGroup && msg.senderName && (
                      <div className="text-[11px] font-bold text-accent-cyan mb-1">
                        {msg.senderName}
                      </div>
                    )}

                    {/* Forwarded Header */}
                    {msg.isForwarded && (
                      <div className="text-[10px] text-primary-200/90 font-medium mb-1.5 flex items-center gap-1">
                        <Forward className="w-3 h-3 inline" />
                        <span>Forwarded from {msg.forwardFromName || 'unknown'}</span>
                      </div>
                    )}

                    {/* Reply Quote Banner */}
                    {msg.replyToMsgId && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          handleScrollToReply(msg.replyToMsgId!)
                        }}
                        dir={isRTL(msg.replyTo?.text) ? 'rtl' : 'ltr'}
                        className="mb-2 p-1.5 px-2.5 rounded-xl bg-black/25 hover:bg-black/40 border-l-2 border-accent-cyan cursor-pointer transition-colors flex flex-col text-left"
                      >
                        <div className="text-[10px] font-bold text-accent-cyan flex items-center gap-1">
                          <CornerUpLeft className="w-2.5 h-2.5 shrink-0" />
                          <span>{msg.replyTo?.senderName || 'Reply'}</span>
                        </div>
                        <div className="text-[11px] text-gray-300 truncate max-w-md">
                          {msg.replyTo?.text || `Message #${msg.replyToMsgId}`}
                        </div>
                      </div>
                    )}

                    {/* Media Card (Photo, Video, Document, etc.) */}
                    {renderMediaCard(msg)}

                    {/* Formatted Message Body with Markdown & Entities & RTL */}
                    {msg.text && renderFormattedText(msg.text, msg.entities)}

                    {/* Inline Keyboard Buttons with BiDi / RTL Support */}
                    {msg.replyMarkup &&
                      msg.replyMarkup.rows &&
                      msg.replyMarkup.rows.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                          {msg.replyMarkup.rows.map((row, rIdx) => (
                            <div key={rIdx} className="flex gap-1.5 flex-wrap">
                              {row.map((btn, bIdx) => {
                                const btnIsRtl = isRTL(btn.text)
                                return (
                                  <button
                                    key={bIdx}
                                    dir={btnIsRtl ? 'rtl' : 'ltr'}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (btn.url) {
                                        window.guidegram?.openExternal?.(btn.url)
                                      } else if (btn.data && copyCallbackData) {
                                        navigator.clipboard.writeText(btn.data)
                                        showToast(`Copied callback data: "${btn.data}"`)
                                      }
                                    }}
                                    onContextMenu={(e) => {
                                      if (btn.data && copyCallbackData) {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        navigator.clipboard.writeText(btn.data)
                                        showToast(`Copied callback data: "${btn.data}"`)
                                      }
                                    }}
                                    title={
                                      btn.data
                                        ? `Callback: ${btn.data} (Click/Right-click to copy)`
                                        : btn.url
                                        ? `Open ${btn.url}`
                                        : undefined
                                    }
                                    className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl bg-dark-750 hover:bg-dark-700 active:scale-98 text-gray-200 hover:text-white text-xs font-medium transition-all border border-white/5 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <span className="truncate">{btn.text}</span>
                                    {btn.url && (
                                      <ExternalLink className="w-3 h-3 text-gray-300 shrink-0" />
                                    )}
                                    {btn.data && copyCallbackData && (
                                      <span className="text-[9px] px-1 py-0.2 bg-black/40 rounded text-accent-cyan font-mono shrink-0">
                                        DATA
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Telegram Reactions Pills (❤️ 12, 🔥 5) */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2 pt-1">
                        {msg.reactions.map((rx, rIdx) => (
                          <div
                            key={rIdx}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-transform hover:scale-105 select-none ${
                              rx.chosen
                                ? 'bg-primary-500/25 border-primary-400 text-primary-200'
                                : 'bg-black/30 border-white/10 text-gray-200'
                            }`}
                          >
                            <span>{rx.emoji}</span>
                            <span className="text-[10px] opacity-80">{rx.count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Footer: ID + Seconds Timestamp + Status */}
                    <div
                      className={`text-[10px] flex items-center justify-end gap-1.5 mt-1.5 ${
                        msg.isOutgoing ? 'text-primary-200' : 'text-gray-500'
                      }`}
                    >
                      {showMessageId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(msg.id.toString())
                            showToast(`Copied Message ID #${msg.id}`)
                          }}
                          title="Click to copy Message ID"
                          className="opacity-60 hover:opacity-100 px-1 py-0.2 rounded bg-black/20 hover:bg-black/40 font-mono transition-opacity flex items-center gap-0.5 cursor-pointer"
                        >
                          <Hash className="w-2.5 h-2.5" />
                          <span>{msg.id}</span>
                        </button>
                      )}

                      <span>{formatMessageTime(msg.date)}</span>
                      {msg.isOutgoing && <CheckCheck className="w-3 h-3 inline" />}
                    </div>
                  </div>

                  {/* Incoming Message Action Bar */}
                  {!msg.isOutgoing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity self-center bg-dark-850/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-md">
                      {quickForwardToSaved && onQuickForwardToSaved && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const ok = await onQuickForwardToSaved(msg)
                            if (ok !== false) {
                              showToast('Forwarded to Saved Messages!')
                            } else {
                              showToast('Failed to forward to Saved Messages')
                            }
                          }}
                          title="Quick Forward to Saved Messages (Ctrl+Click on message)"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDirectForward(msg)
                        }}
                        title="Direct Forward without Quote (Alt+F)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!msg.text || !msg.text.trim()) {
                            showToast(`Message #${msg.id} has no text to copy`)
                            return
                          }
                          navigator.clipboard
                            .writeText(msg.text)
                            .then(() => {
                              showToast(`Copied message #${msg.id} text`)
                            })
                            .catch(() => {
                              showToast('Failed to copy text')
                            })
                        }}
                        title="Copy Text (Alt+C)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteMessage && canDeleteMessage(msg) && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const confirmMsg = alwaysDeleteBoth
                              ? `Delete message #${msg.id} for both sides?`
                              : `Delete message #${msg.id}?`
                            if (window.confirm(confirmMsg)) {
                              const ok = await onDeleteMessage(msg)
                              if (ok !== false) {
                                showToast(`Deleted message #${msg.id}`)
                              } else {
                                showToast('Failed to delete message')
                              }
                            }
                          }}
                          title={alwaysDeleteBoth ? 'Delete for everyone' : 'Delete message'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Box OR Broadcast Channel Bottom Action Bar */}
      <div className="shrink-0 p-3 bg-dark-850/80 border-t border-white/5 backdrop-blur-md">
        {chatDetails?.canSendMessages === false || (isChannel && !chatDetails?.canSendMessages) ? (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`w-full max-w-sm py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                isMuted
                  ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-glow'
                  : 'bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/10'
              }`}
            >
              {isMuted ? (
                <>
                  <Volume2 className="w-4 h-4 text-white" />
                  <span>UNMUTE CHANNEL</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-gray-400" />
                  <span>MUTE CHANNEL</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-200 rounded-xl hover:bg-dark-800 transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              dir={isRTL(inputText) ? 'rtl' : 'ltr'}
              placeholder="Write a message... (Alt+F to forward, Alt+C to copy text)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-dark-800 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:hover:bg-primary-600 text-white rounded-xl transition-all shadow-glow flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* 4. Channel / User Info Drawer */}
      {isInfoOpen && (
        <div className="absolute inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-80 md:w-96 h-full bg-dark-900 border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 select-none"
          >
            {/* Drawer Header */}
            <div className="h-16 px-5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="text-sm font-bold text-gray-100">
                {isChannel ? 'Channel Info' : isGroup ? 'Group Info' : 'User Info'}
              </div>
              <button
                onClick={() => setIsInfoOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Avatar & Title Hero */}
              <div className="flex flex-col items-center text-center">
                <Avatar
                  accountId={chat.accountId}
                  peerId={chat.id}
                  title={chatDetails?.title || chat.title}
                  initials={chat.avatarInitials}
                  avatarUrl={chatDetails?.avatarUrl || chat.avatarUrl}
                  size="xl"
                  className="mb-3 cursor-pointer"
                />

                <h3
                  dir={isRTL(chatDetails?.title || chat.title) ? 'rtl' : 'ltr'}
                  className="text-base font-bold text-white mb-1 px-2"
                >
                  {chatDetails?.title || chat.title}
                </h3>

                <div className="text-xs text-gray-400 flex items-center gap-1.5">
                  {isChannel ? (
                    <span className="flex items-center gap-1 text-primary-400">
                      <Radio className="w-3 h-3" />
                      <span>Broadcast Channel</span>
                    </span>
                  ) : isGroup ? (
                    <span className="flex items-center gap-1 text-accent-cyan">
                      <Users className="w-3 h-3" />
                      <span>Group Chat</span>
                    </span>
                  ) : isBot ? (
                    <span className="flex items-center gap-1 text-accent-violet">
                      <Bot className="w-3 h-3" />
                      <span>Bot</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-300">
                      <User className="w-3 h-3" />
                      <span>Personal Contact</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Members / Subscribers Count */}
              {chatDetails?.membersCount != null && (
                <div className="p-3 rounded-2xl bg-dark-850/90 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Users className="w-4 h-4 text-primary-400" />
                    <span>{isChannel ? 'Subscribers' : 'Members'}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-100">
                    {formatNumber(chatDetails.membersCount)}
                  </span>
                </div>
              )}

              {/* Username Card */}
              {chatDetails?.username && (
                <div className="p-3 rounded-2xl bg-dark-850/90 border border-white/5 space-y-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Username
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        window.guidegram?.openExternal?.(`https://t.me/${chatDetails.username}`)
                      }}
                      className="text-xs font-semibold text-accent-cyan hover:underline cursor-pointer"
                    >
                      @{chatDetails.username}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`@${chatDetails.username}`)
                        showToast(`Copied @${chatDetails.username}`)
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      title="Copy username"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bio / Description Card */}
              {chatDetails?.about && (
                <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    About / Description
                  </div>
                  <div
                    dir={isRTL(chatDetails.about) ? 'rtl' : 'ltr'}
                    className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap select-text"
                  >
                    {renderFormattedText(chatDetails.about)}
                  </div>
                </div>
              )}

              {/* Chat ID Card */}
              <div className="p-3 rounded-2xl bg-dark-850/90 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Hash className="w-4 h-4 text-primary-400" />
                  <span>Numeric Chat ID</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-gray-200">{chat.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyChatId}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                    title="Copy numeric ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notifications Toggle */}
              <div className="p-3 rounded-2xl bg-dark-850/90 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-accent-rose" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-accent-emerald" />
                  )}
                  <span>Notifications</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-accent-rose/20 text-accent-rose border border-accent-rose/30'
                      : 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                  }`}
                >
                  {isMuted ? 'Muted' : 'Enabled'}
                </button>
              </div>

              {/* External Navigation CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = chatDetails?.username
                      ? `https://t.me/${chatDetails.username}`
                      : `tg://resolve?domain=${chat.id}`
                    window.guidegram?.openExternal?.(target)
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-glow flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Telegram Official</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Fullscreen Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150 select-none"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const a = document.createElement('a')
                a.href = lightboxUrl
                a.download = `photo_${Date.now()}.jpg`
                a.click()
              }}
              title="Download photo"
              className="p-2.5 rounded-xl bg-dark-800/80 hover:bg-dark-750 text-white transition-colors cursor-pointer"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              title="Close (Esc)"
              className="p-2.5 rounded-xl bg-dark-800/80 hover:bg-dark-750 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <img
            src={lightboxUrl}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* 6. Telegram Desktop Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 340),
            left: Math.min(contextMenu.x, window.innerWidth - 220),
          }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-52 bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
        >
          {/* Quote Selection into Input (if text selected) */}
          {contextMenu.selectedText && (
            <button
              type="button"
              onClick={() => {
                const quoteText = `> ${contextMenu.selectedText}\n`
                setInputText((prev) => (prev ? `${prev}\n${quoteText}` : quoteText))
                setContextMenu(null)
                showToast('Quoted selected text')
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-primary-300 hover:text-white hover:bg-primary-600/30 transition-colors text-left cursor-pointer"
            >
              <Quote className="w-3.5 h-3.5 shrink-0 text-primary-400" />
              <span>Quote Selection</span>
            </button>
          )}

          {/* Copy Selected Text */}
          {contextMenu.selectedText && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.selectedText!)
                setContextMenu(null)
                showToast('Copied selected text')
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span>Copy Selected Text</span>
            </button>
          )}

          {/* Copy Entire Message Text */}
          {contextMenu.message.text && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.message.text || '')
                setContextMenu(null)
                showToast(`Copied message #${contextMenu.message.id} text`)
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span>Copy Message Text</span>
            </button>
          )}

          {/* Copy Link to Message */}
          <button
            type="button"
            onClick={() => {
              const link = chat.username
                ? `https://t.me/${chat.username}/${contextMenu.message.id}`
                : `https://t.me/c/${chat.id.replace(/^-100/, '')}/${contextMenu.message.id}`
              navigator.clipboard.writeText(link)
              setContextMenu(null)
              showToast('Copied link to message')
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span>Copy Message Link</span>
          </button>

          {/* Direct Forward without quote (Alt+F) */}
          <button
            type="button"
            onClick={() => {
              const msg = contextMenu.message
              setContextMenu(null)
              onOpenDirectForward(msg)
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
          >
            <Forward className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span>Forward (Alt+F)</span>
          </button>

          {/* Quick Forward to Saved Messages */}
          {quickForwardToSaved && onQuickForwardToSaved && (
            <button
              type="button"
              onClick={async () => {
                const msg = contextMenu.message
                setContextMenu(null)
                const ok = await onQuickForwardToSaved(msg)
                if (ok !== false) {
                  showToast('Saved to Saved Messages!')
                } else {
                  showToast('Failed to save message')
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0 text-accent-cyan" />
              <span>Save to Saved Messages</span>
            </button>
          )}

          <div className="h-px bg-white/5 my-1" />

          {/* Delete Message (Permission Checked) */}
          {onDeleteMessage && canDeleteMessage(contextMenu.message) && (
            <button
              type="button"
              onClick={async () => {
                const msg = contextMenu.message
                setContextMenu(null)
                const confirmMsg = alwaysDeleteBoth
                  ? `Delete message #${msg.id} for both sides?`
                  : `Delete message #${msg.id}?`
                if (window.confirm(confirmMsg)) {
                  const ok = await onDeleteMessage(msg)
                  if (ok !== false) {
                    showToast(`Deleted message #${msg.id}`)
                  } else {
                    showToast('Failed to delete message')
                  }
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-accent-rose hover:bg-accent-rose/15 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{alwaysDeleteBoth ? 'Delete for Everyone' : 'Delete Message'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

import React, { useState, useMemo, useEffect } from 'react'
import {
  X,
  BarChart2,
  Users,
  MessageSquare,
  Clock,
  Calendar,
  Smile,
  FileText,
  Image,
  Video,
  Mic,
  Shield,
  User,
  Sparkles,
  TrendingUp,
  Share2,
  Check,
  RefreshCw,
} from 'lucide-react'
import { DialogItem, MessageItem, ChatDetails } from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'

interface GroupStatsModalProps {
  isOpen: boolean
  onClose: () => void
  chat: DialogItem
  chatDetails?: ChatDetails | null
  messages: MessageItem[]
}

type Timeframe = 'today' | 'yesterday' | 'week' | 'month' | 'all'

// Common Persian & English stopwords to exclude from top words
const STOPWORDS = new Set([
  // Persian
  'و', 'در', 'به', 'از', 'که', 'این', 'رو', 'را', 'با', 'است', 'برای', 'آن', 'یک', 'شد', 'شده',
  'بود', 'ها', 'های', 'می', 'تا', 'کند', 'کرد', 'کرده', 'هم', 'نیز', 'یا', 'اما', 'بر', 'چون',
  'اگر', 'همه', 'نه', 'باید', 'او', 'ما', 'شما', 'آنها', 'من', 'تو', 'دیگر', 'پس', 'چند',
  'بی', 'دارد', 'داشته', 'باشد', 'باشند', 'کنید', 'کنم', 'کنه', 'بشه', 'شدن', 'هست', 'نیست',
  'چی', 'چیه', 'کی', 'کجا', 'چرا', 'چطور', 'خیلی', 'خوب', 'بله', 'آره', 'سلام', 'درود',
  // English
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on',
  'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we',
  'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into',
  'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now',
  'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
  'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any',
  'these', 'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'am', 'been',
])

export const GroupStatsModal: React.FC<GroupStatsModalProps> = ({
  isOpen,
  onClose,
  chat,
  chatDetails,
  messages,
}) => {
  const { t, language, formatNumber } = useI18n()
  const isPersian = language === 'fa'

  const [timeframe, setTimeframe] = useState<Timeframe>('week')
  const [activeTab, setActiveTab] = useState<'overview' | 'senders' | 'hours' | 'words' | 'media' | 'joins'>('overview')
  const [copied, setCopied] = useState(false)

  // Accumulate local + server historical messages so stats can evaluate yesterday, week, month
  const [allMessages, setAllMessages] = useState<MessageItem[]>(messages)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)

  useEffect(() => {
    setAllMessages((prev) => {
      const map = new Map<number, MessageItem>()
      for (const m of messages) map.set(m.id, m)
      for (const m of prev) map.set(m.id, m)
      return Array.from(map.values())
    })
  }, [messages])

  // Fetch older messages batch from MTProto server
  const loadHistoryBatch = async (count = 150) => {
    if (!window.guidegram?.getHistoricalMessages || !chat?.accountId) return
    setIsLoadingHistory(true)
    try {
      const oldestDate = allMessages.length > 0
        ? Math.min(...allMessages.map((m) => m.date))
        : Date.now()
      const offsetSeconds = Math.floor(oldestDate / 1000)

      const older = await window.guidegram.getHistoricalMessages(
        chat.accountId,
        chat.id,
        count,
        offsetSeconds
      )

      if (older && older.length > 0) {
        setAllMessages((prev) => {
          const map = new Map<number, MessageItem>()
          for (const m of prev) map.set(m.id, m)
          for (const m of older) map.set(m.id, m)
          return Array.from(map.values())
        })
      } else {
        setHasMoreHistory(false)
      }
    } catch (err) {
      console.error('Failed to load historical messages:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf)
    if (tf !== 'today' && allMessages.length < 150 && hasMoreHistory) {
      loadHistoryBatch(200)
    }
  }

  // 1. Filter messages by selected timeframe from full accumulated message pool
  const filteredMessages = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 24 * 3600 * 1000
    const weekStart = now.getTime() - 7 * 24 * 3600 * 1000
    const monthStart = now.getTime() - 30 * 24 * 3600 * 1000

    return allMessages.filter((m) => {
      const msgTime = m.date
      if (timeframe === 'today') return msgTime >= todayStart
      if (timeframe === 'yesterday') return msgTime >= yesterdayStart && msgTime < todayStart
      if (timeframe === 'week') return msgTime >= weekStart
      if (timeframe === 'month') return msgTime >= monthStart
      return true // all
    })
  }, [allMessages, timeframe])

  // 2. Compute Top Senders & Roles
  const { topSenders, adminMessageCount, memberMessageCount, uniqueSendersCount } = useMemo(() => {
    const senderMap = new Map<string, { id: string; name: string; count: number; isAdmin: boolean }>()
    const adminIds = new Set<string>()

    if (chatDetails?.participants) {
      for (const p of chatDetails.participants) {
        if (p.role === 'admin' || p.role === 'creator') {
          adminIds.add(p.id)
        }
      }
    }

    let adminCount = 0
    let memberCount = 0

    for (const m of filteredMessages) {
      const senderId = m.senderId || m.senderName || 'unknown'
      const senderName = m.senderName || (m.isOutgoing ? (isPersian ? 'شما' : 'You') : (isPersian ? 'عضو' : 'Member'))
      const isAdmin = Boolean((m.senderId && adminIds.has(m.senderId)) || !!m.senderRank || m.senderName?.includes('Admin'))

      if (isAdmin) adminCount++
      else memberCount++

      const existing = senderMap.get(senderId)
      if (existing) {
        existing.count++
        if (isAdmin) existing.isAdmin = true
      } else {
        senderMap.set(senderId, {
          id: senderId,
          name: senderName,
          count: 1,
          isAdmin,
        })
      }
    }

    const sorted = Array.from(senderMap.values()).sort((a, b) => b.count - a.count)

    return {
      topSenders: sorted,
      adminMessageCount: adminCount,
      memberMessageCount: memberCount,
      uniqueSendersCount: senderMap.size,
    }
  }, [filteredMessages, chatDetails, isPersian])

  // 3. Hourly Activity (24h)
  const { hourlyDistribution, peakHour, timeSegments } = useMemo(() => {
    const hours = new Array(24).fill(0)
    for (const m of filteredMessages) {
      const h = new Date(m.date).getHours()
      hours[h]++
    }

    let maxHour = 0
    let maxCount = 0
    for (let i = 0; i < 24; i++) {
      if (hours[i] > maxCount) {
        maxCount = hours[i]
        maxHour = i
      }
    }

    const segments = {
      night: hours.slice(0, 6).reduce((a, b) => a + b, 0), // 00-06
      morning: hours.slice(6, 12).reduce((a, b) => a + b, 0), // 06-12
      afternoon: hours.slice(12, 18).reduce((a, b) => a + b, 0), // 12-18
      evening: hours.slice(18, 24).reduce((a, b) => a + b, 0), // 18-24
    }

    return {
      hourlyDistribution: hours,
      peakHour: { hour: maxHour, count: maxCount },
      timeSegments: segments,
    }
  }, [filteredMessages])

  // 4. Message Length & Averages
  const { avgChars, avgWords, totalChars } = useMemo(() => {
    let chars = 0
    let words = 0
    let textMsgCount = 0

    for (const m of filteredMessages) {
      if (m.text) {
        textMsgCount++
        chars += m.text.length
        words += m.text.trim().split(/\s+/).filter(Boolean).length
      }
    }

    return {
      totalChars: chars,
      avgChars: textMsgCount > 0 ? Math.round(chars / textMsgCount) : 0,
      avgWords: textMsgCount > 0 ? Math.round((words / textMsgCount) * 10) / 10 : 0,
    }
  }, [filteredMessages])

  // 5. Top Words Used
  const topWords = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of filteredMessages) {
      if (!m.text) continue
      // Remove links and punctuation, normalize
      const clean = m.text
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»[\]]/g, ' ')
        .toLowerCase()
      const tokens = clean.split(/\s+/).filter((w) => w.length > 2)

      for (const token of tokens) {
        if (STOPWORDS.has(token) || /^\d+$/.test(token)) continue
        counts.set(token, (counts.get(token) || 0) + 1)
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
  }, [filteredMessages])

  // 6. Top Emojis
  const topEmojis = useMemo(() => {
    const emojiMap = new Map<string, number>()
    const emojiRegex = /\p{Extended_Pictographic}/gu

    for (const m of filteredMessages) {
      if (!m.text) continue
      const matches = m.text.match(emojiRegex)
      if (matches) {
        for (const emoji of matches) {
          emojiMap.set(emoji, (emojiMap.get(emoji) || 0) + 1)
        }
      }
    }

    return Array.from(emojiMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
  }, [filteredMessages])

  // 7. Media Breakdown
  const mediaStats = useMemo(() => {
    let text = 0
    let photo = 0
    let video = 0
    let voice = 0
    let document = 0
    let sticker = 0

    for (const m of filteredMessages) {
      if (m.mediaType === 'photo') photo++
      else if (m.mediaType === 'video') video++
      else if (m.isVoice || m.mediaType === 'voice') voice++
      else if (m.isSticker || m.mediaType === 'sticker') sticker++
      else if (m.mediaType === 'document') document++
      else if (m.text) text++
    }

    return { text, photo, video, voice, document, sticker }
  }, [filteredMessages])

  // 8. Member Join Events & Earliest Activity Detection
  const memberJoins = useMemo(() => {
    const joins: Array<{
      id: string
      name: string
      date: number
      method: string
      isServiceAction: boolean
    }> = []

    const seenUsers = new Set<string>()
    const sortedChronological = [...messages].sort((a, b) => a.date - b.date)

    for (const m of sortedChronological) {
      const txt = (m.text || '').toLowerCase()
      const isJoinText =
        txt.includes('joined') ||
        txt.includes('پیوست') ||
        txt.includes('عضو شد') ||
        txt.includes('به گروه آمد') ||
        txt.includes('اضافه شد') ||
        txt.includes('invited')

      const senderId = m.senderId || m.senderName || 'unknown'
      const senderName = m.senderName || 'Member'

      if (isJoinText) {
        joins.push({
          id: senderId,
          name: senderName,
          date: m.date,
          method: txt.includes('link') || txt.includes('لینک') ? 'با لینک دعوت (Invite Link)' : 'افزوده شده توسط کاربر/ادمین',
          isServiceAction: true,
        })
        seenUsers.add(senderId)
      } else if (!seenUsers.has(senderId) && senderId !== 'unknown') {
        seenUsers.add(senderId)
        joins.push({
          id: senderId,
          name: senderName,
          date: m.date,
          method: 'اولین پیام ثبت‌شده در تاریخچه',
          isServiceAction: false,
        })
      }
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 24 * 3600 * 1000
    const weekStart = now.getTime() - 7 * 24 * 3600 * 1000
    const monthStart = now.getTime() - 30 * 24 * 3600 * 1000

    return joins
      .filter((j) => {
        if (timeframe === 'today') return j.date >= todayStart
        if (timeframe === 'yesterday') return j.date >= yesterdayStart && j.date < todayStart
        if (timeframe === 'week') return j.date >= weekStart
        if (timeframe === 'month') return j.date >= monthStart
        return true
      })
      .sort((a, b) => b.date - a.date)
  }, [allMessages, timeframe])

  if (!isOpen) return null

  const totalMessagesCount = filteredMessages.length
  const maxHourlyCount = Math.max(1, ...hourlyDistribution)

  const handleCopyStats = () => {
    const summary = [
      `📊 Statistics for "${chat.title}" (${timeframe.toUpperCase()}):`,
      `• Total Messages: ${totalMessagesCount}`,
      `• Active Members: ${uniqueSendersCount}`,
      `• Members Joined/First Seen: ${memberJoins.length}`,
      `• Peak Hour: ${peakHour.hour}:00 (${peakHour.count} messages)`,
      `• Average Message: ${avgChars} chars / ${avgWords} words`,
      `• Top Sender: ${topSenders[0]?.name || 'N/A'} (${topSenders[0]?.count || 0} messages)`,
      `• Media: ${mediaStats.photo} photos, ${mediaStats.video} videos, ${mediaStats.voice} voice notes`,
    ].join('\n')

    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-modal w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-dark-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2 truncate">
                <span>{t('stats.title')}</span>
              </h2>
              <p className="text-xs text-gray-400 truncate">
                {chat.title} • {formatNumber(totalMessagesCount)} {t('stats.total_messages')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyStats}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Copy Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? t('stats.copied') : t('stats.copy_stats')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeframe Filter Tabs */}
        <div className="px-5 py-3 border-b border-white/5 bg-dark-850/70 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="text-[11px] font-semibold text-gray-400 shrink-0">
            {t('stats.overview')}:
          </div>
          <div className="flex items-center gap-1 bg-dark-900/80 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => handleTimeframeChange('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                timeframe === 'today'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('stats.today')}
            </button>
            <button
              type="button"
              onClick={() => handleTimeframeChange('yesterday')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                timeframe === 'yesterday'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('stats.yesterday')}
            </button>
            <button
              type="button"
              onClick={() => handleTimeframeChange('week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                timeframe === 'week'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('stats.week')}
            </button>
            <button
              type="button"
              onClick={() => handleTimeframeChange('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                timeframe === 'month'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('stats.month')}
            </button>
            <button
              type="button"
              onClick={() => handleTimeframeChange('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                timeframe === 'all'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('stats.all_time')}
            </button>
          </div>
        </div>

        {/* Historical messages loader indicator & action */}
        <div className="px-5 py-2 bg-dark-900/90 border-b border-white/5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            <span>
              {t('stats.messages_analyzed', { count: formatNumber(allMessages.length) })}
            </span>
          </div>
          {hasMoreHistory && (
            <button
              type="button"
              disabled={isLoadingHistory}
              onClick={() => loadHistoryBatch(200)}
              className="px-2.5 py-1 rounded-lg bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              <span>{isLoadingHistory ? t('stats.loading_history') : t('stats.load_more_history', { count: formatNumber(200) })}</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 px-5 bg-dark-900/30 text-xs font-semibold text-gray-400 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-400 font-bold'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t('stats.overview')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('senders')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'senders'
                ? 'border-primary-500 text-primary-400 font-bold'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('stats.senders')} ({formatNumber(topSenders.length)})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hours'
                ? 'border-primary-500 text-primary-400 font-bold'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('stats.hours')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('words')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'words'
                ? 'border-primary-500 text-primary-400 font-bold'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('stats.words')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'media'
                ? 'border-primary-500 text-primary-400 font-bold'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('stats.media')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('joins')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'joins'
                ? 'border-primary-500 text-primary-400 font-bold'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('stats.joins')} ({formatNumber(memberJoins.length)})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-gray-400 font-medium">{t('stats.total_messages')}</span>
                  <span className="text-xl font-bold text-white mt-1">{formatNumber(totalMessagesCount)}</span>
                  <span className="text-[10px] text-primary-400 mt-0.5">{isPersian ? 'در این بازه' : 'In this period'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-gray-400 font-medium">{t('stats.unique_senders')}</span>
                  <span className="text-xl font-bold text-accent-cyan mt-1">{formatNumber(uniqueSendersCount)}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">{isPersian ? 'ارسال‌کننده پیام' : 'Active senders'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-gray-400 font-medium">{isPersian ? 'ساعت اوج چت' : 'Peak Chat Hour'}</span>
                  <span className="text-xl font-bold text-amber-300 mt-1">
                    {peakHour.hour}:00
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {isPersian ? `با ${formatNumber(peakHour.count)} پیام` : `With ${formatNumber(peakHour.count)} msgs`}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-gray-400 font-medium">{isPersian ? 'میانگین طول پیام' : 'Avg Message Length'}</span>
                  <span className="text-xl font-bold text-accent-violet mt-1">{formatNumber(avgChars)}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {isPersian ? `کاراکتر (${formatNumber(avgWords)} کلمه)` : `chars (${formatNumber(avgWords)} words)`}
                  </span>
                </div>
              </div>

              {/* Admin vs Members breakdown */}
              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 space-y-2.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-300">
                    {isPersian ? 'سهم پیام‌های ادمین‌ها و اعضا' : 'Admins vs Members Ratio'}
                  </span>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {formatNumber(adminMessageCount)} Admin • {formatNumber(memberMessageCount)} Member
                  </span>
                </div>
                {/* Ratio Bar */}
                <div className="w-full h-3 bg-dark-950 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${totalMessagesCount > 0 ? (adminMessageCount / totalMessagesCount) * 100 : 0}%`,
                    }}
                    className="bg-accent-cyan h-full transition-all"
                    title={`Admins: ${adminMessageCount} msgs`}
                  />
                  <div
                    style={{
                      width: `${totalMessagesCount > 0 ? (memberMessageCount / totalMessagesCount) * 100 : 0}%`,
                    }}
                    className="bg-primary-500 h-full transition-all"
                    title={`Members: ${memberMessageCount} msgs`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
                    <span>
                      {isPersian ? 'پیام‌های ادمین‌ها: ' : 'Admin Messages: '}
                      {formatNumber(totalMessagesCount > 0 ? Math.round((adminMessageCount / totalMessagesCount) * 100) : 0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                    <span>
                      پیام‌های اعضا:{' '}
                      {totalMessagesCount > 0 ? Math.round((memberMessageCount / totalMessagesCount) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Top 3 senders preview */}
              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-persian">
                  فعال‌ترین اعضای گروه
                </h4>
                <div className="space-y-2">
                  {topSenders.slice(0, 3).map((sender, idx) => {
                    const percent = totalMessagesCount > 0 ? Math.round((sender.count / totalMessagesCount) * 100) : 0
                    return (
                      <div key={sender.id} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-[11px] font-bold font-mono text-gray-500 w-4 text-center">
                            #{idx + 1}
                          </span>
                          <Avatar
                            accountId={chat.accountId}
                            peerId={sender.id}
                            title={sender.name}
                            initials={sender.name.substring(0, 2).toUpperCase()}
                            size="sm"
                          />
                          <span className="font-semibold text-gray-200 truncate">{sender.name}</span>
                          {sender.isAdmin && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-accent-cyan/15 text-accent-cyan font-bold border border-accent-cyan/20 shrink-0 font-persian">
                              ادمین
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          <span className="text-gray-400 text-[11px]">{percent}%</span>
                          <span className="font-bold text-white w-14 text-right">{sender.count} پیام</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOP SENDERS */}
          {activeTab === 'senders' && (
            <div className="space-y-3">
              <div className="text-xs text-gray-400 font-persian flex justify-between items-center">
                <span>ترتیب بیشترین پیام‌های ارسالی توسط اعضا:</span>
                <span className="font-mono">{topSenders.length} کاربر فعال</span>
              </div>

              <div className="space-y-2">
                {topSenders.map((sender, idx) => {
                  const percent = totalMessagesCount > 0 ? Math.round((sender.count / totalMessagesCount) * 100) : 0
                  return (
                    <div
                      key={sender.id}
                      className="p-3 rounded-2xl bg-dark-850/80 border border-white/5 flex flex-col gap-2 hover:bg-dark-800 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={`text-xs font-bold font-mono w-5 text-center ${
                            idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <Avatar
                            accountId={chat.accountId}
                            peerId={sender.id}
                            title={sender.name}
                            initials={sender.name.substring(0, 2).toUpperCase()}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-100 truncate">{sender.name}</span>
                              {sender.isAdmin && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent-cyan/15 text-accent-cyan font-semibold border border-accent-cyan/20">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">ID: {sender.id}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-sm font-bold text-white font-mono">{sender.count}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{percent}% of total</span>
                        </div>
                      </div>

                      {/* Percentage progress bar */}
                      <div className="w-full bg-dark-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          style={{ width: `${Math.max(2, percent)}%` }}
                          className={`h-full rounded-full transition-all ${
                            idx === 0 ? 'bg-amber-400' : sender.isAdmin ? 'bg-accent-cyan' : 'bg-primary-500'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: HOURS & TIME OF DAY */}
          {activeTab === 'hours' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-200 font-persian">توزیع ۲۴ ساعته پیام‌ها</span>
                  <span className="text-amber-300 font-semibold font-persian">
                    بیشترین پیام در ساعت {peakHour.hour}:00 ({peakHour.count} پیام)
                  </span>
                </div>

                {/* 24-hour visual bar chart */}
                <div className="h-40 flex items-end gap-1 pt-4 pb-2 px-1 border-b border-white/10">
                  {hourlyDistribution.map((count, hour) => {
                    const heightPercent = maxHourlyCount > 0 ? (count / maxHourlyCount) * 100 : 0
                    const isPeak = hour === peakHour.hour && count > 0

                    return (
                      <div
                        key={hour}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        {/* Hover count tooltip */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-1.5 py-0.5 rounded bg-black/90 text-[10px] font-mono text-white whitespace-nowrap z-10 border border-white/10">
                          {hour}:00 • {count}
                        </div>

                        <div
                          style={{ height: `${Math.max(4, heightPercent)}%` }}
                          className={`w-full rounded-t-sm transition-all duration-200 ${
                            isPeak
                              ? 'bg-amber-400 shadow-glow'
                              : count > 0
                              ? 'bg-primary-500 group-hover:bg-primary-400'
                              : 'bg-white/5'
                          }`}
                        />
                        <span className="text-[8px] font-mono text-gray-500 mt-1">
                          {hour % 3 === 0 ? hour : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Day Segment Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-dark-850/80 border border-white/5">
                  <div className="text-[11px] text-gray-400 font-persian">شب (00-06)</div>
                  <div className="text-base font-bold text-white mt-1 font-mono">{timeSegments.night}</div>
                </div>
                <div className="p-3 rounded-2xl bg-dark-850/80 border border-white/5">
                  <div className="text-[11px] text-gray-400 font-persian">صبح (06-12)</div>
                  <div className="text-base font-bold text-white mt-1 font-mono">{timeSegments.morning}</div>
                </div>
                <div className="p-3 rounded-2xl bg-dark-850/80 border border-white/5">
                  <div className="text-[11px] text-gray-400 font-persian">عصر (12-18)</div>
                  <div className="text-base font-bold text-white mt-1 font-mono">{timeSegments.afternoon}</div>
                </div>
                <div className="p-3 rounded-2xl bg-dark-850/80 border border-white/5">
                  <div className="text-[11px] text-gray-400 font-persian">غروب و شب (18-24)</div>
                  <div className="text-base font-bold text-white mt-1 font-mono">{timeSegments.evening}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TOP WORDS & EMOJIS */}
          {activeTab === 'words' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Words */}
              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200 font-persian">
                  <MessageSquare className="w-4 h-4 text-primary-400" />
                  <span>بیشترین کلمات استفاده‌شده (Top Words)</span>
                </div>
                {topWords.length === 0 ? (
                  <div className="text-xs text-gray-500 py-6 text-center font-persian">کلمه‌ای یافت نشد</div>
                ) : (
                  <div className="space-y-2">
                    {topWords.map(([word, count], idx) => (
                      <div key={word} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-500 w-4">{idx + 1}</span>
                          <span className="font-semibold text-gray-200 font-persian">{word}</span>
                        </div>
                        <span className="font-mono text-[11px] text-primary-400 bg-primary-950/40 px-2 py-0.5 rounded-lg border border-primary-500/20">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Emojis */}
              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200 font-persian">
                  <Smile className="w-4 h-4 text-amber-400" />
                  <span>بیشترین ایموجی‌های استفاده‌شده (Top Emojis)</span>
                </div>
                {topEmojis.length === 0 ? (
                  <div className="text-xs text-gray-500 py-6 text-center font-persian">ایموجی‌ای یافت نشد</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {topEmojis.map(([emoji, count]) => (
                      <div
                        key={emoji}
                        className="p-2.5 rounded-xl bg-dark-900/60 border border-white/5 flex items-center justify-between"
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="font-mono text-xs text-gray-300 font-semibold">{count} بار</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MEDIA BREAKDOWN */}
          {activeTab === 'media' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono">{mediaStats.text}</div>
                  <div className="text-[11px] text-gray-400 font-persian">پیام متنی</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono">{mediaStats.photo}</div>
                  <div className="text-[11px] text-gray-400 font-persian">عکس (Photo)</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-violet/15 text-accent-violet flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono">{mediaStats.video}</div>
                  <div className="text-[11px] text-gray-400 font-persian">ویدئو (Video)</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-emerald/15 text-accent-emerald flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono">{mediaStats.voice}</div>
                  <div className="text-[11px] text-gray-400 font-persian">ویس (Voice)</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono">{mediaStats.document}</div>
                  <div className="text-[11px] text-gray-400 font-persian">فایل و داکیومنت</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-rose/15 text-accent-rose flex items-center justify-center shrink-0">
                  <Smile className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono">{mediaStats.sticker}</div>
                  <div className="text-[11px] text-gray-400 font-persian">استیکر (Sticker)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MEMBER JOINS & EARLY ACTIVITY */}
          {activeTab === 'joins' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white font-persian">
                    عضویت‌های شناسایی‌شده در تاریخچه ({memberJoins.length})
                  </div>
                  <div className="text-[11px] text-gray-400 font-persian mt-0.5">
                    بر اساس پیام‌های پیوستن و اولین تعاملات ثبت‌شده در تاریخچه محلی چت
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-300 font-mono text-xs font-bold">
                  {memberJoins.length} عضو
                </div>
              </div>

              {memberJoins.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 rounded-2xl bg-dark-850/50 border border-white/5 font-persian leading-relaxed">
                  هیچ پیام پیوستن یا فعالیت جدیدی در این بازه زمانی در تاریخچه چت کاربر یافت نشد.
                  <br />
                  (اگر پیام ورود کاربر در تاریخچه سرور یا کش وجود داشته باشد در این بخش ثبت می‌شود)
                </div>
              ) : (
                <div className="space-y-2">
                  {memberJoins.map((j, idx) => {
                    const d = new Date(j.date)
                    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                    const dateStr = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`

                    return (
                      <div
                        key={`${j.id}_${idx}`}
                        className="p-3 rounded-2xl bg-dark-850/60 border border-white/5 flex items-center justify-between gap-3 hover:bg-dark-800/80 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                            {j.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-200 truncate">
                              {j.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-persian flex items-center gap-1 mt-0.5">
                              <span className={j.isServiceAction ? 'text-accent-cyan' : 'text-gray-400'}>
                                {j.method}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-medium text-gray-300">
                            {timeStr}
                          </div>
                          <div className="text-[10px] font-mono text-gray-500">
                            {dateStr}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

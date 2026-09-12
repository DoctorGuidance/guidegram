import React from 'react'
import { Sparkles, ShieldCheck, Zap, Shield, Smartphone, ArrowRight, X } from 'lucide-react'

interface WhatsNewModalProps {
  isOpen: boolean
  version: string
  onClose: () => void
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  version,
  onClose,
}) => {
  if (!isOpen) return null

  const features = [
    {
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      titleEn: 'Lightning 2s Atomic Updater',
      titleFa: 'به‌روزرسانی صاعقه‌ای و آنی (زیر ۲ ثانیه)',
      descEn: 'Instant background package staging and tree-kill swap. No hanging or waiting.',
      descFa: 'استقرار اتمیک فایل‌ها در پس‌زمینه و جایگزینی فوری بدون قفل شدن فایل یا معطلی.',
    },
    {
      icon: Shield,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      titleEn: 'Multi-Account Hardware Isolation',
      titleFa: 'ایزوله‌سازی پیشرفته پروفایل‌های سخت‌افزاری',
      descEn: 'Anti-fingerprinting layer simulates unique device seeds per account to prevent bans.',
      descFa: 'تفکیک کامل فینگرپرینت و مشخصات دستگاه برای هر اکانت جهت جلوگیری از مسدودسازی.',
    },
    {
      icon: Smartphone,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      titleEn: 'Seamless QR & 2FA Login Flow',
      titleFa: 'پایداری کامل ورود با QR Code و تایید دو مرحله‌ای',
      descEn: 'Resilient MTProto socket reconnects, avoiding premature timeout and IPC drops.',
      descFa: 'رفع قطعی‌های موقت سوکت و تضمین تولید پایدار کدهای ورود بدون خطاهای کاذب.',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-[#0f141c]/95 border border-white/10 rounded-3xl p-6 md:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Background glow accents */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-accent-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 via-accent-cyan to-emerald-400 flex items-center justify-center text-white shadow-[0_0_25px_rgba(14,165,233,0.4)] shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Guidegram Updated
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                v{version}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5" dir="rtl">
              گایدگرام با موفقیت به نسخه جدید ارتقا یافت!
            </p>
          </div>
        </div>

        {/* Zero Data Loss Guarantee Banner */}
        <div className="mb-5 p-3 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-[11.5px] leading-snug">
            <p className="font-semibold text-emerald-300">
              حفظ ۱۰۰٪ داده‌ها و اطلاعات کاربری
            </p>
            <p className="text-gray-400 mt-0.5 text-[10.5px]">
              تمام سشن‌ها، تاریخچه چت‌ها، پروکسی‌ها و تنظیمات شما دست‌نخورده باقی مانده‌اند.
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-2.5 mb-6">
          <div className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1 flex items-center justify-between">
            <span>What's New in this Version</span>
            <span className="font-normal text-[10px] text-gray-500" dir="rtl">
              ویژگی‌های کلیدی این نسخه
            </span>
          </div>

          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all flex items-start gap-3"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${feat.bgColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-xs font-semibold text-gray-200">
                      {feat.titleEn}
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed" dir="rtl">
                    {feat.descFa}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-accent-cyan hover:from-primary-500 hover:to-accent-cyan text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(59,130,246,0.35)] hover:shadow-[0_0_35px_rgba(14,165,233,0.5)] transition-all cursor-pointer group"
        >
          <span>شروع به کار با نسخه جدید</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * تنبيه صغير أسفل الشاشة بدل نافذة alert التي يفرضها المتصفح.
 * سبب الاستبدال: نافذة المتصفح تظهر بلغة النظام واتجاهه، وتوقف الصفحة
 * بالكامل — وكلاهما مربك لمستخدم غير تقني.
 */
export function Toast({
  message,
  tone = 'error',
  onClose,
}: {
  message: string
  tone?: 'error' | 'success'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex max-w-sm animate-fade-in items-start gap-3 rounded-card border border-line bg-card p-4 shadow-pop"
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-input',
          tone === 'error' ? 'bg-danger/12 text-danger' : 'bg-success/12 text-success',
        )}
      >
        {tone === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      </span>

      <p className="flex-1 text-sm font-semibold leading-relaxed text-ink">{message}</p>

      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق التنبيه"
        className="shrink-0 rounded-input p-1 text-ink-muted transition-colors duration-150 hover:bg-page hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

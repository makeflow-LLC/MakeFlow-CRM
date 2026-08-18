'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { COUNTRIES, DEFAULT_DIAL, countryLabel, joinPhone, splitPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

/**
 * حقل رقم الهاتف: مقدّمة البلد مختارة صراحةً، والرقم المحلي بجانبها.
 *
 * يرفع إلى الأعلى الرقم الكامل بصيغة E.164 جاهزاً للحفظ، لا الجزأين، حتى
 * لا يعيد كل نموذج تركيبه بطريقته. والحقل يقبل أن يُلصَق فيه رقم كامل
 * (‎+972…‎) فيتعرّف على بلده ويضبط القائمة تلقائياً — وهو ما يفعله الناس
 * فعلاً حين ينسخون رقماً من واتساب.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  autoFocus,
  className,
}: {
  id?: string
  /** الرقم الكامل بصيغة E.164، أو نصّ فارغ */
  value: string
  onChange: (e164: string) => void
  onBlur?: () => void
  autoFocus?: boolean
  className?: string
}) {
  const parsed = useMemo(() => splitPhone(value), [value])

  // المقدّمة تُحفظ هنا أيضاً، وإلا عادت إلى الافتراضي كلما فُرّغ الرقم
  const [dial, setDial] = useState(parsed.dial || DEFAULT_DIAL)
  const [local, setLocal] = useState(parsed.local)

  /**
   * حين يغيّر النموذج القيمة من الخارج — كتفريغه بعد حفظ ناجح — نتبعه.
   * بدون هذا يظلّ الرقم السابق معروضاً في الحقل بينما يظنّ النموذج أنه فارغ،
   * فيُضاف الشخص التالي برقم من قبله.
   */
  useEffect(() => {
    if (joinPhone(dial, local) === value) return
    setDial(parsed.dial || DEFAULT_DIAL)
    setLocal(parsed.local)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function push(nextDial: string, nextLocal: string) {
    setDial(nextDial)
    setLocal(nextLocal)
    onChange(joinPhone(nextDial, nextLocal))
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <select
        aria-label="مقدّمة البلد"
        value={dial}
        onChange={(e) => push(e.target.value, local)}
        className="h-10 w-[150px] shrink-0 rounded-input border border-line bg-card px-2 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.dial}>
            {countryLabel(c)}
          </option>
        ))}
      </select>

      <Input
        id={id}
        value={local}
        autoFocus={autoFocus}
        onBlur={onBlur}
        inputMode="tel"
        dir="ltr"
        className="num text-left"
        placeholder="599123456"
        onChange={(e) => {
          const raw = e.target.value
          // رقم كامل مُلصَق: نستخرج بلده بدل حشره في الجزء المحلي
          if (/^(\+|00)/.test(raw.trim())) {
            const whole = splitPhone(raw.trim().replace(/^00/, '+'))
            push(whole.dial, whole.local)
            return
          }
          push(dial, raw)
        }}
      />
    </div>
  )
}

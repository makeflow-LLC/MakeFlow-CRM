import { formatMoney, formatNumber } from '@/lib/utils'

/**
 * الأسماء العربية الطويلة (مثل «وافق على التسجيل») لا تُقرأ حين تتمايل على
 * محور رسمة، فنستعمل أشرطة HTML للتصنيفات — الاسم كاملاً على اليمين والشريط
 * يمتدّ يساراً. لا مكتبة رسم هنا أصلاً: النتيجة أدقّ اتجاهياً وأخفّ حملاً.
 */
export function HtmlBars({
  rows,
  format = 'number',
}: {
  rows: { name: string; color: string; value: number }[]
  format?: 'number' | 'money'
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  const show = (v: number) => (format === 'money' ? formatMoney(v) : formatNumber(v))

  if (!rows.length) {
    return <p className="py-12 text-center text-body text-ink-muted">لا توجد أرقام بعد.</p>
  }

  return (
    <div className="space-y-3.5">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-1.5 flex items-center gap-2 text-body">
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
              style={{ backgroundColor: r.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-medium text-ink" title={r.name}>
              {r.name}
            </span>
            <span className="num shrink-0 font-semibold text-ink">{show(r.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-page">
            <div
              className="h-full rounded-pill"
              style={{ width: `${Math.max((r.value / max) * 100, 2)}%`, backgroundColor: r.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * الإيراد المقبوض شهرياً.
 *
 * أعمدة HTML لا رسمة مكتبة: المحاور العربية المقلوبة كانت تكلّف أكثر ممّا
 * تعطي، والقيمة فوق كل عمود تُغني عن محور رأسي كامل. الشهر الحالي بلون
 * أساسي والبقية بدرجته الفاتحة، فيُقرأ موضعك في السنة بلمحة.
 */
export function MonthlyRevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1)
  const last = data.length - 1

  return (
    <div className="flex items-end gap-2" style={{ height: 200 }}>
      {data.map((d, i) => (
        <div key={d.month} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5">
          <span className="num text-center text-chip font-semibold text-ink-muted">
            {d.revenue > 0 ? formatNumber(d.revenue) : ''}
          </span>
          <div
            title={`${d.month}: ${formatMoney(d.revenue)}`}
            className="w-full rounded-t-lg"
            style={{
              height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 3 : 1)}%`,
              backgroundColor: i === last ? '#5B4CE0' : '#DCD9F7',
            }}
          />
          <span className="truncate text-center text-chip text-ink-muted">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

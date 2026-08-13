'use client'

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatMoney, formatNumber } from '@/lib/utils'

/**
 * الأسماء العربية الطويلة (زي «وافق على التسجيل») ما بتنقرأ لما تتمايل على محور
 * الرسمة، فبنستعمل أشرطة HTML للتصنيفات — الاسم كامل على اليمين والشريط بيمتد
 * لليسار. الرسمة الحقيقية محفوظة للشهور، لأن أسماءها قصيرة وبتزبط.
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
    return <p className="py-12 text-center text-sm text-ink-muted">ما في أرقام بعد.</p>
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold text-ink" title={r.name}>
              {r.name}
            </span>
            <span className="num shrink-0 font-bold text-ink">{show(r.value)}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-pill bg-page">
            <div
              className="h-full rounded-pill transition-all duration-150"
              style={{ width: `${Math.max((r.value / max) * 100, 2)}%`, backgroundColor: r.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const AXIS = { fontSize: 12, fontFamily: 'inherit', fill: '#6B7280' }

/** الإيراد شهرياً — أسماء الشهور قصيرة، فالرسمة هون بتشتغل مضبوط */
export function MonthlyRevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, left: 0, right: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E9F0" vertical={false} />
        <XAxis dataKey="month" reversed tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} orientation="right" />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #E6E9F0',
            boxShadow: '0 8px 24px rgba(16,24,40,.12)',
            fontSize: 13,
            fontFamily: 'inherit',
            direction: 'rtl',
          }}
          formatter={(v: number) => [formatMoney(v), 'إيراد']}
          cursor={{ fill: '#F6F7FB' }}
        />
        <Bar dataKey="revenue" fill="#5B4CE0" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

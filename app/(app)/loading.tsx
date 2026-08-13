/** هيكل مؤقت أثناء التحميل — أهدأ للعين من شاشة بيضاء أو دوّامة. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-input bg-line" />
        <div className="h-4 w-96 max-w-full rounded-input bg-line/60" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="surface h-28" />
        ))}
      </div>

      <div className="surface divide-y divide-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="h-9 w-9 shrink-0 rounded-input bg-line" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded-input bg-line" />
              <div className="h-3 w-1/4 rounded-input bg-line/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

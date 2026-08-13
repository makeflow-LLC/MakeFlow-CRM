import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic, Tajawal } from 'next/font/google'
import './globals.css'

/**
 * الخط الأساسي. أوزانه العربية متوازنة، ويميل إلى الوضوح لا الزخرفة —
 * وهو المطلوب في واجهة عمل يومية.
 */
const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
  adjustFontFallback: false,
})

/** خط احتياطي يُحمَّل فعلياً، فلا يرتد النص إلى خط النظام إن تعذّر الأول. */
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-arabic-fallback',
  display: 'swap',
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: 'Makeflow CRM',
  description: 'نظام إدارة العملاء الداخلي لشركة Makeflow',
}

export const viewport: Viewport = {
  themeColor: '#5B4CE0',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${plex.variable} ${tajawal.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}

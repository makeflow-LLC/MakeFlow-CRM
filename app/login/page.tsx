'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const live = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!live) {
      router.push('/')
      return
    }

    setBusy(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().auth.signInWithPassword({ email, password })
      if (error) {
        setError('الإيميل أو كلمة السر غلط. جرّب كمان مرة.')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('ما قدرنا نتصل بالسيرفر. افحص الإنترنت وجرّب كمان مرة.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <Card className="w-full max-w-sm">
        <CardBody className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-input bg-accent text-lg font-bold text-white">
              M
            </div>
            <h1 className="text-xl font-bold text-ink">Makeflow CRM</h1>
            <p className="mt-1 text-sm text-ink-muted">سجّل دخولك عشان تشوف عملاءك</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">الإيميل</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@makeflow.ps"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">كلمة السر</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>

            <FieldError>{error}</FieldError>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'لحظة…' : 'ادخل'}
            </Button>
          </form>

          {!live && (
            <p className="rounded-input bg-accent-soft p-3 text-center text-xs leading-relaxed text-accent">
              إنت بوضع المعاينة — اضغط «ادخل» بدون بيانات وبتفوت على التطبيق.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

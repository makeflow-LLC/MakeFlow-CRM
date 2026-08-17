'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { createOrganization } from '@/lib/actions'
import type { OrgType } from '@/lib/types'

const TYPES: { value: OrgType; label: string }[] = [
  { value: 'clinic', label: 'عيادة' },
  { value: 'salon', label: 'صالون' },
  { value: 'shop', label: 'محل' },
  { value: 'company', label: 'شركة' },
  { value: 'school', label: 'مركز تعليمي' },
  { value: 'other', label: 'أخرى' },
]

const selectClass =
  'h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none'

export function AddOrganization({ label = 'أضف جهة' }: { label?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<OrgType>('clinic')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setError('')
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>أضف جهة</DialogTitle>
        <DialogDescription>
          العيادة أو الشركة أو المحل. الأشخاص تربطهم بها لاحقاً من ملف كل شخص.
        </DialogDescription>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (!name.trim()) {
              setError('أدخل اسم الجهة.')
              return
            }
            startTransition(async () => {
              const res = await createOrganization({ name, type, city, notes })
              if (res.ok) {
                setName('')
                setCity('')
                setNotes('')
                setOpen(false)
                router.refresh()
              } else {
                setError(res.error ?? '')
              }
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="org-name">اسم الجهة</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: عيادة النور"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="org-type">النوع</Label>
            <select
              id="org-type"
              value={type}
              onChange={(e) => setType(e.target.value as OrgType)}
              className={selectClass}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="org-city">المدينة</Label>
            <Input
              id="org-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="غزة"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="org-notes">ملاحظات</Label>
            <Textarea
              id="org-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي شيء يفيدك تذكّره عنها لاحقاً"
            />
          </div>

          <FieldError>{error}</FieldError>

          <div className="flex justify-start gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'جارٍ الحفظ…' : 'أضف الجهة'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

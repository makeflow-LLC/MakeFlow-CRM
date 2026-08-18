'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, Copy, KeyRound, Pencil, Plus, Power, ShieldCheck, Trash2, UserPlus, Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmptyState } from '@/components/hints/empty-state'
import { Toast } from '@/components/ui/toast'
import {
  changeOwnPassword, createTeamMember, deleteTeamMember, resetMemberPassword,
  setMemberActive, updateTeamMember,
} from '@/lib/team'
import type { TeamMember, TeamView } from '@/lib/team'
import type { Role } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'admin', label: 'مدير', hint: 'يرى كل شيء، ويدير الفريق والمنتجات' },
  { value: 'sales', label: 'مبيعات', hint: 'يتابع الصفقات والعملاء ويسجّل التواصل' },
  { value: 'operator', label: 'تشغيل', hint: 'ينفّذ ما بعد البيع ويؤكّد المدفوعات' },
]

const roleLabel = (r: Role) => ROLES.find((x) => x.value === r)?.label ?? r

/** ألوان الصورة الرمزية — نفس لوحة النظام */
const PALETTE = ['#5B4CE0', '#3B9BE8', '#7B61FF', '#F5A623', '#22C55E', '#0EA47A', '#E8639B', '#E5484D']

/** الحدّ المتّفق عليه في التصميم. تجاوزه ممكن، لكنه قرارٌ لا صدفة. */
const PLANNED_SEATS = 3

const selectClass =
  'h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none'

type Tone = 'error' | 'success'

export function TeamManager({ view }: { view: TeamView }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [resetting, setResetting] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [toast, setToast] = useState<{ msg: string; tone: Tone } | null>(null)

  const { members, isAdmin, canManageAccounts, demo, viewerId } = view
  const active = members.filter((m) => m.active)
  const stopped = members.filter((m) => !m.active)
  const manage = isAdmin && canManageAccounts

  function toggle(m: TeamMember) {
    startTransition(async () => {
      const res = await setMemberActive(m.id, !m.active)
      if (res.ok) {
        setToast({
          msg: m.active
            ? `عُطّل حساب ${m.full_name}، ولن يستطيع الدخول.`
            : `أُعيد تفعيل حساب ${m.full_name}.`,
          tone: 'success',
        })
        router.refresh()
      } else setToast({ msg: res.error ?? '', tone: 'error' })
    })
  }

  return (
    <>
      {demo && (
        <p className="mb-6 rounded-card bg-accent-soft p-4 text-sm leading-relaxed text-accent">
          هذه معاينة بأسماء تجريبية. إدارة الحسابات الحقيقية تظهر بعد الاتصال بقاعدة البيانات.
        </p>
      )}

      {isAdmin && !canManageAccounts && <SetupNotice />}

      {manage && (
        <div className="mb-6 flex flex-wrap items-center justify-start gap-3">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            أضف عضواً
          </Button>
          {active.length >= PLANNED_SEATS && (
            <p className="text-xs leading-relaxed text-ink-muted">
              الفريق الآن{' '}
              <span className="num font-bold text-ink">{active.length}</span> أعضاء فعّالين.
              النظام مصمَّم لـ<span className="num"> {PLANNED_SEATS} </span>أشخاص، وما زاد يعمل
              لكنه يستحقّ مراجعة الأدوار.
            </p>
          )}
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="لا يوجد أعضاء بعد"
          body="كل شخص يستعمل النظام يحتاج حساباً باسمه، لتُنسب إليه صفقاته ومهامه ويُعرف من فعل ماذا."
          action={manage ? <Button onClick={() => setCreating(true)}>أضف عضواً</Button> : undefined}
        />
      ) : (
        <div className="space-y-8">
          <MemberList
            title="الأعضاء الفعّالون" members={active} viewerId={viewerId} manage={manage}
            pending={pending} onEdit={setEditing} onToggle={toggle}
            onReset={setResetting} onDelete={setRemoving}
          />
          {stopped.length > 0 && (
            <MemberList
              title="حسابات معطَّلة" members={stopped} viewerId={viewerId} manage={manage}
              pending={pending} onEdit={setEditing} onToggle={toggle}
              onReset={setResetting} onDelete={setRemoving} muted
            />
          )}
        </div>
      )}

      {!demo && <OwnPassword onToast={setToast} />}

      {manage && (
        <MemberForm
          open={creating}
          onOpenChange={setCreating}
          onDone={(msg) => {
            setToast({ msg, tone: 'success' })
            router.refresh()
          }}
        />
      )}

      {manage && editing && (
        <MemberForm
          key={editing.id}
          member={editing}
          open
          onOpenChange={(v) => !v && setEditing(null)}
          onDone={(msg) => {
            setEditing(null)
            setToast({ msg, tone: 'success' })
            router.refresh()
          }}
        />
      )}

      {manage && resetting && (
        <ResetPassword
          key={resetting.id}
          member={resetting}
          onClose={() => setResetting(null)}
          onDone={(msg) => {
            setResetting(null)
            setToast({ msg, tone: 'success' })
          }}
        />
      )}

      {/* الحذف مسموح فقط لعضو لم يُنسب إليه أي سجلّ */}
      <Dialog open={Boolean(removing)} onOpenChange={(v) => !v && setRemoving(null)}>
        <DialogContent>
          <DialogTitle>حذف العضو</DialogTitle>
          <DialogDescription>
            هل تريد حذف <strong className="text-ink">{removing?.full_name}</strong> وحساب دخوله؟
            لا يمكن التراجع.
          </DialogDescription>
          <p className="mt-3 rounded-input bg-page p-4 text-sm leading-relaxed text-ink-muted">
            إن كان مسؤولاً عن صفقات أو عملاء أو مهام فلن يُحذف. التعطيل في تلك الحالة هو
            الصواب: يمنعه من الدخول، ويُبقي عمله منسوباً إليه في التقارير.
          </p>
          <div className="mt-5 flex justify-start gap-2">
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!removing) return
                const name = removing.full_name
                startTransition(async () => {
                  const res = await deleteTeamMember(removing.id)
                  setRemoving(null)
                  if (res.ok) {
                    setToast({ msg: `حُذف ${name}.`, tone: 'success' })
                    router.refresh()
                  } else setToast({ msg: res.error ?? '', tone: 'error' })
                })
              }}
            >
              {pending ? 'جارٍ الحذف…' : 'نعم، احذفه'}
            </Button>
            <Button variant="ghost" onClick={() => setRemoving(null)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  )
}

// ---------------------------------------------------------------------------

function MemberList({
  title, members, viewerId, manage, pending, muted,
  onEdit, onToggle, onReset, onDelete,
}: {
  title: string
  members: TeamMember[]
  viewerId: string | null
  manage: boolean
  pending: boolean
  muted?: boolean
  onEdit: (m: TeamMember) => void
  onToggle: (m: TeamMember) => void
  onReset: (m: TeamMember) => void
  onDelete: (m: TeamMember) => void
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-ink">
        {title}
        <span className="num rounded-pill bg-page px-2 py-0.5 text-xs font-bold text-ink-muted">
          {members.length}
        </span>
      </h2>

      <Card className="divide-y divide-line overflow-hidden">
        {members.map((m) => (
          <div
            key={m.id}
            className={cn('row flex flex-wrap items-center gap-4 px-6 py-4', muted && 'opacity-70')}
          >
            <Avatar name={m.full_name} color={m.avatar_color} />

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                {m.full_name}
                {m.id === viewerId && (
                  <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                    أنت
                  </span>
                )}
                {m.role === 'admin' && (
                  <ShieldCheck className="h-4 w-4 text-accent" aria-label="مدير" />
                )}
              </p>
              <p className="num truncate text-xs text-ink-muted" dir="ltr">
                {m.email ?? '—'}
              </p>
            </div>

            <span className="w-[72px] shrink-0 text-xs font-semibold text-ink-muted">
              {roleLabel(m.role)}
            </span>

            <span className="w-[130px] shrink-0 text-xs text-ink-muted">
              {!m.active
                ? 'معطَّل'
                : m.last_sign_in_at
                  ? `آخر دخول ${timeAgo(m.last_sign_in_at)}`
                  : 'لم يدخل بعد'}
            </span>

            {manage && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => onEdit(m)} disabled={pending}>
                  <Pencil className="h-4 w-4" />
                  عدّل
                </Button>
                <Button
                  size="sm" variant="ghost" disabled={pending}
                  onClick={() => onReset(m)}
                  aria-label={`غيّر كلمة مرور ${m.full_name}`}
                  title="غيّر كلمة المرور"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  size="sm" variant="ghost" disabled={pending}
                  onClick={() => onToggle(m)}
                  title={m.active ? 'عطّل الحساب' : 'أعِد التفعيل'}
                >
                  <Power className="h-4 w-4" />
                  {m.active ? 'عطّل' : 'فعّل'}
                </Button>
                <Button
                  size="sm" variant="ghost" disabled={pending}
                  onClick={() => onDelete(m)}
                  className="text-ink-muted hover:text-danger"
                  aria-label={`احذف ${m.full_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>
    </section>
  )
}

// ---------------------------------------------------------------------------

function MemberForm({
  member, open, onOpenChange, onDone,
}: {
  member?: TeamMember
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: (message: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(member?.full_name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [role, setRole] = useState<Role>(member?.role ?? 'sales')
  const [color, setColor] = useState(member?.avatar_color ?? PALETTE[0])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const isEdit = Boolean(member)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setError('') }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto scroll-slim">
        <DialogTitle>{isEdit ? 'عدّل بيانات العضو' : 'أضف عضواً'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'البريد الإلكتروني لا يُعدَّل بعد الإنشاء، لأنه اسم الدخول نفسه.'
            : 'سيُنشأ حساب دخول فوراً، ويستطيع صاحبه استعماله مباشرةً دون رسالة تفعيل.'}
        </DialogDescription>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (!name.trim()) return setError('أدخل اسم العضو.')
            if (!isEdit && !email.trim()) return setError('أدخل البريد الإلكتروني.')
            if (!isEdit && password.length < 8) {
              return setError('كلمة المرور يجب ألّا تقلّ عن ثمانية أحرف.')
            }

            startTransition(async () => {
              const res = member
                ? await updateTeamMember(member.id, {
                    full_name: name, phone, role, avatar_color: color,
                  })
                : await createTeamMember({
                    full_name: name, email, password, role, phone, avatar_color: color,
                  })

              if (res.ok) {
                onDone(isEdit ? `حُفظت تعديلات ${name.trim()}.` : `أُضيف ${name.trim()} وأصبح بإمكانه الدخول.`)
                if (!isEdit) { setName(''); setEmail(''); setPassword(''); setPhone('') }
              } else setError(res.error ?? '')
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="tm-name">الاسم</Label>
            <Input
              id="tm-name" value={name} autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد نصّار"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tm-email">البريد الإلكتروني (اسم الدخول)</Label>
            <Input
              id="tm-email" type="email" value={email} dir="ltr" className="num text-left"
              disabled={isEdit}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmad@makeflow.ps"
            />
          </div>

          {!isEdit && (
            <div className="space-y-1">
              <Label htmlFor="tm-pass">كلمة المرور الأولى</Label>
              <div className="flex gap-2">
                <Input
                  id="tm-pass" value={password} dir="ltr" className="num text-left"
                  onChange={(e) => { setPassword(e.target.value); setCopied(false) }}
                  placeholder="ثمانية أحرف فأكثر"
                />
                <Button
                  type="button" variant="outline" size="md"
                  onClick={() => { setPassword(suggestPassword()); setCopied(false) }}
                >
                  اقترح
                </Button>
                <Button
                  type="button" variant="outline" size="icon"
                  disabled={!password}
                  aria-label="انسخ كلمة المرور"
                  onClick={() => {
                    navigator.clipboard?.writeText(password)
                    setCopied(true)
                  }}
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-ink-muted">
                سلّمها لصاحبها بوسيلة خاصة، واطلب منه تغييرها من هذه الشاشة بعد أول دخول.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="tm-role">الدور</Label>
            <select
              id="tm-role" value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={selectClass}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs leading-relaxed text-ink-muted">
              {ROLES.find((r) => r.value === role)?.hint}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="tm-phone">رقم الهاتف (اختياري)</Label>
            <PhoneInput id="tm-phone" value={phone} onChange={setPhone} />
          </div>

          <div className="space-y-2">
            <Label>لون الصورة الرمزية</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  aria-label={`اللون ${c}`}
                  className={cn(
                    'h-8 w-8 rounded-input transition-transform duration-150 hover:scale-110',
                    color === c && 'ring-2 ring-accent ring-offset-2',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <FieldError>{error}</FieldError>

          <div className="flex justify-start gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'جارٍ الحفظ…' : isEdit ? 'احفظ التعديلات' : 'أنشئ الحساب'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------

function ResetPassword({
  member, onClose, onDone,
}: {
  member: TeamMember
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>كلمة مرور {member.full_name}</DialogTitle>
        <DialogDescription>
          الكلمة الجديدة تعمل فوراً، والجلسة القديمة تبقى مفتوحة حتى ينتهي وقتها.
        </DialogDescription>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (password.length < 8) return setError('كلمة المرور يجب ألّا تقلّ عن ثمانية أحرف.')

            startTransition(async () => {
              const res = await resetMemberPassword(member.id, password)
              if (res.ok) onDone(`غُيّرت كلمة مرور ${member.full_name}.`)
              else setError(res.error ?? '')
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="rp-pass">كلمة المرور الجديدة</Label>
            <div className="flex gap-2">
              <Input
                id="rp-pass" value={password} autoFocus dir="ltr" className="num text-left"
                onChange={(e) => { setPassword(e.target.value); setCopied(false) }}
                placeholder="ثمانية أحرف فأكثر"
              />
              <Button
                type="button" variant="outline" size="md"
                onClick={() => { setPassword(suggestPassword()); setCopied(false) }}
              >
                اقترح
              </Button>
              <Button
                type="button" variant="outline" size="icon" disabled={!password}
                aria-label="انسخ كلمة المرور"
                onClick={() => { navigator.clipboard?.writeText(password); setCopied(true) }}
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <FieldError>{error}</FieldError>

          <div className="flex justify-start gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'جارٍ الحفظ…' : 'غيّر كلمة المرور'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------

/** متاح لكل عضو، مديراً كان أو غيره — لا يحتاج مفتاح الإدارة. */
function OwnPassword({ onToast }: { onToast: (t: { msg: string; tone: Tone }) => void }) {
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-base font-bold text-ink">كلمة مروري</h2>
      <Card className="p-6">
        <p className="mb-4 max-w-xl text-sm leading-relaxed text-ink-muted">
          إن دخلت بكلمة مرور سلّمك إياها غيرك، غيّرها من هنا. لا يراها أحد بعد ذلك، ولا
          يستطيع المدير قراءتها — بل ضبط واحدة جديدة فقط.
        </p>

        <form
          className="flex max-w-xl flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (password.length < 8) return setError('كلمة المرور يجب ألّا تقلّ عن ثمانية أحرف.')
            if (password !== confirm) return setError('الكلمتان غير متطابقتين.')

            startTransition(async () => {
              const res = await changeOwnPassword(password)
              if (res.ok) {
                setPassword(''); setConfirm('')
                onToast({ msg: 'غُيّرت كلمة مرورك.', tone: 'success' })
              } else setError(res.error ?? '')
            })
          }}
        >
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label htmlFor="op-pass">كلمة المرور الجديدة</Label>
            <Input
              id="op-pass" type="password" value={password} dir="ltr" className="text-left"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label htmlFor="op-confirm">أعِد كتابتها</Label>
            <Input
              id="op-confirm" type="password" value={confirm} dir="ltr" className="text-left"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'جارٍ الحفظ…' : 'غيّرها'}
          </Button>
        </form>

        <div className="mt-2">
          <FieldError>{error}</FieldError>
        </div>
      </Card>
    </section>
  )
}

// ---------------------------------------------------------------------------

/**
 * يظهر للمدير حين يكون المفتاح ناقصاً على الخادم: الشاشة تُعرض، لكن كل ما
 * يمسّ الحسابات معطَّل. الشرح هنا بدل رسالة خطأ عند أول ضغطة.
 */
function SetupNotice() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-card bg-danger/8 p-5">
      <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div className="min-w-0 text-sm leading-relaxed text-ink">
        <p className="mb-2 font-bold text-danger">إدارة الحسابات غير مفعّلة بعد</p>
        <p className="mb-2 text-ink-muted">
          إنشاء الحسابات وتغيير كلمات المرور يحتاج مفتاحاً إضافياً على الخادم لم يُضبط.
          حتى يُضبط، تبقى هذه الشاشة للعرض فقط، ويظلّ تغيير كلمة مرورك أنت متاحاً.
        </p>
        <ol className="list-inside list-decimal space-y-1 text-ink-muted">
          <li>افتح إعدادات المشروع في Vercel، قسم Environment Variables.</li>
          <li>
            أضف متغيّراً باسم{' '}
            <code className="num rounded bg-page px-1.5 py-0.5 text-xs font-bold text-ink">
              SUPABASE_SERVICE_ROLE_KEY
            </code>
            .
          </li>
          <li>قيمته من Supabase: Project Settings ← API ← service_role.</li>
          <li>أعد النشر (Redeploy) لتظهر الإدارة.</li>
        </ol>
        <p className="mt-2 text-xs text-ink-muted">
          لا تضع هذا المفتاح في أي مكان يصل إليه المتصفح، ولا ترسله في محادثة.
        </p>
      </div>
    </div>
  )
}

/** كلمة مرور مقترحة — أحرف واضحة، بلا ما يُقرأ خطأً عند الإملاء. */
function suggestPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(14)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

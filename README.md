# Makeflow CRM

نظام إدارة العملاء الداخلي لشركة Makeflow — عربي بالكامل، RTL، لثلاثة مستخدمين.

الواجهة عربية. الكود وقاعدة البيانات وأسماء المتغيّرات إنجليزية.

---

## شغّله بدقيقة

```bash
npm install
npm run dev
```

افتح <http://localhost:3000> — بيشتغل فوراً **ببيانات تجريبية** بدون أي إعداد،
عشان تشوف التصميم قبل ما تربط قاعدة البيانات. بيظهر شريط بنفسجي فوق بيذكّرك
إنك بوضع المعاينة.

## اربطه بقاعدة بياناتك

انسخ `.env.example` لـ `.env.local` وعبّي المفتاحين:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

أول ما يلاقي المفتاحين، بيوقف البيانات التجريبية وبيقرأ من Supabase.
إذا فشل الاتصال، بيرجع للبيانات التجريبية بدل ما تنكسر الشاشة، وبيسجّل السبب
بالـ server log.

### متغيّرات البيئة

| المتغيّر | وين بينحط | شو بيعمل |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | الواجهة و Vercel | رابط مشروع Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | الواجهة و Vercel | المفتاح العام — سياسات RLS بتحكمه |
| `SUPABASE_SERVICE_ROLE_KEY` | **n8n فقط** | بيتجاوز كل الحماية |

> ⚠️ الـ service role key ما بينحط أبداً بالواجهة ولا بـ Vercel ولا بأي متغيّر
> بيبدأ بـ `NEXT_PUBLIC_`. هو بيتجاوز RLS بالكامل — مكانه n8n وبس.

---

## قاعدة البيانات

شغّل الملفات بهالترتيب على مشروع Supabase (من SQL Editor أو `psql`):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0002_seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/functions/upsert_lead.sql
```

> ⚠️ قبل ما تشغّل `0002_seed.sql`: غيّر كلمة السر المؤقتة
> `Makeflow#Change-Me-2026` جوّا الملف، وغيّرها كمان مرة بعد أول دخول.

| الملف | شو فيه |
|---|---|
| `0001_init.sql` | 9 enums · 14 جدول · فهارس · تريغرز · 5 views · سياسات RLS |
| `0002_seed.sql` | 3 موظفين · 7 منتجات · مسارين فيهم 13 مرحلة · 5 تاغات |
| `upsert_lead.sql` | نقطة الدخول الوحيدة لـ n8n |

### القواعد المحمية بقاعدة البيانات

1. تغيير المرحلة بيصفّر عدّاد «عالق منذ».
2. مرحلة الربح بتقفل الصفقة `won`.
3. مرحلة الخسارة **بترفض الحفظ** بدون `lost_reason` — المودال بالواجهة، والحماية بقاعدة البيانات.
4. كل صفقة جديدة بتولّد مهمة «أول تواصل» خلال 24 ساعة.
5. الدفعات المؤكدة لما تغطي قيمة الصفقة، بتنقلها لمرحلة الدفع لحالها (للأمام فقط).

---

## n8n

### مثال استدعاء

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/upsert_lead" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_phone": "0599123456",
    "p_full_name": "أحمد صالح",
    "p_product_name": "دورة الأتمتة بالذكاء الاصطناعي (n8n)",
    "p_source": "whatsapp_bot",
    "p_summary": "حكى مع البوت وسأل عن سعر الدورة",
    "p_payment_status": "needs_checking",
    "p_org_name": null,
    "p_amount": 250,
    "p_external_ref": "waha-msg-001"
  }'
```

الرد:

```json
{
  "contact_id": "…",
  "deal_id": "…",
  "organization_id": null,
  "contact_created": true,
  "deal_created": true
}
```

### ليش آمن تعيد الاستدعاء

الدالة **idempotent على (رقم الهاتف + المنتج)**: نادِها عشر مرات بنفس البيانات
وبترجّع نفس الـ IDs بدون ولا تكرار. الرقم بينتظّم لصيغة E.164 قبل المقارنة،
فـ `0599123456` و `+970599123456` و `0599 123-456` كلهم نفس الشخص.
و`p_external_ref` بيمنع تكرار النشاط لما n8n يعيد المحاولة.

الحقول المطلوبة: `p_phone` بس. الباقي اختياري.

---

## النشر على Vercel

1. ادخل [vercel.com](https://vercel.com) وسجّل بحساب GitHub.
2. `Add New → Project` واختار مستودع `MakeFlow-CRM`.
3. حط `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. `Deploy` → بيطلعلك رابط تفتحه من الموبايل والكمبيوتر.

---

## بنية المشروع

```
app/
  (app)/            الشاشات السبعة، كلها جوّا هيكل واحد فيه السايدبار
  login/            تسجيل الدخول (Supabase Auth)
components/
  hints/            نظام التلميحات: HintTooltip · PageHeader · EmptyState
  ui/               العناصر الأساسية (زر، بطاقة، مودال، حبة ملوّنة…)
  deals/board.tsx   بورد الصفقات بالسحب والإفلات
lib/
  hints.ts          كل النصوص التعليمية — عدّلها من هون بدون ما تفتح كمبوننت
  data/             طبقة البيانات (Supabase أو البيانات التجريبية)
  types.ts          الأنواع، مطابقة لسكيمة قاعدة البيانات
supabase/           الهجرات والدوال
tailwind.config.ts  توكنز التصميم كلها
```

### نظام التلميحات (ثلاث طبقات)

المستخدمين أول مرة بيستعملوا CRM، فالواجهة بتعلّمهم وهما بيشتغلوا:

1. **سطر تحت كل عنوان** — بيشرح الشاشة بلغة بسيطة، دايماً ظاهر.
2. **أيقونة ⓘ** — تعريف + مثال حقيقي، بتفتح بالحَوَم وبالضغط.
3. **شاشات فاضية بتعلّم** — ما في «لا توجد بيانات»؛ في شرح + زر.

كل النصوص بملف `lib/hints.ts`.

---

## أوامر

```bash
npm run dev        # تطوير
npm run build      # بناء للإنتاج
npm run start      # تشغيل النسخة المبنية
npm run typecheck  # فحص الأنواع
npm run lint
```

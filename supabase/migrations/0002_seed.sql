-- =============================================================================
-- Makeflow CRM — 0002_seed
-- Products, pipelines, stages (with their Monday-style colors), tags, 3 staff.
-- Written to be re-runnable: every insert is keyed on a fixed uuid.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Staff (3 people). Rename these to the real names after the first login —
-- full_name is what shows up on the avatars and in "المسؤول".
-- -----------------------------------------------------------------------------

insert into public.users (id, full_name, phone, role, avatar_color, active) values
  ('11111111-1111-4111-8111-111111111111', 'المدير',          '+970590000001', 'admin',    '#5B4CE0', true),
  ('22222222-2222-4222-8222-222222222222', 'منسّق المبيعات',  '+970590000002', 'sales',    '#3B9BE8', true),
  ('33333333-3333-4333-8333-333333333333', 'المشغّل',         '+970590000003', 'operator', '#0EA47A', true)
on conflict (id) do update
  set full_name    = excluded.full_name,
      role         = excluded.role,
      avatar_color = excluded.avatar_color,
      active       = excluded.active;

-- -----------------------------------------------------------------------------
-- Products
-- kind drives which pipeline a deal lands in: course -> الأكاديمية,
-- subscription/service -> مجيب وسمارت كلينيك.
-- -----------------------------------------------------------------------------

insert into public.products (id, name, kind, default_price, currency, color, active) values
  ('a1000000-0000-4000-8000-000000000001', 'دورة الأتمتة بالذكاء الاصطناعي (n8n)', 'course',       250, 'ILS', '#7B61FF', true),
  ('a1000000-0000-4000-8000-000000000002', 'دورة الذكاء الاصطناعي للأعمال',        'course',       250, 'ILS', '#3B9BE8', true),
  ('a1000000-0000-4000-8000-000000000003', 'دورة صناعة المحتوى بالذكاء الاصطناعي', 'course',       200, 'ILS', '#F5A623', true),
  ('a1000000-0000-4000-8000-000000000010', 'Mojeeb',                               'subscription', 150, 'ILS', '#22C55E', true),
  ('a1000000-0000-4000-8000-000000000011', 'SmartClinic',                          'subscription', 250, 'ILS', '#0EA47A', true),
  ('a1000000-0000-4000-8000-000000000012', 'SmartSalon',                           'subscription', 150, 'ILS', '#E8639B', true),
  ('a1000000-0000-4000-8000-000000000013', 'Imagen',                               'service',      500, 'ILS', '#5B4CE0', true)
on conflict (id) do update
  set name          = excluded.name,
      kind          = excluded.kind,
      default_price = excluded.default_price,
      color         = excluded.color,
      active        = excluded.active;

-- -----------------------------------------------------------------------------
-- Pipelines
-- The names double as the tab labels on the الصفقات board.
-- -----------------------------------------------------------------------------

insert into public.pipelines (id, name, product_kind) values
  ('b1000000-0000-4000-8000-000000000001', 'الأكاديمية',           'course'),
  ('b1000000-0000-4000-8000-000000000002', 'مجيب وسمارت كلينيك',   'subscription')
on conflict (id) do update
  set name         = excluded.name,
      product_kind = excluded.product_kind;

-- -----------------------------------------------------------------------------
-- Stages — colors come straight from the design tokens.
-- is_won   -> closes the deal as won
-- is_lost  -> closes it as lost, and demands a lost_reason
-- is_paid_stage -> where a fully-paid deal jumps to on its own
-- -----------------------------------------------------------------------------

insert into public.pipeline_stages (id, pipeline_id, name, sort_order, color, is_won, is_lost, is_paid_stage) values
  -- الأكاديمية
  ('c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'جديد',              1, '#9AA4B2', false, false, false),
  ('c1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'تواصل مع البوت',    2, '#3B9BE8', false, false, false),
  ('c1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'وافق على التسجيل',  3, '#7B61FF', false, false, false),
  ('c1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000001', 'بانتظار الدفع',     4, '#F5A623', false, false, false),
  ('c1000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000001', 'دفع',               5, '#22C55E', false, false, true),
  ('c1000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000001', 'حضر',               6, '#0EA47A', true,  false, false),
  ('c1000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000001', 'خسرناه',            7, '#E5484D', false, true,  false),

  -- مجيب وسمارت كلينيك (B2B)
  ('c2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'جديد',              1, '#9AA4B2', false, false, false),
  ('c2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'مكالمة تعارف',      2, '#3B9BE8', false, false, false),
  ('c2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000002', 'أرسلنا عرض سعر',    3, '#7B61FF', false, false, false),
  ('c2000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000002', 'تجربة',             4, '#F5A623', false, false, false),
  ('c2000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000002', 'تعاقد',             5, '#22C55E', true,  false, false),
  ('c2000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000002', 'خسرناه',            6, '#E5484D', false, true,  false)
on conflict (id) do update
  set name          = excluded.name,
      sort_order    = excluded.sort_order,
      color         = excluded.color,
      is_won        = excluded.is_won,
      is_lost       = excluded.is_lost,
      is_paid_stage = excluded.is_paid_stage;

-- -----------------------------------------------------------------------------
-- A few starter tags
-- -----------------------------------------------------------------------------

insert into public.tags (id, name, color) values
  ('d1000000-0000-4000-8000-000000000001', 'مهتم جداً',   '#22C55E'),
  ('d1000000-0000-4000-8000-000000000002', 'ما بيرد',     '#9AA4B2'),
  ('d1000000-0000-4000-8000-000000000003', 'طالب',        '#7B61FF'),
  ('d1000000-0000-4000-8000-000000000004', 'صاحب عيادة',  '#0EA47A'),
  ('d1000000-0000-4000-8000-000000000005', 'يحتاج متابعة', '#F5A623')
on conflict (id) do update
  set name = excluded.name, color = excluded.color;

-- -----------------------------------------------------------------------------
-- Supabase Auth logins for the 3 staff rows.
--
-- Self-hosted only, and best-effort: if the local GoTrue schema differs, this
-- block raises a NOTICE instead of failing the migration — you can then create
-- the users from the Supabase dashboard and link them with the UPDATE at the
-- bottom of this file.
--
-- >>> CHANGE THE PASSWORD BELOW BEFORE RUNNING, AND CHANGE IT AGAIN AFTER THE
-- >>> FIRST LOGIN. These are shared bootstrap credentials, nothing more.
-- -----------------------------------------------------------------------------

do $$
declare
  v_password constant text := 'Makeflow#Change-Me-2026';
  v_staff    record;
  v_auth_id  uuid;
begin
  if to_regclass('auth.users') is null then
    raise notice 'auth.users not found — skipping login seed; create the 3 users manually.';
    return;
  end if;

  for v_staff in
    select * from (values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'owner@makeflow.ps'),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'sales@makeflow.ps'),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'ops@makeflow.ps')
    ) as s(staff_id, email)
  loop
    select id into v_auth_id from auth.users where email = v_staff.email;

    if v_auth_id is null then
      v_auth_id := gen_random_uuid();

      -- الأعمدة الأربعة الأخيرة ليس لها قيمة افتراضية في auth.users، وتركها NULL
      -- يجعل خدمة المصادقة تفشل في قراءة الصف فترفض الدخول برسالة «بيانات غير
      -- صحيحة» رغم صحة كلمة المرور. لذلك تُضبط سلاسلَ فارغة صراحةً.
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', v_auth_id, 'authenticated', 'authenticated',
        v_staff.email, crypt(v_password, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('staff_id', v_staff.staff_id),
        '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_auth_id, v_auth_id::text,
        jsonb_build_object('sub', v_auth_id::text, 'email', v_staff.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;

    update public.users set auth_user_id = v_auth_id where id = v_staff.staff_id;
  end loop;

exception when others then
  raise notice 'Login seed skipped (%). Create the 3 users in the dashboard, then link them manually.', sqlerrm;
end $$;

-- If you created the logins by hand, link them like this:
--   update public.users u
--      set auth_user_id = a.id
--     from auth.users a
--    where a.email = 'owner@makeflow.ps'
--      and u.id = '11111111-1111-4111-8111-111111111111';

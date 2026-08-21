-- =============================================================================
-- Makeflow CRM — 0006_currency
--
-- Two currencies, one set of numbers.
--
-- Courses are sold and collected in shekels; subscriptions are priced and
-- collected in dollars. Every total in the app was adding the two together as
-- if they were the same unit, which makes a number that means nothing.
--
-- The shape here is the standard one:
--
--   1. Every amount keeps the currency it was actually transacted in. Nothing
--      is converted on the way in — the receipt said $50, the row says 50 USD.
--   2. One base currency (USD) is what reports are stated in.
--   3. A payment stores the rate used at the moment it was received, and the
--      converted amount alongside it. Settled money is a historical fact and
--      must not move when the market does; converting at read time would make
--      last quarter's revenue change every morning and never reconcile with a
--      bank statement.
--   4. Deals and subscriptions are NOT stored converted. They are prices, not
--      settled facts, so the app converts them at read time with the current
--      rate — which is what "the pipeline is worth $X today" should mean.
--
-- Rate direction is written out on purpose, because getting it backwards is
-- the classic bug: units_per_base = how many units of this currency make ONE
-- base unit. With base USD, ILS sits at ~3.70.
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. الإعدادات — صفّ واحد لا أكثر
-- -----------------------------------------------------------------------------

create table if not exists public.app_settings (
  id            boolean primary key default true constraint app_settings_single_row check (id),
  base_currency text not null default 'USD',
  updated_at    timestamptz not null default now()
);

insert into public.app_settings (id, base_currency)
values (true, 'USD')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. أسعار الصرف
-- -----------------------------------------------------------------------------

create table if not exists public.currency_rates (
  code            text primary key,
  -- كم وحدة من هذه العملة تساوي وحدة واحدة من عملة الأساس.
  -- الأساس دولار، فالشيكل ≈ 3.70 — وهي الطريقة التي يفكّر بها الناس هنا.
  units_per_base  numeric(14, 6) not null check (units_per_base > 0),
  updated_at      timestamptz not null default now()
);

insert into public.currency_rates (code, units_per_base) values
  ('USD', 1),
  ('ILS', 3.7)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 3. الدفعة تحمل سعرها ومبلغها بعملة الأساس
-- -----------------------------------------------------------------------------

alter table public.payments add column if not exists fx_rate numeric(14, 6);
alter table public.payments add column if not exists amount_base numeric(14, 2);

/**
 * يملأ الحقلين عند الإدخال والتعديل.
 *
 * إن مُرِّر سعر صرف صريح (وهو ما تفعله شاشة تسجيل الدفعة) استُعمل كما هو،
 * وإلا أُخذ السعر المحفوظ وقتها. وفي الحالتين يُثبَّت الرقم على الصف، فلا
 * يتغيّر بعدها مهما تحرّك السوق.
 */
create or replace function public.payments_set_base_amount()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_base text;
  v_rate numeric;
begin
  select base_currency into v_base from public.app_settings where id;
  v_base := coalesce(v_base, 'USD');

  if new.currency = v_base then
    new.fx_rate := 1;
  elsif new.fx_rate is null or new.fx_rate <= 0 then
    select units_per_base into v_rate from public.currency_rates where code = new.currency;
    -- عملة بلا سعر مسجَّل: نتركها 1 بدل أن نرفض الصف، فالمال وصل فعلاً
    -- ورفضُ تسجيله أسوأ من تحويلٍ يحتاج تصحيحاً
    new.fx_rate := coalesce(v_rate, 1);
  end if;

  new.amount_base := round(new.amount / new.fx_rate, 2);
  return new;
end;
$$;

drop trigger if exists payments_set_base_amount on public.payments;
create trigger payments_set_base_amount
  before insert or update of amount, currency, fx_rate on public.payments
  for each row execute function public.payments_set_base_amount();

-- الدفعات المسجَّلة قبل هذه الهجرة: تُحسب بالسعر الحالي، وهو أفضل ما لدينا
update public.payments p
   set fx_rate = case
         when p.currency = (select base_currency from public.app_settings where id) then 1
         else coalesce((select units_per_base from public.currency_rates r where r.code = p.currency), 1)
       end
 where p.fx_rate is null;

update public.payments
   set amount_base = round(amount / nullif(fx_rate, 0), 2)
 where amount_base is null and fx_rate is not null;

-- -----------------------------------------------------------------------------
-- 4. الصلاحيات — نفس قاعدة بقية الجداول
-- -----------------------------------------------------------------------------

alter table public.app_settings   enable row level security;
alter table public.currency_rates enable row level security;

do $$
declare t text;
begin
  foreach t in array array['app_settings', 'currency_rates'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_authenticated', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_active_staff())',
      t || '_select_authenticated', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.is_active_staff()) with check (private.is_active_staff())',
      t || '_update_authenticated', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.is_active_staff())',
      t || '_insert_authenticated', t);
  end loop;
exception when undefined_function then
  -- قاعدة بيانات لم تُطبَّق عليها 0004 بعد (CI مثلاً)
  null;
end $$;

grant select, insert, update on public.app_settings   to authenticated;
grant select, insert, update on public.currency_rates to authenticated;
grant all on public.app_settings   to service_role;
grant all on public.currency_rates to service_role;

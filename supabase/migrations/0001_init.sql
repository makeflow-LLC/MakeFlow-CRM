-- =============================================================================
-- Makeflow CRM — 0001_init
-- Schema, enums, indexes, triggers, views, RLS policies.
--
-- Modeling rules enforced here:
--   1. ONE contacts table. A person exists exactly once. Unique key = phone (E.164).
--   2. Organizations are separate from contacts; the link is optional.
--   3. Status never lives on the contact — it lives on the deal.
--   4. One contact can have many concurrent deals across different products.
--   5. Payments are rows, not a boolean. Subscriptions are separate from deals.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- ENUMS
-- =============================================================================

do $$ begin
  create type org_type as enum ('clinic', 'salon', 'shop', 'company', 'school', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_source as enum ('whatsapp_bot', 'facebook_ad', 'referral', 'workshop', 'manual', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_status as enum ('open', 'won', 'lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum ('whatsapp', 'call', 'meeting', 'note', 'email', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_source as enum ('manual', 'bot', 'n8n');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('paid', 'needs_checking', 'not_paid', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('bank_transfer', 'cash', 'wallet', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'paused', 'churned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('open', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- SHARED HELPERS
-- =============================================================================

-- Keeps updated_at honest without the app having to remember.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalizes a phone number to E.164. Palestinian local formats (0599..., 059...)
-- are assumed to be +970 unless an explicit country code is already present.
create or replace function public.normalize_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  digits text;
begin
  if p_phone is null or btrim(p_phone) = '' then
    return null;
  end if;

  -- keep a leading + marker, drop every other non-digit
  digits := regexp_replace(p_phone, '[^0-9+]', '', 'g');

  if left(digits, 2) = '00' then
    digits := '+' || substring(digits from 3);
  end if;

  if left(digits, 1) = '+' then
    return '+' || regexp_replace(substring(digits from 2), '[^0-9]', '', 'g');
  end if;

  -- local Palestinian number: 0599123456 -> +970599123456
  if left(digits, 1) = '0' then
    return '+970' || substring(digits from 2);
  end if;

  -- bare number already carrying a country code
  return '+' || digits;
end;
$$;

-- =============================================================================
-- users (staff) — 3 people, not a tenant system
-- =============================================================================

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,
  full_name     text not null,
  phone         text,
  role          text not null default 'sales'
                  check (role in ('admin', 'sales', 'operator')),
  avatar_color  text not null default '#5B4CE0'
                  check (avatar_color ~* '^#[0-9a-f]{6}$'),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists users_auth_user_id_idx on public.users (auth_user_id);

-- Maps the logged-in Supabase Auth user to their staff row.
-- plpgsql (not sql) so the body binds at call time: the migration still applies
-- on a plain Postgres without the auth schema, e.g. in CI.
create or replace function public.current_staff_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid;
begin
  begin
    v_auth_uid := auth.uid();
  exception when others then
    return null;
  end;

  return (select u.id from public.users u where u.auth_user_id = v_auth_uid limit 1);
end;
$$;

-- Internal helper used by policies, not a public REST endpoint.
revoke all on function public.current_staff_id() from public, anon;
grant execute on function public.current_staff_id() to authenticated, service_role;

-- =============================================================================
-- organizations
-- =============================================================================

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        org_type not null default 'other',
  sector      text,
  city        text,
  website     text,
  notes       text,
  owner_id    uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One org per name: lets n8n look an organization up by name safely.
create unique index if not exists organizations_name_unique_idx
  on public.organizations (lower(btrim(name)));
create index if not exists organizations_owner_id_idx on public.organizations (owner_id);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- contacts — a person exists exactly once, keyed by phone
-- =============================================================================

create table if not exists public.contacts (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  phone              text not null unique
                       check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  whatsapp_id        text,
  email              text,
  city               text,
  preferred_language text not null default 'ar'
                       check (preferred_language in ('ar', 'en')),
  source             contact_source not null default 'manual',
  source_detail      text,
  organization_id    uuid references public.organizations (id) on delete set null,
  role_in_org        text,
  owner_id           uuid references public.users (id) on delete set null,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists contacts_phone_idx           on public.contacts (phone);
create index if not exists contacts_organization_id_idx on public.contacts (organization_id);
create index if not exists contacts_owner_id_idx        on public.contacts (owner_id);
create index if not exists contacts_full_name_idx       on public.contacts (lower(full_name));

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- Phone is the identity key, so it is normalized on the way in — no matter
-- whether the row comes from the UI, a CSV, or n8n.
create or replace function public.contacts_normalize_phone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  if new.whatsapp_id is not null then
    new.whatsapp_id := btrim(new.whatsapp_id);
  end if;
  return new;
end;
$$;

drop trigger if exists contacts_normalize_phone on public.contacts;
create trigger contacts_normalize_phone
  before insert or update of phone, whatsapp_id on public.contacts
  for each row execute function public.contacts_normalize_phone();

-- =============================================================================
-- products
-- =============================================================================

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  kind           text not null
                   check (kind in ('course', 'subscription', 'service')),
  default_price  numeric(12, 2),
  currency       text not null default 'ILS',
  color          text not null default '#5B4CE0'
                   check (color ~* '^#[0-9a-f]{6}$'),
  active         boolean not null default true
);

create unique index if not exists products_name_unique_idx
  on public.products (lower(btrim(name)));

-- =============================================================================
-- cohorts — course instances (kind = 'course' only)
-- =============================================================================

create table if not exists public.cohorts (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  title          text not null,
  start_date     date,
  end_date       date,
  schedule_note  text,
  venue          text,
  capacity       integer check (capacity is null or capacity > 0),
  price          numeric(12, 2),
  active         boolean not null default true,
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists cohorts_product_id_idx on public.cohorts (product_id);

-- A cohort only makes sense for a course.
create or replace function public.cohorts_require_course_product()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_kind text;
begin
  select kind into v_kind from public.products where id = new.product_id;
  if v_kind is distinct from 'course' then
    raise exception 'COHORT_PRODUCT_NOT_COURSE: cohorts can only belong to products of kind=course'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists cohorts_require_course_product on public.cohorts;
create trigger cohorts_require_course_product
  before insert or update of product_id on public.cohorts
  for each row execute function public.cohorts_require_course_product();

-- =============================================================================
-- pipelines + stages
-- =============================================================================

create table if not exists public.pipelines (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  product_kind  text not null
                  check (product_kind in ('course', 'subscription', 'service'))
);

create unique index if not exists pipelines_name_unique_idx
  on public.pipelines (lower(btrim(name)));

create table if not exists public.pipeline_stages (
  id            uuid primary key default gen_random_uuid(),
  pipeline_id   uuid not null references public.pipelines (id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0,
  color         text not null default '#9AA4B2'
                  check (color ~* '^#[0-9a-f]{6}$'),
  is_won        boolean not null default false,
  is_lost       boolean not null default false,
  -- Marks the stage a deal jumps to once it is fully paid (automation rule 5).
  -- Not every pipeline has one — B2B has no payment stage.
  is_paid_stage boolean not null default false,
  check (not (is_won and is_lost))
);

create unique index if not exists pipeline_stages_pipeline_name_unique_idx
  on public.pipeline_stages (pipeline_id, lower(btrim(name)));
create index if not exists pipeline_stages_pipeline_id_sort_idx
  on public.pipeline_stages (pipeline_id, sort_order);

-- At most one paid-stage per pipeline.
create unique index if not exists pipeline_stages_one_paid_stage_idx
  on public.pipeline_stages (pipeline_id) where is_paid_stage;

-- =============================================================================
-- deals — status lives HERE, never on the contact
-- =============================================================================

create table if not exists public.deals (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  contact_id          uuid not null references public.contacts (id) on delete cascade,
  organization_id     uuid references public.organizations (id) on delete set null,
  product_id          uuid not null references public.products (id) on delete restrict,
  cohort_id           uuid references public.cohorts (id) on delete set null,
  pipeline_id         uuid not null references public.pipelines (id) on delete restrict,
  stage_id            uuid not null references public.pipeline_stages (id) on delete restrict,
  stage_entered_at    timestamptz not null default now(),
  value               numeric(12, 2) not null default 0,
  currency            text not null default 'ILS',
  status              deal_status not null default 'open',
  lost_reason         text,
  expected_close_date date,
  owner_id            uuid references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists deals_stage_id_idx   on public.deals (stage_id);
create index if not exists deals_contact_id_idx on public.deals (contact_id);
create index if not exists deals_owner_id_idx   on public.deals (owner_id);
create index if not exists deals_status_idx     on public.deals (status);
create index if not exists deals_product_id_idx on public.deals (product_id);
-- Supports "is there already an open deal for this person + product?" (upsert_lead).
create index if not exists deals_open_contact_product_idx
  on public.deals (contact_id, product_id) where status = 'open';

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- Automation rules 1 + 2, plus the stage_entered_at reset.
create or replace function public.deals_handle_stage_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_stage record;
begin
  select id, pipeline_id, is_won, is_lost
    into v_stage
    from public.pipeline_stages
   where id = new.stage_id;

  if v_stage.id is null then
    raise exception 'STAGE_NOT_FOUND: stage % does not exist', new.stage_id;
  end if;

  -- The stage must belong to the deal's pipeline, otherwise the board lies.
  if v_stage.pipeline_id is distinct from new.pipeline_id then
    raise exception 'STAGE_PIPELINE_MISMATCH: stage % does not belong to pipeline %',
      new.stage_id, new.pipeline_id
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    new.stage_entered_at := now();
  end if;

  -- Rule 1: a won stage closes the deal as won.
  if v_stage.is_won then
    new.status := 'won';
    new.lost_reason := null;

  -- Rule 2: a lost stage requires a reason. The UI shows a blocking modal;
  -- this is the backstop so n8n or a raw REST call cannot bypass it.
  elsif v_stage.is_lost then
    if new.lost_reason is null or btrim(new.lost_reason) = '' then
      raise exception 'LOST_REASON_REQUIRED: moving a deal to a lost stage requires lost_reason'
        using errcode = 'check_violation';
    end if;
    new.status := 'lost';

  else
    -- Moved back into the middle of the board: the deal is live again.
    if tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
      new.status := 'open';
      new.lost_reason := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists deals_handle_stage_change on public.deals;
create trigger deals_handle_stage_change
  before insert or update on public.deals
  for each row execute function public.deals_handle_stage_change();

-- =============================================================================
-- activities — the timeline behind Contact 360
-- =============================================================================

create table if not exists public.activities (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.contacts (id) on delete cascade,
  deal_id      uuid references public.deals (id) on delete set null,
  type         activity_type not null default 'note',
  direction    text not null default 'none'
                 check (direction in ('in', 'out', 'none')),
  summary      text,
  body         text,
  occurred_at  timestamptz not null default now(),
  created_by   uuid references public.users (id) on delete set null,
  source       activity_source not null default 'manual',
  -- WAHA message id / n8n execution id — also the retry guard for n8n.
  external_ref text
);

create index if not exists activities_contact_id_idx  on public.activities (contact_id);
create index if not exists activities_deal_id_idx     on public.activities (deal_id);
create index if not exists activities_occurred_at_idx on public.activities (occurred_at desc);
create unique index if not exists activities_external_ref_unique_idx
  on public.activities (external_ref) where external_ref is not null;

-- =============================================================================
-- tasks — "the next step", the thing the daily dashboard nags about
-- =============================================================================

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  deal_id       uuid references public.deals (id) on delete cascade,
  contact_id    uuid references public.contacts (id) on delete cascade,
  due_at        timestamptz not null,
  assigned_to   uuid references public.users (id) on delete set null,
  status        task_status not null default 'open',
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists tasks_open_assignee_due_idx
  on public.tasks (assigned_to, due_at) where status = 'open';
create index if not exists tasks_deal_id_idx    on public.tasks (deal_id);
create index if not exists tasks_contact_id_idx on public.tasks (contact_id);

-- completed_at should always agree with status.
create or replace function public.tasks_sync_completed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'done' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_sync_completed_at on public.tasks;
create trigger tasks_sync_completed_at
  before insert or update of status on public.tasks
  for each row execute function public.tasks_sync_completed_at();

-- Rule 3: a new deal always gets a first-contact task, so nothing goes quiet.
create or replace function public.deals_create_first_task()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.tasks (title, deal_id, contact_id, due_at, assigned_to, status)
  values ('أول تواصل', new.id, new.contact_id, now() + interval '24 hours', new.owner_id, 'open');
  return new;
end;
$$;

drop trigger if exists deals_create_first_task on public.deals;
create trigger deals_create_first_task
  after insert on public.deals
  for each row execute function public.deals_create_first_task();

-- =============================================================================
-- payments — rows, never a boolean
-- =============================================================================

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  deal_id      uuid not null references public.deals (id) on delete cascade,
  amount       numeric(12, 2) not null,
  currency     text not null default 'ILS',
  method       payment_method not null default 'other',
  status       payment_status not null default 'needs_checking',
  receipt_url  text,
  paid_at      timestamptz,
  verified_by  uuid references public.users (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists payments_deal_id_idx on public.payments (deal_id);
create index if not exists payments_status_idx  on public.payments (status);

-- Rule 5: once confirmed payments cover the deal value, the deal moves itself
-- to the pipeline's paid stage. Only ever moves forward, never on a closed deal.
create or replace function public.payments_advance_deal_when_paid()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_deal        record;
  v_paid_total  numeric(12, 2);
  v_paid_stage  record;
  v_current     record;
begin
  if new.status <> 'paid' then
    return null;
  end if;

  select d.* into v_deal from public.deals d where d.id = new.deal_id;
  if v_deal.id is null or v_deal.status <> 'open' or coalesce(v_deal.value, 0) <= 0 then
    return null;
  end if;

  select coalesce(sum(p.amount), 0) into v_paid_total
    from public.payments p
   where p.deal_id = new.deal_id and p.status = 'paid';

  if v_paid_total < v_deal.value then
    return null;
  end if;

  select * into v_paid_stage
    from public.pipeline_stages
   where pipeline_id = v_deal.pipeline_id and is_paid_stage
   limit 1;

  if v_paid_stage.id is null or v_paid_stage.id = v_deal.stage_id then
    return null;
  end if;

  select * into v_current
    from public.pipeline_stages
   where id = v_deal.stage_id;

  -- never drag a deal backwards on the board
  if v_current.sort_order >= v_paid_stage.sort_order then
    return null;
  end if;

  update public.deals set stage_id = v_paid_stage.id where id = v_deal.id;

  insert into public.activities (contact_id, deal_id, type, direction, summary, source)
  values (v_deal.contact_id, v_deal.id, 'system', 'none',
          'انتقلت الصفقة تلقائياً إلى مرحلة «' || v_paid_stage.name || '» بعد تأكيد الدفع', 'manual');

  return null;
end;
$$;

drop trigger if exists payments_advance_deal_when_paid on public.payments;
create trigger payments_advance_deal_when_paid
  after insert or update of status, amount on public.payments
  for each row execute function public.payments_advance_deal_when_paid();

-- =============================================================================
-- subscriptions — recurring revenue, separate from one-off deals
-- =============================================================================

create table if not exists public.subscriptions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations (id) on delete set null,
  contact_id       uuid references public.contacts (id) on delete set null,
  product_id       uuid not null references public.products (id) on delete restrict,
  deal_id          uuid references public.deals (id) on delete set null,
  plan_name        text,
  monthly_amount   numeric(12, 2) not null default 0,
  currency         text not null default 'ILS',
  start_date       date,
  renewal_date     date,
  status           subscription_status not null default 'active',
  churn_reason     text,
  owner_id         uuid references public.users (id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint subscriptions_has_a_customer
    check (organization_id is not null or contact_id is not null)
);

create index if not exists subscriptions_status_renewal_idx
  on public.subscriptions (status, renewal_date);
create index if not exists subscriptions_organization_id_idx on public.subscriptions (organization_id);
create index if not exists subscriptions_contact_id_idx      on public.subscriptions (contact_id);
create index if not exists subscriptions_product_id_idx      on public.subscriptions (product_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =============================================================================
-- tags
-- =============================================================================

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#9AA4B2'
               check (color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists tags_name_unique_idx on public.tags (lower(btrim(name)));

create table if not exists public.contact_tags (
  contact_id uuid not null references public.contacts (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create index if not exists contact_tags_tag_id_idx on public.contact_tags (tag_id);

-- =============================================================================
-- VIEWS
-- security_invoker keeps RLS applied as the calling user, not the view owner.
-- =============================================================================

-- Everything that needs attention today, per user: due/overdue tasks and deals
-- that have been sitting in the same stage for more than 48 hours.
create or replace view public.v_daily_queue
with (security_invoker = true) as
  select
    t.assigned_to                       as user_id,
    case when t.due_at < date_trunc('day', now()) then 'task_overdue' else 'task_today' end as item_kind,
    t.id                                as item_id,
    t.title                             as title,
    t.due_at                            as due_at,
    t.deal_id                           as deal_id,
    t.contact_id                        as contact_id,
    c.full_name                         as contact_name,
    null::numeric                       as deal_value,
    null::text                          as stage_name,
    null::text                          as stage_color,
    null::integer                       as hours_in_stage
  from public.tasks t
  left join public.contacts c on c.id = t.contact_id
  where t.status = 'open'
    and t.due_at < date_trunc('day', now()) + interval '1 day'

  union all

  select
    d.owner_id                          as user_id,
    'deal_stuck'                        as item_kind,
    d.id                                as item_id,
    d.title                             as title,
    d.stage_entered_at                  as due_at,
    d.id                                as deal_id,
    d.contact_id                        as contact_id,
    c.full_name                         as contact_name,
    d.value                             as deal_value,
    s.name                              as stage_name,
    s.color                             as stage_color,
    floor(extract(epoch from (now() - d.stage_entered_at)) / 3600)::integer as hours_in_stage
  from public.deals d
  join public.contacts c        on c.id = d.contact_id
  join public.pipeline_stages s on s.id = d.stage_id
  where d.status = 'open'
    and d.stage_entered_at < now() - interval '48 hours';

-- Deal + what has actually been collected + what is still owed.
create or replace view public.v_deal_financials
with (security_invoker = true) as
  select
    d.id                                                    as deal_id,
    d.title,
    d.contact_id,
    d.organization_id,
    d.product_id,
    d.owner_id,
    d.status,
    d.currency,
    d.value                                                 as deal_value,
    coalesce(paid.total, 0)                                 as paid_total,
    coalesce(pending.total, 0)                              as pending_total,
    greatest(d.value - coalesce(paid.total, 0), 0)          as balance_due,
    (coalesce(paid.total, 0) >= d.value and d.value > 0)    as is_fully_paid
  from public.deals d
  left join lateral (
    select sum(p.amount) as total
      from public.payments p
     where p.deal_id = d.id and p.status = 'paid'
  ) paid on true
  left join lateral (
    select sum(p.amount) as total
      from public.payments p
     where p.deal_id = d.id and p.status = 'needs_checking'
  ) pending on true;

-- Monthly recurring revenue, broken down per product.
create or replace view public.v_mrr
with (security_invoker = true) as
  select
    p.id                        as product_id,
    p.name                      as product_name,
    p.color                     as product_color,
    s.currency,
    count(*)                    as active_subscriptions,
    sum(s.monthly_amount)       as mrr
  from public.subscriptions s
  join public.products p on p.id = s.product_id
  where s.status = 'active'
  group by p.id, p.name, p.color, s.currency;

-- Renewals landing in the next 30 days (and anything already overdue).
create or replace view public.v_renewals_30d
with (security_invoker = true) as
  select
    s.id                                            as subscription_id,
    s.plan_name,
    s.monthly_amount,
    s.currency,
    s.renewal_date,
    (s.renewal_date - current_date)                 as days_until_renewal,
    s.status,
    s.owner_id,
    p.id                                            as product_id,
    p.name                                          as product_name,
    p.color                                         as product_color,
    o.id                                            as organization_id,
    o.name                                          as organization_name,
    c.id                                            as contact_id,
    c.full_name                                     as contact_name
  from public.subscriptions s
  join public.products p            on p.id = s.product_id
  left join public.organizations o  on o.id = s.organization_id
  left join public.contacts c       on c.id = s.contact_id
  where s.status = 'active'
    and s.renewal_date is not null
    and s.renewal_date <= current_date + 30;

-- Everything about one person on a single row — powers the Contact 360 screen.
create or replace view public.v_contact_360
with (security_invoker = true) as
  select
    c.id                                     as contact_id,
    c.full_name,
    c.phone,
    c.email,
    c.city,
    c.preferred_language,
    c.source,
    c.source_detail,
    c.role_in_org,
    c.notes,
    c.created_at,
    c.owner_id,
    owner.full_name                          as owner_name,
    owner.avatar_color                       as owner_color,
    o.id                                     as organization_id,
    o.name                                   as organization_name,
    o.type                                   as organization_type,
    coalesce(d.deals_count, 0)               as deals_count,
    coalesce(d.open_deals_count, 0)          as open_deals_count,
    coalesce(d.won_deals_count, 0)           as won_deals_count,
    coalesce(d.deals, '[]'::jsonb)           as deals,
    la.last_activity_at,
    la.last_activity_summary,
    la.last_activity_type,
    coalesce(ltv.lifetime_value, 0)          as lifetime_value
  from public.contacts c
  left join public.users owner        on owner.id = c.owner_id
  left join public.organizations o    on o.id = c.organization_id
  left join lateral (
    select
      count(*)                                                as deals_count,
      count(*) filter (where dd.status = 'open')              as open_deals_count,
      count(*) filter (where dd.status = 'won')               as won_deals_count,
      jsonb_agg(
        jsonb_build_object(
          'id', dd.id,
          'title', dd.title,
          'status', dd.status,
          'value', dd.value,
          'currency', dd.currency,
          'product_id', dd.product_id,
          'product_name', pr.name,
          'product_color', pr.color,
          'stage_id', dd.stage_id,
          'stage_name', st.name,
          'stage_color', st.color,
          'stage_entered_at', dd.stage_entered_at,
          'created_at', dd.created_at
        ) order by dd.created_at desc
      ) as deals
    from public.deals dd
    join public.products pr        on pr.id = dd.product_id
    join public.pipeline_stages st on st.id = dd.stage_id
    where dd.contact_id = c.id
  ) d on true
  left join lateral (
    select a.occurred_at as last_activity_at,
           a.summary     as last_activity_summary,
           a.type        as last_activity_type
      from public.activities a
     where a.contact_id = c.id
     order by a.occurred_at desc
     limit 1
  ) la on true
  left join lateral (
    select sum(p.amount) as lifetime_value
      from public.payments p
      join public.deals d2 on d2.id = p.deal_id
     where d2.contact_id = c.id and p.status = 'paid'
  ) ltv on true;

-- =============================================================================
-- ROW LEVEL SECURITY
-- RLS is ON everywhere. Policies are explicit — never disabled.
-- The 3 staff members share one workspace: authenticated = full read/write.
-- service_role (n8n only) bypasses RLS by definition; the key never reaches
-- the frontend.
-- =============================================================================

alter table public.users            enable row level security;
alter table public.organizations    enable row level security;
alter table public.contacts         enable row level security;
alter table public.products         enable row level security;
alter table public.cohorts          enable row level security;
alter table public.pipelines        enable row level security;
alter table public.pipeline_stages  enable row level security;
alter table public.deals            enable row level security;
alter table public.activities       enable row level security;
alter table public.tasks            enable row level security;
alter table public.payments         enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.tags             enable row level security;
alter table public.contact_tags     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'organizations', 'contacts', 'products', 'cohorts',
    'pipelines', 'pipeline_stages', 'deals', 'activities', 'tasks',
    'payments', 'subscriptions', 'tags', 'contact_tags'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_authenticated', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_select_authenticated', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_insert_authenticated', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update_authenticated', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      t || '_delete_authenticated', t);
  end loop;
end $$;

-- =============================================================================
-- GRANTS — authenticated staff only. anon gets nothing.
-- =============================================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;

revoke all on all tables in schema public from anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;

-- =============================================================================
-- Makeflow CRM — 0003_team
--
-- Adds what the in-app Team screen needs, and closes the hole that made
-- "deactivate a member" meaningless:
--
--   1. users.email — so the app can show which login belongs to which staff
--      row without ever holding the service_role key.
--   2. is_active_staff() — the caller has a linked, active staff row.
--   3. RLS policies move from `using (true)` to `using (is_active_staff())`.
--      Before this, ANY authenticated Supabase user could read and write every
--      table, whether or not they were staff — and setting active = false
--      changed nothing at all.
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. email on the staff row
-- -----------------------------------------------------------------------------

alter table public.users add column if not exists email text;

create unique index if not exists users_email_key
  on public.users (lower(email)) where email is not null;

-- Backfill from auth for rows created before this migration. Wrapped because
-- the auth schema does not exist on a plain Postgres (CI applies this file too).
do $$ begin
  update public.users u
     set email = a.email
    from auth.users a
   where a.id = u.auth_user_id
     and u.email is distinct from a.email;
exception when undefined_table or invalid_schema_name then
  null;
end $$;

-- -----------------------------------------------------------------------------
-- 2. is_active_staff()
-- -----------------------------------------------------------------------------

-- security definer so it can read public.users past that table's own RLS,
-- and plpgsql so auth.uid() binds at call time rather than at create time.
create or replace function public.is_active_staff()
returns boolean
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
    return false;
  end;

  if v_auth_uid is null then
    return false;
  end if;

  return exists (
    select 1 from public.users u
     where u.auth_user_id = v_auth_uid
       and u.active
  );
end;
$$;

-- Internal helper for policies, not a public REST endpoint.
revoke all on function public.is_active_staff() from public, anon;
grant execute on function public.is_active_staff() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. RLS — an authenticated session is no longer enough on its own
-- -----------------------------------------------------------------------------

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
      'create policy %I on public.%I for select to authenticated using (public.is_active_staff())',
      t || '_select_authenticated', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_active_staff())',
      t || '_insert_authenticated', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff())',
      t || '_update_authenticated', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_active_staff())',
      t || '_delete_authenticated', t);
  end loop;
end $$;

-- The staff table itself is the one exception on write: creating, renaming or
-- deactivating a member goes through the service_role key on the server, where
-- the app has already checked the caller is an admin. Staff sessions may read
-- the roster (to show owners and avatars) but never write to it directly.
drop policy if exists users_insert_authenticated on public.users;
drop policy if exists users_update_authenticated on public.users;
drop policy if exists users_delete_authenticated on public.users;

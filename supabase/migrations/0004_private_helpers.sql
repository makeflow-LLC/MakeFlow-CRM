-- =============================================================================
-- Makeflow CRM — 0004_private_helpers
--
-- Moves the RLS helper out of the schema PostgREST publishes.
--
-- A `security definer` function sitting in `public` gets its own REST endpoint
-- (/rest/v1/rpc/…), so every signed-in session can call it directly. Neither
-- helper here leaks anything a caller cannot already see about themselves, but
-- a definer function should not be reachable from the outside at all when its
-- only job is to be read by a policy. Supabase's own linter flags exactly this.
--
-- Also drops current_staff_id(): written in 0001, never referenced by any
-- policy, trigger or screen — the app resolves the staff row in TypeScript.
--
-- Idempotent: safe to re-run.
-- =============================================================================

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_active_staff()
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

revoke all on function private.is_active_staff() from public, anon;
grant execute on function private.is_active_staff() to authenticated, service_role;

-- Repoint every policy before the old function can be dropped.
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
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_active_staff())',
      t || '_select_authenticated', t);

    -- The staff roster stays read-only for staff sessions: writing to it goes
    -- through the service_role key after the server has checked for an admin.
    if t <> 'users' then
      execute format('drop policy if exists %I on public.%I', t || '_insert_authenticated', t);
      execute format('drop policy if exists %I on public.%I', t || '_update_authenticated', t);
      execute format('drop policy if exists %I on public.%I', t || '_delete_authenticated', t);

      execute format(
        'create policy %I on public.%I for insert to authenticated with check (private.is_active_staff())',
        t || '_insert_authenticated', t);
      execute format(
        'create policy %I on public.%I for update to authenticated using (private.is_active_staff()) with check (private.is_active_staff())',
        t || '_update_authenticated', t);
      execute format(
        'create policy %I on public.%I for delete to authenticated using (private.is_active_staff())',
        t || '_delete_authenticated', t);
    end if;
  end loop;
end $$;

drop function if exists public.is_active_staff();
drop function if exists public.current_staff_id();

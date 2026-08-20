-- =============================================================================
-- Makeflow CRM — 0005_no_first_task_for_closed_deals
--
-- Rule 3 in 0001 creates an "أول تواصل" task for every new deal. That is right
-- for a deal that starts at the top of the board, and wrong for one imported
-- with its outcome already known: a file of eight hundred past students would
-- land eight hundred follow-up tasks in Today, every one of them overdue
-- within a day, and bury the handful that matter.
--
-- The task is now created only for deals that still have somewhere to go —
-- not for one that arrives already won, lost, or paid.
--
-- Idempotent: safe to re-run.
-- =============================================================================

create or replace function public.deals_create_first_task()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_closed boolean;
begin
  select (s.is_won or s.is_lost or s.is_paid_stage)
    into v_closed
    from public.pipeline_stages s
   where s.id = new.stage_id;

  -- صفقة وُلدت منتهية لا تحتاج تذكيراً بأول تواصل
  if coalesce(v_closed, false) or new.status <> 'open' then
    return new;
  end if;

  insert into public.tasks (title, deal_id, contact_id, due_at, assigned_to, status)
  values ('أول تواصل', new.id, new.contact_id, now() + interval '24 hours', new.owner_id, 'open');

  return new;
end;
$$;

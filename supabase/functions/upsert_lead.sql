-- =============================================================================
-- Makeflow CRM — upsert_lead()
--
-- The single entry point n8n uses. One WhatsApp conversation = one call.
-- Idempotent on (phone, product): calling it ten times for the same person and
-- the same product yields one contact, one organization, and one open deal.
--
--   POST /rest/v1/rpc/upsert_lead     (service_role key, n8n only)
--
-- Returns: { contact_id, deal_id, organization_id, contact_created, deal_created }
-- =============================================================================

create or replace function public.upsert_lead(
  p_phone           text,
  p_full_name       text default null,
  p_product_name    text default null,
  p_source          text default 'whatsapp_bot',
  p_summary         text default null,
  p_payment_status  text default null,
  p_org_name        text default null,
  p_amount          numeric default null,
  p_external_ref    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone           text;
  v_source          contact_source;
  v_payment_status  payment_status;
  v_contact         public.contacts;
  v_contact_created boolean := false;
  v_org             public.organizations;
  v_product         public.products;
  v_pipeline        public.pipelines;
  v_stage           public.pipeline_stages;
  v_deal            public.deals;
  v_deal_created    boolean := false;
  v_owner_id        uuid;
  v_amount          numeric;
begin
  -- ---------------------------------------------------------------------------
  -- 1. Validate + normalize the identity key
  -- ---------------------------------------------------------------------------
  v_phone := public.normalize_phone(p_phone);

  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'INVALID_PHONE: % could not be normalized to E.164', p_phone
      using errcode = 'invalid_parameter_value';
  end if;

  begin
    v_source := coalesce(p_source, 'whatsapp_bot')::contact_source;
  exception when invalid_text_representation then
    v_source := 'other';
  end;

  if p_payment_status is not null and btrim(p_payment_status) <> '' then
    begin
      v_payment_status := p_payment_status::payment_status;
    exception when invalid_text_representation then
      v_payment_status := 'needs_checking';
    end;
  end if;

  -- Unassigned bot leads land on the sales coordinator, otherwise the admin.
  select id into v_owner_id
    from public.users
   where active
   order by case role when 'sales' then 0 when 'admin' then 1 else 2 end, created_at
   limit 1;

  -- ---------------------------------------------------------------------------
  -- 2. Organization (optional)
  -- ---------------------------------------------------------------------------
  if p_org_name is not null and btrim(p_org_name) <> '' then
    select * into v_org
      from public.organizations
     where lower(btrim(name)) = lower(btrim(p_org_name))
     limit 1;

    if v_org.id is null then
      insert into public.organizations (name, type, owner_id)
      values (btrim(p_org_name), 'other', v_owner_id)
      returning * into v_org;
    end if;
  end if;

  -- ---------------------------------------------------------------------------
  -- 3. Contact — find by phone, or create. Never a second row for one person.
  -- ---------------------------------------------------------------------------
  select * into v_contact from public.contacts where phone = v_phone;

  if v_contact.id is null then
    insert into public.contacts (full_name, phone, whatsapp_id, source, source_detail, organization_id, owner_id)
    values (
      coalesce(nullif(btrim(p_full_name), ''), v_phone),
      v_phone,
      v_phone,
      v_source,
      p_summary,
      v_org.id,
      v_owner_id
    )
    returning * into v_contact;

    v_contact_created := true;
  else
    -- Only fill gaps — a human may have corrected these already.
    update public.contacts
       set full_name       = case
                               when coalesce(btrim(full_name), '') in ('', v_phone)
                                    and nullif(btrim(p_full_name), '') is not null
                               then btrim(p_full_name)
                               else full_name
                             end,
           organization_id = coalesce(organization_id, v_org.id),
           whatsapp_id     = coalesce(whatsapp_id, v_phone)
     where id = v_contact.id
    returning * into v_contact;
  end if;

  -- ---------------------------------------------------------------------------
  -- 4. Product + pipeline. No product means we only log the conversation.
  -- ---------------------------------------------------------------------------
  if p_product_name is not null and btrim(p_product_name) <> '' then
    select * into v_product
      from public.products
     where lower(btrim(name)) = lower(btrim(p_product_name))
     limit 1;

    if v_product.id is null then
      raise exception 'PRODUCT_NOT_FOUND: no product named %', p_product_name
        using errcode = 'invalid_parameter_value',
              hint = 'Use one of the names in public.products (exact, case-insensitive).';
    end if;

    select * into v_pipeline
      from public.pipelines
     where product_kind = v_product.kind
     limit 1;

    -- services share the B2B board with subscriptions
    if v_pipeline.id is null then
      select * into v_pipeline
        from public.pipelines
       where product_kind = 'subscription'
       limit 1;
    end if;

    if v_pipeline.id is null then
      raise exception 'PIPELINE_NOT_FOUND: no pipeline for product kind %', v_product.kind;
    end if;

    select * into v_stage
      from public.pipeline_stages
     where pipeline_id = v_pipeline.id and not is_won and not is_lost
     order by sort_order
     limit 1;

    -- ---- the idempotency key: one OPEN deal per (contact, product) ----
    select * into v_deal
      from public.deals
     where contact_id = v_contact.id
       and product_id = v_product.id
       and status = 'open'
     order by created_at
     limit 1;

    if v_deal.id is null then
      insert into public.deals (
        title, contact_id, organization_id, product_id,
        pipeline_id, stage_id, value, currency, owner_id
      )
      values (
        v_contact.full_name || ' — ' || v_product.name,
        v_contact.id,
        coalesce(v_org.id, v_contact.organization_id),
        v_product.id,
        v_pipeline.id,
        v_stage.id,
        coalesce(v_product.default_price, 0),
        v_product.currency,
        coalesce(v_contact.owner_id, v_owner_id)
      )
      returning * into v_deal;

      v_deal_created := true;
    end if;
  end if;

  -- ---------------------------------------------------------------------------
  -- 5. Activity. external_ref makes an n8n retry a no-op instead of a duplicate.
  -- ---------------------------------------------------------------------------
  if coalesce(btrim(p_summary), '') <> '' then
    if p_external_ref is null
       or not exists (select 1 from public.activities where external_ref = p_external_ref) then
      insert into public.activities (
        contact_id, deal_id, type, direction, summary, occurred_at, source, external_ref
      )
      values (
        v_contact.id, v_deal.id, 'whatsapp', 'in', btrim(p_summary), now(), 'bot', p_external_ref
      );
    end if;
  end if;

  -- ---------------------------------------------------------------------------
  -- 6. Payment. Recorded as a row awaiting human verification, never a boolean.
  --    Rule 5 (auto-advance once fully paid) fires from the payments trigger.
  -- ---------------------------------------------------------------------------
  if v_payment_status is not null and v_deal.id is not null then
    v_amount := coalesce(p_amount, nullif(v_deal.value, 0), v_product.default_price, 0);

    if not exists (
      select 1 from public.payments
       where deal_id = v_deal.id
         and status = v_payment_status
         and amount = v_amount
    ) then
      insert into public.payments (deal_id, amount, currency, method, status, paid_at, note)
      values (
        v_deal.id,
        v_amount,
        v_deal.currency,
        'other',
        v_payment_status,
        case when v_payment_status = 'paid' then now() else null end,
        'سُجّلت من البوت'
      );
    end if;
  end if;

  return jsonb_build_object(
    'contact_id',      v_contact.id,
    'deal_id',         v_deal.id,
    'organization_id', coalesce(v_org.id, v_contact.organization_id),
    'contact_created', v_contact_created,
    'deal_created',    v_deal_created
  );
end;
$$;

comment on function public.upsert_lead is
  'n8n entry point. Idempotent on (phone, product): finds or creates the contact, '
  'the organization, and the open deal; logs a bot activity; records a payment row.';

revoke all on function public.upsert_lead(
  text, text, text, text, text, text, text, numeric, text
) from public, anon;

grant execute on function public.upsert_lead(
  text, text, text, text, text, text, text, numeric, text
) to service_role, authenticated;

alter table public.company_settings add column owner_email text;
alter table public.email_deliveries add column send_started_at timestamptz;
alter table public.email_deliveries drop constraint email_deliveries_status_check;
alter table public.email_deliveries add constraint email_deliveries_status_check check (status in ('pending','sending','sent','failed','uncertain'));

create function public.claim_email_delivery(p_id uuid) returns boolean
language plpgsql security definer set search_path = public
as $$
declare claimed uuid;
begin
  update public.email_deliveries set status='sending', send_started_at=now(), attempts=attempts+1
  where id=p_id and (status in ('pending','failed') )
  returning id into claimed;
  return claimed is not null;
end;
$$;
revoke all on function public.claim_email_delivery(uuid) from public, anon, authenticated;
grant execute on function public.claim_email_delivery(uuid) to service_role;

create function public.approve_quotation_version(p_id uuid,p_owner uuid,p_token_hash text,p_pdf_hash text,p_pdf_path text) returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_quotation uuid;
begin
  select quotation_id into v_quotation from public.quotation_versions where id=p_id for update;
  if v_quotation is null then return false; end if;
  update public.quotation_versions set status='approved_unsent', approved_by=p_owner,approved_at=now(),
    verification_token_hash=p_token_hash,pdf_sha256=p_pdf_hash,pdf_storage_path=p_pdf_path
  where id=p_id and status='pending';
  if not found then return false; end if;
  return true;
end;
$$;
revoke all on function public.approve_quotation_version(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.approve_quotation_version(uuid,uuid,text,text,text) to service_role;

create function public.mark_quotation_sent(p_id uuid) returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_quote uuid;
begin
  select quotation_id into v_quote from public.quotation_versions where id=p_id for update;
  if v_quote is null then return false; end if;
  update public.quotation_versions set status='sent', sent_at=now()
  where id=p_id and status='approved_unsent';
  if not found then
    return exists(select 1 from public.quotation_versions where id=p_id and status='sent');
  end if;
  update public.quotation_versions set status='superseded'
  where quotation_id=v_quote and id<>p_id and status in ('sent','approved_unsent');
  return true;
end;
$$;
revoke all on function public.mark_quotation_sent(uuid) from public, anon, authenticated;
grant execute on function public.mark_quotation_sent(uuid) to service_role;

create function public.set_product_evidence_state(p_product uuid,p_status text) returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('pending','verified','rejected') then return false; end if;
  update public.products set evidence_status=p_status,
    status=case when p_status<>'verified' and status='published' then 'paused' else status end,
    updated_at=now()
  where id=p_product;
  return found;
end;
$$;
revoke all on function public.set_product_evidence_state(uuid,text) from public, anon, authenticated;
grant execute on function public.set_product_evidence_state(uuid,text) to service_role;

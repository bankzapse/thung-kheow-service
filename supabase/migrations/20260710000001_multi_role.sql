-- Multi-role: บัญชีเดียวถือได้หลายบทบาท + สลับบทบาทที่ใช้งาน (active role)
-- profiles.role = บทบาทที่ใช้งานอยู่ (ขับ RLS + แอป) · profiles.roles = บทบาททั้งหมดที่อนุญาต

alter table public.profiles add column if not exists roles jsonb;

-- backfill: บัญชีเดิม → roles = [role]
update public.profiles set roles = to_jsonb(array[role]) where roles is null;

-- สลับบทบาทที่ใช้งาน — ตรวจว่าอยู่ใน roles ที่อนุญาตก่อน แล้วตั้ง role (active)
create or replace function public.set_active_role(p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed jsonb;
  cur_role text;
begin
  -- role เป็น enum user_role → cast เป็น text เพื่อเทียบกับ roles (jsonb) และ cast กลับตอน update
  select roles, role::text into allowed, cur_role from public.profiles where id = auth.uid();
  if allowed is null then allowed := to_jsonb(array[cur_role]); end if;
  if p_role not in ('seller','buyer','admin','franchise') then
    raise exception 'invalid role %', p_role;
  end if;
  if not (allowed ? p_role) then
    raise exception 'role % not allowed for this account', p_role;
  end if;
  update public.profiles set role = p_role::user_role where id = auth.uid();
end;
$$;

grant execute on function public.set_active_role(text) to authenticated;

-- ตัวช่วย (เจ้าของระบบใช้): ให้/ถอนบทบาทของบัญชีอื่น
create or replace function public.grant_roles(p_user uuid, p_roles jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare is_owner boolean;
begin
  select owner into is_owner from public.profiles where id = auth.uid();
  if not coalesce(is_owner, false) then
    raise exception 'owner only';
  end if;
  update public.profiles set roles = p_roles where id = p_user;
end;
$$;

grant execute on function public.grant_roles(uuid, jsonb) to authenticated;

-- ให้เจ้าของระบบเบอร์ 0892616445 ถือครบ 3 บทบาท + ผูกแฟรนไชส์แรกไว้ทดสอบ
-- (ปรับ franchise_id ตามจริง หรือเอาบรรทัด franchise_id ออกถ้ายังไม่ต้องการ)
update public.profiles p
set roles = '["admin","franchise","seller"]'::jsonb,
    franchise_id = coalesce(p.franchise_id, (select id from public.franchises order by created_at limit 1))
where p.phone in ('0892616445','+66892616445','66892616445');

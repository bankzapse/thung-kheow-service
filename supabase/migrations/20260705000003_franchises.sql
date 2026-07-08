-- ============================================================
-- Migration: แฟรนไชส์ (Drop & Go multi-franchise)
-- QR ถุง = <อักษรย่อแฟรนไชส์>-<ตู้>-<ถุง> เช่น GLN-AA-0000001
-- ปลอดภัย · ไม่ลบข้อมูลเดิม · รันซ้ำได้
-- ต้องรันหลัง 20260705000002_drop_and_go.sql
-- ============================================================

-- role ใหม่ 'franchise' (นอก transaction — ข้อจำกัดของ ALTER TYPE ADD VALUE)
alter type user_role add value if not exists 'franchise';

begin;

-- 1) ตารางแฟรนไชส์
create table if not exists franchises (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,               -- อักษรย่อ เช่น GLN
  name       text not null,
  owner_name text,
  phone      text,
  created_at timestamptz not null default now()
);
alter table franchises enable row level security;
drop policy if exists "fr read" on franchises;
create policy "fr read" on franchises for select using (true);

-- 2) ตู้ผูกกับแฟรนไชส์ (รหัสตู้ไม่ unique ทั่วระบบแล้ว — unique ต่อแฟรนไชส์)
alter table cabinets add column if not exists franchise_id   uuid references franchises(id) on delete set null;
alter table cabinets add column if not exists franchise_code text;
alter table cabinets drop constraint if exists cabinets_code_key;
create unique index if not exists cabinets_fr_code_uidx on cabinets(franchise_code, code);

-- 3) drop_bags รับแฟรนไชส์ + ตู้ (QR = FR-AA-BAG)
create or replace function drop_bags(p_franchise_code text, p_cabinet_code text, p_bag_codes text[])
returns int language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cab cabinets%rowtype; c text; n int := 0; v_full text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_cab from cabinets
    where upper(code) = upper(p_cabinet_code)
      and (coalesce(p_franchise_code, '') = '' or upper(coalesce(franchise_code, '')) = upper(p_franchise_code))
    limit 1;
  if v_cab.id is null then raise exception 'cabinet % not found', coalesce(p_franchise_code || '-', '') || p_cabinet_code; end if;
  v_full := case when coalesce(v_cab.franchise_code, '') = '' then v_cab.code else v_cab.franchise_code || '-' || v_cab.code end;
  foreach c in array p_bag_codes loop
    if c is null or length(btrim(c)) = 0 then continue; end if;
    insert into mesh_bags(code, qr, cabinet_id, cabinet_code, user_id, status)
    values (btrim(c), v_full || '-' || btrim(c), v_cab.id, v_cab.code, v_uid, 'dropped');
    n := n + 1;
  end loop;
  return n;
end $$;

-- 4) add_cabinet เวอร์ชันใหม่ (มี franchise) — drop เวอร์ชันเดิมก่อน (เปลี่ยน signature)
drop function if exists add_cabinet(text, text, text, double precision, double precision);
create or replace function add_cabinet(p_franchise_code text, p_code text, p_name text, p_address text, p_lat double precision, p_lng double precision)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_fr uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('franchise', 'buyer', 'admin')) then
    raise exception 'not allowed'; end if;
  select id into v_fr from franchises where upper(code) = upper(p_franchise_code) limit 1;
  insert into cabinets(code, franchise_id, franchise_code, name, address, lat, lng)
    values (upper(p_code), v_fr, upper(coalesce(p_franchise_code, '')), coalesce(nullif(btrim(p_name), ''), upper(p_code)), p_address, p_lat, p_lng)
    returning id into v_id;
  return v_id;
end $$;

-- 5) add_franchise (แอดมินสร้างแฟรนไชส์)
create or replace function add_franchise(p_code text, p_name text, p_owner text, p_phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  insert into franchises(code, name, owner_name, phone)
    values (upper(p_code), coalesce(nullif(btrim(p_name), ''), upper(p_code)), p_owner, p_phone) returning id into v_id;
  return v_id;
end $$;

commit;

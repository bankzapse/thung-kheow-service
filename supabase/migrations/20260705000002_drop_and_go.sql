-- ============================================================
-- Migration: Drop & Go (ตู้รับซื้อ + ถุงตาข่าย + คะแนน + แลกเงิน)
-- ปลอดภัย · ไม่ลบข้อมูลเดิม · รันซ้ำได้ (idempotent)
-- ต้องรันหลัง schema.sql + 20260705000001_credit_partner_model.sql
-- ============================================================

begin;

-- 0) คะแนนสะสมของคนทิ้ง
alter table profiles add column if not exists points numeric not null default 0;

-- 1) ตาราง
create table if not exists cabinets (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,               -- รหัสตู้ เช่น AA
  name       text not null,
  lat        double precision,
  lng        double precision,
  address    text,
  status     text not null default 'active',      -- active | full | maintenance
  created_at timestamptz not null default now()
);

create table if not exists mesh_bags (
  id           uuid primary key default gen_random_uuid(),
  code         text not null,                      -- 7 หลัก
  qr           text not null,                      -- #TH-AA-0000001
  cabinet_id   uuid references cabinets(id) on delete set null,
  cabinet_code text,
  user_id      uuid not null references profiles(id) on delete cascade,
  status       text not null default 'dropped',    -- dropped | sorting | credited
  value_baht   numeric,
  points       numeric,
  note         text,
  dropped_at   timestamptz not null default now(),
  credited_at  timestamptz
);

create table if not exists bag_items (
  id             uuid primary key default gen_random_uuid(),
  bag_id         uuid not null references mesh_bags(id) on delete cascade,
  material_id    text,
  name           text,
  qty            numeric,
  price_per_unit numeric,
  subtotal       numeric
);

create table if not exists point_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  type          text not null,                     -- earn | redeem | adjust
  points        numeric not null,
  balance_after numeric not null default 0,
  note          text,
  bag_id        uuid,
  redemption_id uuid,
  created_at    timestamptz not null default now()
);

create table if not exists redemptions (
  id           uuid primary key default gen_random_uuid(),
  code         text not null,
  user_id      uuid not null references profiles(id) on delete cascade,
  amount_baht  numeric not null,
  points       numeric not null,
  method       text not null default 'promptpay',  -- promptpay | bank
  account      text,
  status       text not null default 'pending',    -- pending | paid | rejected
  requested_at timestamptz not null default now(),
  paid_at      timestamptz
);

create index if not exists mesh_bags_user_idx  on mesh_bags(user_id);
create index if not exists mesh_bags_cab_idx   on mesh_bags(cabinet_id);
create index if not exists point_tx_user_idx   on point_transactions(user_id);
create index if not exists redemptions_user_idx on redemptions(user_id);

-- 2) RLS
alter table cabinets            enable row level security;
alter table mesh_bags           enable row level security;
alter table bag_items           enable row level security;
alter table point_transactions  enable row level security;
alter table redemptions         enable row level security;

-- helper: เป็นผู้ดูแล (buyer=ผู้ดูแลตู้ / admin)
create or replace function is_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('buyer', 'admin'));
$$;

drop policy if exists "cab read" on cabinets;
create policy "cab read" on cabinets for select using (true); -- คนทิ้งต้องเห็นเพื่อตรวจรหัสตู้

drop policy if exists "bags read" on mesh_bags;
create policy "bags read" on mesh_bags for select using (auth.uid() = user_id or is_operator());

drop policy if exists "bagitems read" on bag_items;
create policy "bagitems read" on bag_items for select using (
  exists (select 1 from mesh_bags b where b.id = bag_id and (b.user_id = auth.uid() or is_operator()))
);

drop policy if exists "pts read" on point_transactions;
create policy "pts read" on point_transactions for select using (auth.uid() = user_id or is_admin());

drop policy if exists "redeem read" on redemptions;
create policy "redeem read" on redemptions for select using (auth.uid() = user_id or is_operator());

-- NB: ไม่มี policy insert/update สำหรับ client → เขียนผ่าน function (SECURITY DEFINER) เท่านั้น

-- 3) RPC
-- คนทิ้ง: หย่อนถุง (หลายใบ) เข้าตู้
create or replace function drop_bags(p_cabinet_code text, p_bag_codes text[])
returns int language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cab cabinets%rowtype; c text; n int := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_cab from cabinets where code = upper(p_cabinet_code) limit 1;
  if v_cab.id is null then raise exception 'cabinet % not found', p_cabinet_code; end if;
  foreach c in array p_bag_codes loop
    if c is null or length(btrim(c)) = 0 then continue; end if;
    insert into mesh_bags(code, qr, cabinet_id, cabinet_code, user_id, status)
    values (btrim(c), v_cab.code || '-' || btrim(c), v_cab.id, v_cab.code, v_uid, 'dropped');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ผู้ดูแล: ตีราคาถุง → ให้คะแนนคนทิ้ง (คะแนน = มูลค่า × 10)
create or replace function value_bag(p_bag_id uuid, p_items jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bag mesh_bags%rowtype; v_value numeric; v_points numeric; v_bal numeric;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  select * into v_bag from mesh_bags where id = p_bag_id for update;
  if v_bag.id is null then raise exception 'bag not found'; end if;
  if v_bag.status = 'credited' then raise exception 'bag already credited'; end if;
  select coalesce(sum((it->>'subtotal')::numeric), 0) into v_value from jsonb_array_elements(p_items) it;
  v_points := v_value * 10;
  delete from bag_items where bag_id = p_bag_id;
  insert into bag_items(bag_id, material_id, name, qty, price_per_unit, subtotal)
  select p_bag_id, it->>'material_id', it->>'name', (it->>'qty')::numeric, (it->>'price_per_unit')::numeric, (it->>'subtotal')::numeric
  from jsonb_array_elements(p_items) it;
  update mesh_bags set status = 'credited', value_baht = v_value, points = v_points, credited_at = now() where id = p_bag_id;
  update profiles set points = points + v_points where id = v_bag.user_id returning points into v_bal;
  insert into point_transactions(user_id, type, points, balance_after, note, bag_id)
    values (v_bag.user_id, 'earn', v_points, v_bal, 'ถุง ' || v_bag.qr, p_bag_id);
  return v_points;
end $$;

-- คนทิ้ง: แลกคะแนนเป็นเงิน (หักคะแนน + สร้างคำขอ pending)
create or replace function redeem_points(p_amount numeric, p_points numeric, p_method text, p_account text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_bal numeric; v_rid uuid; v_code text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_account, '') = '' then raise exception 'account required'; end if;
  select points into v_bal from profiles where id = v_uid for update;
  if v_bal < p_points then raise exception 'not enough points'; end if;
  update profiles set points = points - p_points where id = v_uid returning points into v_bal;
  v_code := 'R-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
  insert into redemptions(code, user_id, amount_baht, points, method, account, status)
    values (v_code, v_uid, p_amount, p_points, coalesce(p_method, 'promptpay'), p_account, 'pending')
    returning id into v_rid;
  insert into point_transactions(user_id, type, points, balance_after, note, redemption_id)
    values (v_uid, 'redeem', -p_points, v_bal, 'แลกเงิน ฿' || p_amount, v_rid);
  return v_rid;
end $$;

-- ผู้ดูแล: จ่ายเงิน / ปฏิเสธ (ปฏิเสธ = คืนคะแนน)
create or replace function set_redemption_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_r redemptions%rowtype; v_bal numeric;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  if p_status not in ('paid', 'rejected') then raise exception 'bad status'; end if;
  select * into v_r from redemptions where id = p_id for update;
  if v_r.id is null or v_r.status <> 'pending' then raise exception 'not a pending redemption'; end if;
  if p_status = 'paid' then
    update redemptions set status = 'paid', paid_at = now() where id = p_id;
  else
    update redemptions set status = 'rejected' where id = p_id;
    update profiles set points = points + v_r.points where id = v_r.user_id returning points into v_bal;
    insert into point_transactions(user_id, type, points, balance_after, note, redemption_id)
      values (v_r.user_id, 'adjust', v_r.points, v_bal, 'คืนคะแนน (ปฏิเสธ ' || v_r.code || ')', p_id);
  end if;
end $$;

-- ผู้ดูแล/แอดมิน: เพิ่มตู้
create or replace function add_cabinet(p_code text, p_name text, p_address text, p_lat double precision, p_lng double precision)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  insert into cabinets(code, name, address, lat, lng)
    values (upper(p_code), coalesce(nullif(btrim(p_name), ''), upper(p_code)), p_address, p_lat, p_lng)
    returning id into v_id;
  return v_id;
end $$;

commit;

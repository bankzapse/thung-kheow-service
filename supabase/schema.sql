-- ============================================================
-- Recycle Fund — Supabase schema (Phase 1: Production backend)
-- รันใน Supabase SQL Editor ครั้งเดียว (idempotent เท่าที่ทำได้)
-- ครอบคลุม: ผู้ขาย · ผู้ซื้อ/คนขับ · ร้านรับซื้อ · แอดมิน
-- ความปลอดภัย: ออกบิล/สิทธิ์/สุ่มรางวัล ทำใน function (SECURITY DEFINER) เท่านั้น
-- ============================================================

-- ---------- enums ----------
do $$ begin
  create type user_role as enum ('seller','buyer','admin','franchise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('submitted','confirmed','en_route','completed','cancelled');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  role           user_role not null default 'seller',
  name           text not null,
  phone          text,
  email          text,
  line_user_id   text,
  line_connected boolean not null default false,
  base_lat       double precision,
  base_lng       double precision,
  status         text not null default 'active',   -- active | suspended
  credit         numeric not null default 0,        -- เครดิตพาร์ทเนอร์ (ต้อง ≥ 300 ถึงรับงาน)
  partner        boolean not null default false,    -- เป็นพาร์ทเนอร์โรงงาน (ได้อัตราเลท)
  points         numeric not null default 0,        -- คะแนนสะสม Drop & Go (คนทิ้ง)
  owner          boolean not null default false,     -- เจ้าของระบบ (super admin) — สิทธิ์ทุกเมนู
  permissions    text[] not null default '{}',       -- สิทธิ์เข้าถึงเมนู (ผู้ดูแลที่บริษัทเพิ่ม)
  franchise_id   uuid,                               -- แฟรนไชส์ที่ผู้ใช้ role=franchise เป็นเจ้าของ
  payout         jsonb,                              -- บัญชีรับเงินโอน (เจ้าของแฟรนไชส์) + สถานะอนุมัติ
  address        text,                               -- ที่อยู่ / จุดสังเกต (ศูนย์คัดแยก)
  province       text,                               -- จังหวัด (ศูนย์คัดแยก)
  district       text,                               -- อำเภอ/เขต (ศูนย์คัดแยก)
  subdistrict    text,                               -- ตำบล/แขวง (ศูนย์คัดแยก)
  created_at     timestamptz not null default now()
);

-- ---------- wallet_transactions (ธุรกรรมเครดิตพาร์ทเนอร์) ----------
create table if not exists wallet_transactions (
  id             uuid primary key default gen_random_uuid(),
  buyer_id       uuid not null references profiles(id) on delete cascade,
  type           text not null,                     -- topup | commission | adjust
  amount         numeric not null,                  -- + เข้า, − ออก
  balance_after  numeric not null default 0,
  note           text,
  job_id         uuid,                              -- อ้างอิงงาน (ไม่บังคับ FK)
  created_at     timestamptz not null default now()
);
create index if not exists wallet_tx_buyer_idx on wallet_transactions(buyer_id);

-- ---------- device_tokens (Push Notification FCM/APNs) ----------
create table if not exists device_tokens (
  token      text primary key,
  user_id    uuid references profiles(id) on delete cascade,
  platform   text,                          -- ios | android
  updated_at timestamptz not null default now()
);
alter table device_tokens enable row level security;
drop policy if exists device_tokens_own on device_tokens;
create policy device_tokens_own on device_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- ราคากลาง (แอดมินแก้) ----------
create table if not exists material_prices (
  id             text primary key,
  name           text not null,
  unit           text not null,
  price_per_unit numeric not null,
  factory_price_per_unit numeric not null default 0, -- ราคาขายโรงงานของเก่า/กก. (บริษัทตั้ง)
  emoji          text,
  category       text,
  updated_at     timestamptz not null default now()
);

-- ---------- ราคารับซื้อรายคนขับ (override) ----------
create table if not exists buyer_prices (
  buyer_id    uuid not null references profiles(id) on delete cascade,
  material_id text not null,
  price       numeric not null,
  primary key (buyer_id, material_id)
);

-- ---------- ตารางรอบเข้ารับของผู้ซื้อ ----------
create table if not exists schedule_slots (
  id         uuid primary key default gen_random_uuid(),
  buyer_id   uuid not null references profiles(id) on delete cascade,
  date       date not null,
  area       text,
  capacity   int not null default 8,
  booked     int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- งานรับของ ----------
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,
  seller_id       uuid not null references profiles(id) on delete cascade,
  buyer_id        uuid references profiles(id) on delete set null,
  slot_id         uuid references schedule_slots(id) on delete set null,
  status          job_status not null default 'submitted',
  lat             double precision,
  lng             double precision,
  address         text,
  house_no        text,
  landmark        text,
  contact_name    text,
  contact_phone   text,
  scheduled_date  date,
  note            text,
  estimated_total numeric not null default 0,
  final_amount    numeric,
  created_at      timestamptz not null default now()
);

create table if not exists job_items (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null references jobs(id) on delete cascade,
  material_id    text not null,
  name           text not null,
  unit           text,
  price_per_unit numeric not null,
  qty            numeric not null
);

create table if not exists job_status_history (
  id     uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  status job_status not null,
  note   text,
  at     timestamptz not null default now()
);

-- ---------- บิลรับซื้อ (ร้าน) ----------
create table if not exists bills (
  id             uuid primary key default gen_random_uuid(),
  code           text not null,
  buyer_id       uuid not null references profiles(id) on delete cascade,
  source         text not null,                 -- app_job | walk_in
  job_id         uuid references jobs(id) on delete set null,
  seller_name    text,
  seller_phone   text,
  goods_total    numeric not null,
  fee            numeric not null,
  net_paid       numeric not null,
  payment_method text not null default 'cash',  -- cash | transfer
  status         text not null default 'paid',  -- paid | void
  created_at     timestamptz not null default now()
);

create table if not exists bill_items (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references bills(id) on delete cascade,
  material_id    text,
  name           text not null,
  unit           text,
  qty            numeric not null,
  price_per_unit numeric not null,
  subtotal       numeric not null
);

-- ---------- รายจ่ายร้าน ----------
create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  buyer_id   uuid not null references profiles(id) on delete cascade,
  category   text not null,
  amount     numeric not null,
  date       timestamptz not null default now(),
  note       text,
  created_at timestamptz not null default now()
);

-- ---------- รางวัล ----------
create table if not exists reward_tickets (
  id          uuid primary key default gen_random_uuid(),
  number      text not null,
  user_id     uuid not null references profiles(id) on delete cascade,
  month       text not null,
  from_job_id uuid references jobs(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists reward_draws (
  month          text primary key,
  prize_name     text not null default 'รางวัลประจำเดือน',
  prize_value    numeric default 0,
  winning_number text,
  winner_name    text,
  status         text not null default 'pending',
  announced_at   timestamptz
);

create index if not exists idx_jobs_seller  on jobs(seller_id);
create index if not exists idx_jobs_buyer   on jobs(buyer_id);
create index if not exists idx_jobs_status  on jobs(status);
create index if not exists idx_bills_buyer  on bills(buyer_id);
create index if not exists idx_tickets_user on reward_tickets(user_id, month);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles           enable row level security;
alter table material_prices    enable row level security;
alter table buyer_prices       enable row level security;
alter table schedule_slots     enable row level security;
alter table jobs               enable row level security;
alter table job_items          enable row level security;
alter table job_status_history enable row level security;
alter table bills              enable row level security;
alter table bill_items         enable row level security;
alter table expenses           enable row level security;
alter table reward_tickets     enable row level security;
alter table reward_draws       enable row level security;
alter table wallet_transactions enable row level security;

-- helper: เป็นแอดมินไหม
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles: อ่านได้เฉพาะผู้ล็อกอิน (บล็อก anon) · แก้ของตัวเอง · แอดมินแก้ได้หมด
drop policy if exists "profiles read" on profiles;
-- 🔒 อ่านได้เฉพาะแถวตัวเอง หรือ operator (admin/buyer) — ชื่อคนอื่นใช้ผ่าน view public_profiles
create policy "profiles read"   on profiles for select using (auth.uid() = id or is_operator());
create or replace view public_profiles as select id, name, role from profiles;
grant select on public_profiles to authenticated, anon;
create policy "profiles insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles update" on profiles for update using (auth.uid() = id or is_admin());

-- 🔒 policy ข้างบนเป็น row-level → ถ้าปล่อยไว้ ผู้ใช้แก้แถวตัวเองได้ "ทุกคอลัมน์" รวม role/owner/credit/points
-- (ยิง REST ตรงด้วย anon key ก็ตั้งตัวเองเป็น admin แล้วเสกคะแนนแลกเงินได้) → ตรึงคอลัมน์สิทธิ์/ยอดเงินด้วย trigger
-- SECURITY DEFINER function ทุกตัวรันในสิทธิ์ owner (current_user เปลี่ยน) จึงไม่โดนตรึง — ดู migration round5
-- ⚠️ ต้องเป็น SECURITY INVOKER (ห้ามใส่ security definer) ไม่งั้น current_user ในตัว trigger
-- จะเป็น owner เสมอ → เงื่อนไขไม่มีวันเป็นจริง = ไม่กันอะไรเลย
create or replace function profiles_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.role        := old.role;
    new.roles       := old.roles;
    new.owner       := old.owner;
    new.permissions := old.permissions;
    new.credit      := old.credit;
    new.points      := old.points;
    new.status      := old.status;
    new.payout      := old.payout;
    new.partner     := old.partner;
    new.franchise_id := old.franchise_id;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_trg on profiles;
create trigger profiles_guard_trg before update on profiles
  for each row execute function profiles_guard();

-- ราคากลาง + draws: อ่านสาธารณะ · เขียนเฉพาะแอดมิน
create policy "prices read"  on material_prices for select using (true);
create policy "prices admin" on material_prices for all using (is_admin()) with check (is_admin());
create policy "draws read"   on reward_draws   for select using (true);

-- buyer_prices: อ่านสาธารณะ · แก้เฉพาะเจ้าของ
create policy "bp read"  on buyer_prices for select using (true);
create policy "bp write" on buyer_prices for all using (auth.uid() = buyer_id) with check (auth.uid() = buyer_id);

-- schedule_slots
create policy "slots read"   on schedule_slots for select using (true);
create policy "slots manage" on schedule_slots for all using (auth.uid() = buyer_id) with check (auth.uid() = buyer_id);

-- jobs: เห็นถ้าเป็นเจ้าของ/ผู้รับ/งานเปิด/แอดมิน
create policy "jobs read" on jobs for select using (
  auth.uid() = seller_id or auth.uid() = buyer_id
  or (status = 'submitted' and buyer_id is null) or is_admin()
);
create policy "jobs insert" on jobs for insert with check (auth.uid() = seller_id);
create policy "jobs update" on jobs for update using (
  auth.uid() = seller_id or auth.uid() = buyer_id
  or (status = 'submitted' and buyer_id is null)
);

create policy "items read" on job_items for select using (
  exists (select 1 from jobs j where j.id = job_id and (j.seller_id = auth.uid() or j.buyer_id = auth.uid() or is_admin()))
);
create policy "items write" on job_items for all using (
  exists (select 1 from jobs j where j.id = job_id and j.seller_id = auth.uid())
) with check (
  exists (select 1 from jobs j where j.id = job_id and j.seller_id = auth.uid())
);
create policy "history read" on job_status_history for select using (
  exists (select 1 from jobs j where j.id = job_id and (j.seller_id = auth.uid() or j.buyer_id = auth.uid() or is_admin()))
);

-- bills/bill_items/expenses: เจ้าของร้าน (buyer) เห็นของตัวเอง · แอดมินเห็นหมด
create policy "bills read"   on bills      for select using (auth.uid() = buyer_id or is_admin());
create policy "items2 read"  on bill_items for select using (
  exists (select 1 from bills b where b.id = bill_id and (b.buyer_id = auth.uid() or is_admin()))
);
create policy "exp manage"   on expenses   for all using (auth.uid() = buyer_id) with check (auth.uid() = buyer_id);

-- reward_tickets: เจ้าของเห็นของตัวเอง · แอดมินเห็นหมด (INSERT ทำผ่าน function เท่านั้น)
create policy "tickets read" on reward_tickets for select using (auth.uid() = user_id or is_admin());

-- wallet_transactions: พาร์ทเนอร์เห็นของตัวเอง · แอดมินเห็นหมด (เขียนผ่าน function เท่านั้น)
create policy "wallet read" on wallet_transactions for select using (auth.uid() = buyer_id or is_admin());

-- NB: ไม่มี policy insert/update บน bills, bill_items, reward_tickets, wallet_transactions สำหรับ client
--     → เขียนได้ผ่าน function SECURITY DEFINER เท่านั้น (settle_bill / adjust_credit / topup_credit)

-- ============================================================
-- Trigger: สร้าง profile อัตโนมัติเมื่อสมัคร
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone, email, role, line_user_id, line_connected)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'ผู้ใช้ใหม่'),
    new.phone, new.email,
    'seller', -- 🔒 บังคับ seller เสมอ ห้ามยกระดับสิทธิ์ผ่าน metadata (บทบาทอื่นตั้งผ่าน service-role API)
    new.raw_user_meta_data->>'line_user_id',
    (new.raw_user_meta_data->>'line_user_id') is not null
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 🔒 Secure server-side ops (กัน fraud — client เรียกผ่าน rpc)
-- ============================================================

-- ออกบิล + ปิดงาน + mint สิทธิ์ ให้เป็น atomic + ตรวจสิทธิ์ฝั่ง server
create or replace function settle_bill(
  p_source text, p_job_id uuid, p_seller_name text, p_seller_phone text,
  p_items jsonb, p_payment text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid := auth.uid();
  v_goods numeric; v_fee numeric; v_net numeric; v_bill uuid;
  v_seller uuid; v_month text := to_char(now(),'YYYY-MM');
  v_grant int; v_used int; i int;
  v_credit numeric;
begin
  if v_buyer is null then raise exception 'not authenticated'; end if;
  -- ต้องเป็นผู้ซื้อ active + มีเครดิต ≥ 300 (ล็อกแถวกันแข่งกันหัก)
  select credit into v_credit from profiles
    where id=v_buyer and role='buyer' and status='active' for update;
  if v_credit is null then raise exception 'not an active buyer'; end if;
  if v_credit < 300 then raise exception 'insufficient credit (min 300)'; end if;

  select coalesce(sum((it->>'qty')::numeric * (it->>'price_per_unit')::numeric),0)
    into v_goods from jsonb_array_elements(p_items) it;
  v_fee := round(v_goods * 0.02);              -- ค่าคอมบริษัท 2% (หักจากเครดิต)
  v_net := v_goods;                            -- ผู้ขายได้เต็มจำนวน

  -- หักค่าคอมจากเครดิตพาร์ทเนอร์ + บันทึกธุรกรรม
  update profiles set credit = credit - v_fee where id = v_buyer
    returning credit into v_credit;
  insert into wallet_transactions(buyer_id, type, amount, balance_after, note, job_id)
    values (v_buyer, 'commission', -v_fee, v_credit, 'ค่าคอมบิล', p_job_id);

  insert into bills(code, buyer_id, source, job_id, seller_name, seller_phone,
                    goods_total, fee, net_paid, payment_method, status)
  values ('B-'||lpad((floor(random()*9000)+1000)::int::text,4,'0'), v_buyer, p_source, p_job_id,
          p_seller_name, p_seller_phone, v_goods, v_fee, v_net, coalesce(p_payment,'cash'), 'paid')
  returning id into v_bill;

  insert into bill_items(bill_id, material_id, name, unit, qty, price_per_unit, subtotal)
  select v_bill, it->>'material_id', it->>'name', it->>'unit',
         (it->>'qty')::numeric, (it->>'price_per_unit')::numeric,
         (it->>'qty')::numeric * (it->>'price_per_unit')::numeric
  from jsonb_array_elements(p_items) it;

  if p_source = 'app_job' and p_job_id is not null then
    update jobs set status='completed', final_amount=v_goods
      where id=p_job_id and buyer_id=v_buyer and status in ('confirmed','en_route')
      returning seller_id into v_seller;
    if v_seller is not null then
      insert into job_status_history(job_id,status,note)
        values (p_job_id,'completed','ออกบิล '||v_goods||' บาท');
      v_grant := least(50, floor(v_goods/100));                  -- เพดาน/บิล
      select count(*) into v_used from reward_tickets where user_id=v_seller and month=v_month;
      v_grant := greatest(0, least(v_grant, 300 - v_used));      -- เพดาน/เดือน
      for i in 1..v_grant loop
        insert into reward_tickets(number,user_id,month,from_job_id)
        values (lpad((floor(random()*900000)+100000)::int::text,6,'0'), v_seller, v_month, p_job_id);
      end loop;
    end if;
  end if;
  return v_bill;
end $$;

-- สุ่มผู้โชคดี (แอดมินเท่านั้น) — production ควรผูก seed หวยรัฐ/commit-reveal
create or replace function draw_reward_winner(p_month text)
returns void language plpgsql security definer set search_path = public as $$
declare v_num text; v_winner text;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select rt.number, p.name into v_num, v_winner
  from reward_tickets rt join profiles p on p.id = rt.user_id
  where rt.month = p_month order by random() limit 1;
  if v_num is null then raise exception 'no tickets for %', p_month; end if;
  insert into reward_draws(month, winning_number, winner_name, status, announced_at)
  values (p_month, v_num, v_winner, 'announced', now())
  on conflict (month) do update
    set winning_number=excluded.winning_number, winner_name=excluded.winner_name,
        status='announced', announced_at=now();
end $$;

-- แอดมินระงับ/เปิดบัญชี
create or replace function set_user_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('active','suspended') then raise exception 'bad status'; end if;
  update profiles set status = p_status where id = p_user;
end $$;

-- แอดมินปรับเครดิตพาร์ทเนอร์ (บวก/ลบ) + บันทึกธุรกรรม
create or replace function adjust_credit(p_user uuid, p_amount numeric, p_note text)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bal numeric;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update profiles set credit = credit + p_amount where id = p_user returning credit into v_bal;
  if v_bal is null then raise exception 'user not found'; end if;
  insert into wallet_transactions(buyer_id, type, amount, balance_after, note)
    values (p_user, 'adjust', p_amount, v_bal, coalesce(p_note,'ปรับโดยแอดมิน'));
  return v_bal;
end $$;

-- พาร์ทเนอร์เติมเครดิต (production: เรียกจาก webhook ยืนยันการโอนเท่านั้น)
create or replace function topup_credit(p_user uuid, p_amount numeric, p_note text)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bal numeric;
begin
  if not is_admin() then raise exception 'admin/service only'; end if;   -- ยืนยันการโอนฝั่ง server
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  update profiles set credit = credit + p_amount where id = p_user returning credit into v_bal;
  if v_bal is null then raise exception 'user not found'; end if;
  insert into wallet_transactions(buyer_id, type, amount, balance_after, note)
    values (p_user, 'topup', p_amount, v_bal, coalesce(p_note,'เติมเครดิต'));
  return v_bal;
end $$;

-- ============================================================
-- Seed: ราคากลางเริ่มต้น
-- ============================================================
insert into material_prices (id,name,unit,price_per_unit,emoji,category) values
  ('cardboard','ลังกระดาษ','กก.',4,'📦','กระดาษ'),
  ('paper-white','กระดาษขาว-ดำ','กก.',7,'📄','กระดาษ'),
  ('newspaper','หนังสือพิมพ์','กก.',5,'📰','กระดาษ'),
  ('glass-bottle','ขวดแก้วรวม','กก.',1,'🍶','แก้ว'),
  ('beer-crate','ลังเบียร์','ใบ',45,'🍺','แก้ว'),
  ('steel','เหล็กรวม','กก.',8,'⚙️','โลหะ'),
  ('aluminum-can','กระป๋องอลูมิเนียม','กก.',42,'🥫','โลหะ'),
  ('copper','ทองแดง','กก.',230,'🟤','โลหะ'),
  ('brass','ทองเหลือง','กก.',110,'🟡','โลหะ'),
  ('pet','ขวดพลาสติกใส (PET)','กก.',10,'🧴','พลาสติก'),
  ('plastic-mixed','พลาสติกรวม','กก.',4,'♻️','พลาสติก')
on conflict (id) do nothing;

-- ============================================================
-- Drop & Go: ตู้รับซื้อ + ถุงตาข่าย + คะแนน + แลกเงิน
-- (ดู migration 20260705000002_drop_and_go.sql สำหรับ existing DB)
-- ============================================================
create table if not exists franchises (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, name text not null,
  owner_name text, phone text, created_at timestamptz not null default now()
);
create table if not exists cabinets (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  franchise_id uuid references franchises(id) on delete set null, franchise_code text,
  name text not null,
  lat double precision, lng double precision, address text,
  province text, district text, subdistrict text,   -- พื้นที่ตู้
  status text not null default 'active', created_at timestamptz not null default now()
);
create unique index if not exists cabinets_fr_code_uidx on cabinets(franchise_code, code);
create table if not exists mesh_bags (
  id uuid primary key default gen_random_uuid(),
  code text not null, qr text not null,
  cabinet_id uuid references cabinets(id) on delete set null, cabinet_code text,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'dropped', value_baht numeric, points numeric, note text,
  dropped_at timestamptz not null default now(), credited_at timestamptz
);
create table if not exists bag_items (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references mesh_bags(id) on delete cascade,
  material_id text, name text, qty numeric, price_per_unit numeric, subtotal numeric
);
create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null, points numeric not null, balance_after numeric not null default 0,
  note text, bag_id uuid, redemption_id uuid, created_at timestamptz not null default now()
);
create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null, user_id uuid not null references profiles(id) on delete cascade,
  amount_baht numeric not null, points numeric not null,
  method text not null default 'promptpay', account text,
  status text not null default 'pending', requested_at timestamptz not null default now(), paid_at timestamptz
);
create index if not exists mesh_bags_user_idx  on mesh_bags(user_id);
create index if not exists mesh_bags_cab_idx   on mesh_bags(cabinet_id);
create index if not exists point_tx_user_idx   on point_transactions(user_id);
create index if not exists redemptions_user_idx on redemptions(user_id);

alter table franchises         enable row level security;
alter table cabinets           enable row level security;
alter table mesh_bags          enable row level security;
alter table bag_items          enable row level security;
alter table point_transactions enable row level security;
alter table redemptions        enable row level security;
drop policy if exists "fr read" on franchises;
create policy "fr read" on franchises for select using (true);

create or replace function is_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('buyer', 'admin'));
$$;

-- แฟรนไชส์อ่านถุงในตู้ของตัวเองได้ (แดชบอร์ด "ถุงรอคัดแยก")
create or replace function owns_cabinet(p_cabinet uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cabinets c join profiles p on p.id = auth.uid()
    where c.id = p_cabinet and p.role = 'franchise' and c.franchise_id = p.franchise_id
  );
$$;

drop policy if exists "cab read" on cabinets;
create policy "cab read" on cabinets for select using (true);
drop policy if exists "bags read" on mesh_bags;
create policy "bags read" on mesh_bags for select using (auth.uid() = user_id or is_operator() or owns_cabinet(cabinet_id));
drop policy if exists "bagitems read" on bag_items;
create policy "bagitems read" on bag_items for select using (
  exists (select 1 from mesh_bags b where b.id = bag_id and (b.user_id = auth.uid() or is_operator() or owns_cabinet(b.cabinet_id))));
drop policy if exists "pts read" on point_transactions;
create policy "pts read" on point_transactions for select using (auth.uid() = user_id or is_admin());
drop policy if exists "redeem read" on redemptions;
create policy "redeem read" on redemptions for select using (auth.uid() = user_id or is_operator());

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

create or replace function value_bag(p_bag_id uuid, p_items jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bag mesh_bags%rowtype; v_value numeric; v_points numeric; v_bal numeric;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  select * into v_bag from mesh_bags where id = p_bag_id for update;
  if v_bag.id is null then raise exception 'bag not found'; end if;
  if v_bag.user_id = auth.uid() then raise exception 'cannot value your own bag'; end if; -- 🔒 กัน operator ปั๊มคะแนนให้ตัวเอง
  if v_bag.status = 'credited' then raise exception 'bag already credited'; end if;
  select coalesce(sum((it->>'subtotal')::numeric), 0) into v_value from jsonb_array_elements(p_items) it;
  v_points := v_value * 1; -- POINTS_PER_BAHT = 1 (1 คะแนน = ฿1) ให้ตรงกับฝั่งแอป
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

create sequence if not exists redemption_code_seq; -- รหัส redemption ไม่ชนกัน
create or replace function redeem_points(p_amount numeric, p_points numeric, p_method text, p_account text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_bal numeric; v_rid uuid; v_code text; v_amount numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_account, '') = '' then raise exception 'account required'; end if;
  if p_points is null or p_points <= 0 then raise exception 'invalid points'; end if;
  v_amount := p_points; -- 🔒 1 คะแนน = ฿1 เสมอ (คิดฝั่ง server ไม่เชื่อ p_amount)
  select points into v_bal from profiles where id = v_uid for update;
  if v_bal < p_points then raise exception 'not enough points'; end if;
  update profiles set points = points - p_points where id = v_uid returning points into v_bal;
  v_code := 'R' || lpad(nextval('redemption_code_seq')::text, 6, '0'); -- 🔒 unique (เดิมสุ่ม 4 หลักชนได้)
  insert into redemptions(code, user_id, amount_baht, points, method, account, status)
    values (v_code, v_uid, v_amount, p_points, coalesce(p_method, 'promptpay'), p_account, 'pending') returning id into v_rid;
  insert into point_transactions(user_id, type, points, balance_after, note, redemption_id)
    values (v_uid, 'redeem', -p_points, v_bal, 'แลกเงิน ฿' || v_amount, v_rid);
  return v_rid;
end $$;

create or replace function set_redemption_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_r redemptions%rowtype; v_bal numeric;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  if p_status not in ('paid', 'rejected') then raise exception 'bad status'; end if;
  select * into v_r from redemptions where id = p_id for update;
  if v_r.id is null or v_r.status <> 'pending' then raise exception 'not a pending redemption'; end if;
  if v_r.user_id = auth.uid() then raise exception 'cannot review your own redemption'; end if; -- 🔒 กันอนุมัติจ่ายเงินให้ตัวเอง
  if p_status = 'paid' then
    update redemptions set status = 'paid', paid_at = now() where id = p_id;
  else
    update redemptions set status = 'rejected' where id = p_id;
    update profiles set points = points + v_r.points where id = v_r.user_id returning points into v_bal;
    insert into point_transactions(user_id, type, points, balance_after, note, redemption_id)
      values (v_r.user_id, 'adjust', v_r.points, v_bal, 'คืนคะแนน (ปฏิเสธ ' || v_r.code || ')', p_id);
  end if;
end $$;

create or replace function add_cabinet(p_franchise_code text, p_code text, p_name text, p_address text, p_lat double precision, p_lng double precision)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_fr uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('franchise', 'buyer', 'admin')) then
    raise exception 'not allowed'; end if;
  select id into v_fr from franchises where upper(code) = upper(p_franchise_code) limit 1;
  insert into cabinets(code, franchise_id, franchise_code, name, address, lat, lng)
    values (upper(p_code), v_fr, upper(coalesce(p_franchise_code, '')), coalesce(nullif(btrim(p_name), ''), upper(p_code)), p_address, p_lat, p_lng) returning id into v_id;
  return v_id;
end $$;

create or replace function add_franchise(p_code text, p_name text, p_owner text, p_phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  insert into franchises(code, name, owner_name, phone)
    values (upper(p_code), coalesce(nullif(btrim(p_name), ''), upper(p_code)), p_owner, p_phone) returning id into v_id;
  return v_id;
end $$;

-- ============================================================
-- Franchise payout (บัญชีรับเงิน + อนุมัติ + โอนส่วนแบ่ง)
-- ============================================================
create table if not exists franchise_payouts (
  id            uuid primary key default gen_random_uuid(),
  franchise_id  uuid references franchises(id) on delete set null,
  franchise_name text,
  amount        numeric not null,
  note          text,
  paid_at       timestamptz not null default now()
);
alter table franchise_payouts enable row level security;
drop policy if exists fp_admin on franchise_payouts;
create policy fp_admin on franchise_payouts for all using (is_admin()) with check (is_admin());
drop policy if exists fp_read on franchise_payouts;
create policy fp_read on franchise_payouts for select using (
  is_admin() or exists (select 1 from profiles where id = auth.uid() and role = 'franchise' and franchise_id = franchise_payouts.franchise_id)
);

create or replace function submit_payout(p_payout jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update profiles set payout = coalesce(p_payout, '{}'::jsonb) || jsonb_build_object('status','pending','submittedAt', now()) where id = auth.uid();
end $$;

create or replace function review_payout(p_user uuid, p_approve boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update profiles set payout = coalesce(payout,'{}'::jsonb) || jsonb_build_object('status', case when p_approve then 'approved' else 'rejected' end, 'note', case when p_approve then null else coalesce(nullif(btrim(p_note),''),'ข้อมูลไม่ถูกต้อง') end, 'reviewedAt', now()) where id = p_user and payout is not null;
end $$;

create or replace function pay_franchise(p_franchise_id uuid, p_amount numeric, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text; v_status text;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if not (p_amount > 0) then raise exception 'amount must be > 0'; end if;
  select name into v_name from franchises where id = p_franchise_id;
  if v_name is null then raise exception 'franchise not found'; end if;
  select payout->>'status' into v_status from profiles where role = 'franchise' and franchise_id = p_franchise_id limit 1;
  if v_status is distinct from 'approved' then raise exception 'franchise payout not approved'; end if;
  insert into franchise_payouts(franchise_id, franchise_name, amount, note) values (p_franchise_id, v_name, p_amount, nullif(btrim(p_note),'')) returning id into v_id;
  return v_id;
end $$;

-- ขายวัสดุคัดแยกให้โรงงานของเก่า → ส่วนต่างเป็นกำไรบริษัท (ชั้นที่ 3)
create table if not exists factory_sales (
  id           uuid primary key default gen_random_uuid(),
  sold_by      uuid references profiles(id) on delete set null,
  factory_name text,
  note         text,
  items        jsonb not null default '[]'::jsonb,
  revenue      numeric not null default 0,
  cost         numeric not null default 0,
  profit       numeric not null default 0,
  sold_at      timestamptz not null default now()
);
alter table factory_sales enable row level security;
drop policy if exists fs_ops on factory_sales;
create policy fs_ops on factory_sales for all using (is_operator()) with check (is_operator());

create or replace function record_factory_sale(p_items jsonb, p_factory_name text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_rev numeric; v_cost numeric;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'no items'; end if;
  select
    coalesce(sum((it->>'qtyKg')::numeric * (it->>'factoryPrice')::numeric), 0),
    coalesce(sum((it->>'qtyKg')::numeric * (it->>'sellerPrice')::numeric), 0)
    into v_rev, v_cost
  from jsonb_array_elements(p_items) it;
  insert into factory_sales(sold_by, factory_name, note, items, revenue, cost, profit)
    values (auth.uid(), nullif(btrim(p_factory_name), ''), nullif(btrim(p_note), ''), p_items, v_rev, v_cost, v_rev - v_cost)
    returning id into v_id;
  return v_id;
end $$;

create or replace function set_factory_price(p_material_id text, p_price numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update material_prices set factory_price_per_unit = greatest(0, coalesce(p_price, 0)) where id = p_material_id;
end $$;

-- คุมจำนวนครั้งรีเซ็ตรหัสผ่าน (กัน brute-force OTP) — เข้าถึงผ่าน service-role เท่านั้น
create table if not exists otp_throttle (
  phone        text primary key,
  fails        int not null default 0,
  locked_until timestamptz,
  last_send    timestamptz,     -- ส่ง OTP ครั้งล่าสุด (คุม cooldown)
  sends_day    date,            -- วันของ sends_count (รีเซ็ตต่อวัน)
  sends_count  int not null default 0, -- จำนวนส่งวันนี้ (คุมโควตา/วัน)
  updated_at   timestamptz not null default now()
);
alter table otp_throttle enable row level security;

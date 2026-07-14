-- ============================================================
-- Security hardening — Round 1 (Critical) — idempotent
-- C1 signup role trust · C3 redeem amount · H1 self-dealing · H2 PII leak · C2 throttle table
-- ============================================================

-- C1: signup trigger ต้องไม่เชื่อ role ที่ client ส่งมา — บังคับ 'seller' เสมอ
-- (บัญชี franchise/buyer/admin สร้างผ่าน service-role API ที่ update role ทีหลังอยู่แล้ว)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone, email, role, line_user_id, line_connected)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'ผู้ใช้ใหม่'),
    new.phone, new.email,
    'seller', -- 🔒 บังคับ seller เสมอ ห้ามยกระดับสิทธิ์ผ่าน metadata
    new.raw_user_meta_data->>'line_user_id',
    (new.raw_user_meta_data->>'line_user_id') is not null
  ) on conflict (id) do nothing;
  return new;
end $$;

-- C3: แลกเงินต้องผูก 1 คะแนน = ฿1 — คิด amount จาก points ฝั่ง server (ไม่เชื่อ p_amount)
create or replace function redeem_points(p_amount numeric, p_points numeric, p_method text, p_account text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_bal numeric; v_rid uuid; v_code text; v_amount numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_account, '') = '' then raise exception 'account required'; end if;
  if p_points is null or p_points <= 0 then raise exception 'invalid points'; end if;
  v_amount := p_points; -- 🔒 1 คะแนน = ฿1 เสมอ (กันถอนเงินเกินคะแนน)
  select points into v_bal from profiles where id = v_uid for update;
  if v_bal < p_points then raise exception 'not enough points'; end if;
  update profiles set points = points - p_points where id = v_uid returning points into v_bal;
  v_code := 'R-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
  insert into redemptions(code, user_id, amount_baht, points, method, account, status)
    values (v_code, v_uid, v_amount, p_points, coalesce(p_method, 'promptpay'), p_account, 'pending') returning id into v_rid;
  insert into point_transactions(user_id, type, points, balance_after, note, redemption_id)
    values (v_uid, 'redeem', -p_points, v_bal, 'แลกเงิน ฿' || v_amount, v_rid);
  return v_rid;
end $$;

-- H1a: operator ตีราคาถุงของตัวเองไม่ได้ (กัน center ปั๊มคะแนนเข้าบัญชีตัวเอง)
create or replace function value_bag(p_bag_id uuid, p_items jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bag mesh_bags%rowtype; v_value numeric; v_points numeric; v_bal numeric;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  select * into v_bag from mesh_bags where id = p_bag_id for update;
  if v_bag.id is null then raise exception 'bag not found'; end if;
  if v_bag.user_id = auth.uid() then raise exception 'cannot value your own bag'; end if; -- 🔒
  if v_bag.status = 'credited' then raise exception 'bag already credited'; end if;
  select coalesce(sum((it->>'subtotal')::numeric), 0) into v_value from jsonb_array_elements(p_items) it;
  v_points := v_value * 1;
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

-- H1b: operator อนุมัติ/ปฏิเสธคำขอแลกเงินของตัวเองไม่ได้
create or replace function set_redemption_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_r redemptions%rowtype; v_bal numeric;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  if p_status not in ('paid', 'rejected') then raise exception 'bad status'; end if;
  select * into v_r from redemptions where id = p_id for update;
  if v_r.id is null or v_r.status <> 'pending' then raise exception 'not a pending redemption'; end if;
  if v_r.user_id = auth.uid() then raise exception 'cannot review your own redemption'; end if; -- 🔒
  if p_status = 'paid' then
    update redemptions set status = 'paid', paid_at = now() where id = p_id;
  else
    update redemptions set status = 'rejected' where id = p_id;
    update profiles set points = points + v_r.points where id = v_r.user_id returning points into v_bal;
    insert into point_transactions(user_id, type, points, balance_after, note, redemption_id)
      values (v_r.user_id, 'adjust', v_r.points, v_bal, 'คืนคะแนน (ปฏิเสธ ' || v_r.code || ')', p_id);
  end if;
end $$;

-- H2: ปิดช่องรั่ว PII — จำกัดการอ่าน profiles ให้เหลือ "แถวตัวเอง หรือ operator (admin/buyer)"
--     ชื่อผู้ใช้ (ที่แอปต้องใช้แสดงชื่อคนทิ้ง) เปิดผ่าน view public_profiles ที่มีแค่ id/name/role
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select using (auth.uid() = id or is_operator());

create or replace view public_profiles as select id, name, role from profiles;
grant select on public_profiles to authenticated, anon;

-- C2: ตารางคุมจำนวนครั้งรีเซ็ตรหัสผ่าน (กัน brute-force OTP) — เข้าถึงผ่าน service-role เท่านั้น
create table if not exists otp_throttle (
  phone        text primary key,
  fails        int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
alter table otp_throttle enable row level security; -- ไม่มี policy = เฉพาะ service_role

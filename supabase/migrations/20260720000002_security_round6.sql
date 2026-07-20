-- Round 6: ปิดการเสกคะแนนผ่าน value_bag + หยุดให้พาร์ทเนอร์อ่าน PII/เลขบัญชีของทุกคน
--
-- หมายเหตุ: ไม่แตะ is_operator() เพราะศูนย์คัดแยก (buyer) ต้องใช้จริงกับงานถุง
-- (bags read / bag_items / value_bag / factory_sales) แก้เฉพาะ policy ที่รั่วข้อมูล

-- ── 1) value_bag: คิดราคาฝั่ง server ────────────────────────────────
-- เดิม: select sum((it->>'subtotal')::numeric) — เชื่อค่าที่ client ส่งมาทั้งดุ้น
-- ศูนย์คัดแยกยิง RPC ตรงแล้วใส่ subtotal เท่าไหร่ก็ได้ → คะแนนเข้าบัญชีผู้ขาย
-- แล้ว redeem_points แลกเป็นเงินโอนจริง 1 คะแนน = ฿1 (เพดานไม่จำกัด)
-- ใหม่: คิดจาก material_prices ในฐานข้อมูล ใช้จาก client แค่ material_id กับ qty
create or replace function value_bag(p_bag_id uuid, p_items jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_bag mesh_bags%rowtype;
  v_value numeric; v_points numeric; v_bal numeric;
  v_n int; v_matched int;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  select * into v_bag from mesh_bags where id = p_bag_id for update;
  if v_bag.id is null then raise exception 'bag not found'; end if;
  if v_bag.user_id = auth.uid() then raise exception 'cannot value your own bag'; end if; -- 🔒
  if v_bag.status = 'credited' then raise exception 'bag already credited'; end if;

  -- ทุกรายการต้องอ้าง material ที่มีจริง (join ตกจะทำให้ยอดหายเงียบ ๆ)
  select count(*) into v_n from jsonb_array_elements(p_items);
  select count(*) into v_matched
    from jsonb_array_elements(p_items) it
    join material_prices mp on mp.id = it->>'material_id';
  if v_n = 0 then raise exception 'no items'; end if;
  if v_n <> v_matched then raise exception 'unknown material in items'; end if;

  if exists (select 1 from jsonb_array_elements(p_items) it
             where coalesce((it->>'qty')::numeric, 0) <= 0) then
    raise exception 'invalid qty';
  end if;

  -- 🔒 ราคามาจากตารางเท่านั้น (ปัดต่อรายการให้ตรงกับที่ UI แสดง)
  select coalesce(sum(round((it->>'qty')::numeric * mp.price_per_unit)), 0) into v_value
    from jsonb_array_elements(p_items) it
    join material_prices mp on mp.id = it->>'material_id';

  -- กันพิมพ์ผิด/ทุจริต: ถุงตาข่ายใบเดียวไม่ควรเกินนี้ (อะลูมิเนียม ฿45/กก. = ~111 กก.)
  -- ถ้าธุรกิจโตจนชนเพดาน ปรับตัวเลขนี้ได้
  if v_value > 5000 then
    raise exception 'bag value % exceeds limit — needs admin review', v_value;
  end if;

  v_points := v_value * 1;

  delete from bag_items where bag_id = p_bag_id;
  insert into bag_items(bag_id, material_id, name, qty, price_per_unit, subtotal)
  select p_bag_id, mp.id, mp.name, (it->>'qty')::numeric, mp.price_per_unit,
         round((it->>'qty')::numeric * mp.price_per_unit)
    from jsonb_array_elements(p_items) it
    join material_prices mp on mp.id = it->>'material_id';

  update mesh_bags set status = 'credited', value_baht = v_value, points = v_points, credited_at = now() where id = p_bag_id;
  update profiles set points = points + v_points where id = v_bag.user_id returning points into v_bal;
  insert into point_transactions(user_id, type, points, balance_after, note, bag_id)
    values (v_bag.user_id, 'earn', v_points, v_bal, 'ถุง ' || v_bag.qr, p_bag_id);
  return v_points;
end $$;

-- ── 2) profiles: พาร์ทเนอร์ไม่ควรอ่านข้อมูลคนอื่นทั้งแถว ────────────
-- เดิม is_operator() = role in ('buyer','admin') → ศูนย์คัดแยกซึ่งเป็นพาร์ทเนอร์
-- ภายนอก อ่าน profiles ได้ทุกแถวทุกคอลัมน์ รวม phone/email/address/credit และ
-- payout (เลขบัญชีธนาคาร + รูปสำเนาหน้าบุ๊คแบงก์) — ขัดกับที่ประกาศไว้ใน
-- นโยบายความเป็นส่วนตัวว่าพาร์ทเนอร์ "ไม่รวมข้อมูลบัญชีรับเงิน"
-- ชื่อผู้ใช้คนอื่นยังอ่านได้ผ่าน view public_profiles (id, name, role) ตามเดิม
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select using (auth.uid() = id or is_admin());

-- ── 3) redemptions: มีเลขพร้อมเพย์/บัญชีปลายทาง ─────────────────────
-- อนุมัติ/ปฏิเสธคำขอแลกเงินทำที่หน้า admin/payments เท่านั้น → รัดเป็น admin
drop policy if exists "redeem read" on redemptions;
create policy "redeem read" on redemptions for select using (auth.uid() = user_id or is_admin());

create or replace function set_redemption_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_r redemptions%rowtype; v_bal numeric;
begin
  if not is_admin() then raise exception 'admin only'; end if; -- 🔒 เดิม is_operator()
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

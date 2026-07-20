-- Round 5 (Critical): ปิดช่องให้ผู้ใช้ยกระดับสิทธิ์ตัวเองผ่านตาราง profiles โดยตรง
--
-- ปัญหา: policy "profiles update" เป็น using (auth.uid() = id or is_admin()) ซึ่งเป็น row-level
-- ไม่ใช่ column-level → ผู้ใช้ที่ล็อกอินแล้วยิง REST ตรง ๆ ด้วย anon key แก้แถวตัวเองได้ทุกคอลัมน์
--   supabase.from('profiles').update({ role:'admin', owner:true, points:1000000 }).eq('id', myId)
-- แถวใหม่ยังผ่าน using เดิม (auth.uid() = id) → Postgres อนุญาต แล้วเรียก redeem_points
-- แลกเป็นเงินโอนจริงได้ทันที
--
-- วิธีแก้: BEFORE UPDATE trigger ตรึงคอลัมน์สิทธิ์/ยอดเงินไว้เมื่อคำสั่งมาจาก client
-- (current_user = authenticated/anon) ส่วน SECURITY DEFINER function ทุกตัว
-- (settle_bill, adjust_credit, topup_credit, value_bag, redeem_points, set_redemption_status,
--  submit_payout, review_payout, set_user_status, set_active_role, grant_roles)
-- รันในสิทธิ์เจ้าของฟังก์ชัน → current_user เปลี่ยนเป็น owner จึงไม่โดนตรึง ทำงานได้ตามเดิม
-- service_role (API ฝั่ง server ที่เชื่อถือได้) ก็ไม่โดนตรึงเช่นกัน

-- ⚠️ ต้องเป็น SECURITY INVOKER (ค่าเริ่มต้น) ห้ามใส่ security definer
-- ถ้าเป็น definer → current_user ในตัว trigger จะกลายเป็น owner ของฟังก์ชันเสมอ
-- เงื่อนไขข้างล่างจะไม่มีวันเป็นจริง = trigger ไม่กันอะไรเลย
create or replace function profiles_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- ตรึงเฉพาะเมื่อ update มาจาก client โดยตรง (PostgREST → role authenticated/anon)
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
create trigger profiles_guard_trg
  before update on profiles
  for each row execute function profiles_guard();

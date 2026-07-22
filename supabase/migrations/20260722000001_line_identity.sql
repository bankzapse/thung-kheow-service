-- เตรียมระบบให้ผูกบัญชี LINE ได้อย่างปลอดภัย (ก่อนเปิด LIFF ให้ผู้ขาย)
--
-- ปัญหาเดิม 3 อย่าง:
--  1) line_user_id ไม่ได้อยู่ใน profiles_guard (round 5) → client แก้เองได้
--     ตั้งเป็น LINE ID ของคนอื่นได้ → กวนการล็อกอินของเจ้าของตัวจริง
--  2) ไม่มี unique constraint → LINE บัญชีเดียวผูกได้หลาย profile
--     /api/line/liff-login ใช้ .maybeSingle() ซึ่งจะ error ถ้าเจอหลายแถว = ล็อกอินไม่ได้เลย
--  3) repo.connectLine เขียนค่าปลอม "U" + สุ่ม 8 ตัว ลง line_user_id (ปุ่ม "เชื่อมบัญชี LINE"
--     ในหน้า home/income) → ค่าขยะเหล่านี้จะไปกิน unique index และบล็อกการผูกจริง

-- ── 1) ล้างค่าปลอมที่เกิดจาก connectLine เดิม ─────────────────────
-- LINE userId จริงคือ 'U' + hex 32 ตัว · ของปลอมเป็น 'U' + สุ่ม 8 ตัว
update profiles
   set line_user_id = null,
       line_connected = false
 where line_user_id is not null
   and line_user_id !~ '^U[0-9a-f]{32}$';

-- ── 2) LINE หนึ่งบัญชี = ผู้ใช้เดียว (null ซ้ำได้ตามปกติของ Postgres) ──
create unique index if not exists profiles_line_user_id_key
  on profiles (line_user_id)
  where line_user_id is not null;

-- ── 3) ตรึง line_user_id ไม่ให้ client เขียนเอง ────────────────────
-- ต้องผูกผ่าน /api/line/link (ตรวจ access token กับ LINE ก่อน) เท่านั้น
-- ⚠️ SECURITY INVOKER เหมือน round 5 — ห้ามใส่ security definer
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
    new.line_user_id := old.line_user_id;   -- ใหม่
    new.line_connected := old.line_connected; -- ใหม่
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on profiles;
create trigger profiles_guard_trg
  before update on profiles
  for each row execute function profiles_guard();

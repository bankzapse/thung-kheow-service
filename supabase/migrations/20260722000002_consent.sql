-- บันทึกคำยินยอม PDPA ลงฐานข้อมูล
--
-- เดิม checkbox "ยอมรับข้อกำหนด + ยินยอมให้เก็บข้อมูล" ที่หน้า /register เป็น React state
-- ล้วน ไม่เคยถูกส่งมาที่ server และไม่มีคอลัมน์เก็บ → พิสูจน์ไม่ได้ว่าผู้ใช้ยินยอมจริง
-- (PDPA ม.19 ผู้ควบคุมข้อมูลต้องพิสูจน์ได้ว่าได้รับความยินยอม)
-- ส่วนทางเข้าผ่าน LINE ยิ่งหนัก — ไม่เคยแสดงนโยบายให้เห็นเลย

alter table profiles add column if not exists consent_at        timestamptz;
alter table profiles add column if not exists consent_version   text;
alter table profiles add column if not exists consent_source    text; -- 'register' | 'line'

comment on column profiles.consent_at      is 'เวลาที่ผู้ใช้กดยอมรับข้อกำหนด+นโยบายความเป็นส่วนตัว';
comment on column profiles.consent_version is 'เวอร์ชันนโยบายที่ยอมรับ (ดู src/lib/consent.ts) — นโยบายเปลี่ยนต้องขอใหม่';
comment on column profiles.consent_source  is 'ยินยอมผ่านช่องทางไหน: register (เบอร์+รหัสผ่าน) หรือ line (LIFF)';

-- ตรึงไม่ให้ client แก้เอง — ต้องเขียนผ่าน API ที่บันทึกตอนสมัครเท่านั้น
-- ⚠️ SECURITY INVOKER (ห้ามใส่ security definer — ดูเหตุผลใน round 5)
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
    new.line_user_id := old.line_user_id;
    new.line_connected := old.line_connected;
    new.consent_at      := old.consent_at;      -- ใหม่
    new.consent_version := old.consent_version; -- ใหม่
    new.consent_source  := old.consent_source;  -- ใหม่
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on profiles;
create trigger profiles_guard_trg
  before update on profiles
  for each row execute function profiles_guard();

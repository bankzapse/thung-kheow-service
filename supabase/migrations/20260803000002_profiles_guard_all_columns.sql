-- 🔒 แก้ regression ของ profiles_guard
-- migration 20260727000001 (phone_verified) recreate profiles_guard ใหม่ โดยลืมใส่ 5 คอลัมน์
-- ที่ 20260722000002 (consent) เคยตรึงไว้ (line_user_id, line_connected, consent_at,
-- consent_version, consent_source) → เพราะ create or replace ทับทั้งฟังก์ชัน คอลัมน์พวกนี้
-- จึง "ไม่ถูกตรึง" อีก = ผู้ใช้แก้ line link/consent ของตัวเองผ่าน PostgREST ได้
--
-- migration นี้รวมทุกคอลัมน์ที่ต้องตรึง (union ของ round5 + consent + phone_verified = 17 คอลัมน์)
-- idempotent — รันซ้ำได้

create or replace function profiles_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.role           := old.role;
    new.roles          := old.roles;
    new.owner          := old.owner;
    new.permissions    := old.permissions;
    new.credit         := old.credit;
    new.points         := old.points;
    new.status         := old.status;
    new.payout         := old.payout;
    new.partner        := old.partner;
    new.franchise_id   := old.franchise_id;
    new.line_user_id   := old.line_user_id;
    new.line_connected := old.line_connected;
    new.consent_at     := old.consent_at;
    new.consent_version := old.consent_version;
    new.consent_source := old.consent_source;
    new.phone          := old.phone;
    new.phone_verified := old.phone_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on profiles;
create trigger profiles_guard_trg before update on profiles
  for each row execute function profiles_guard();

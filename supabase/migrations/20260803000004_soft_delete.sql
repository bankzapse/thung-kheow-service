-- ═══════════════════════════════════════════════════════════════════════
-- Soft-delete บัญชี — เปลี่ยนจาก "ลบถาวรทันที" เป็น "ปิดใช้งาน + เก็บไว้ช่วง grace"
--   · ผู้ใช้กดลบ → set deleted_at + ban (ล็อกอินไม่ได้) แต่ข้อมูลยังอยู่ (กู้คืนได้)
--   · ลบถาวรจริงทำทีหลัง (endpoint /api/account/purge หลังพ้น grace)
--   idempotent — รันซ้ำได้
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists deleted_at timestamptz;

-- ตรึง deleted_at เพิ่มใน profiles_guard (client แก้/เคลียร์เองไม่ได้ — เฉพาะ service-role)
-- (คง union 17 คอลัมน์เดิมไว้ครบ + เพิ่ม deleted_at เป็นตัวที่ 18)
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
    new.deleted_at     := old.deleted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on profiles;
create trigger profiles_guard_trg before update on profiles
  for each row execute function profiles_guard();

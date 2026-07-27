-- เบอร์ยืนยันแล้วหรือยัง (flow: verify เบอร์ก่อนถอนเงินครั้งแรก)
-- ค่าเริ่มต้น false → บัญชีเดิมถือว่ายังไม่ยืนยันจนกว่าจะ verify (ปลอดภัยไว้ก่อน)
-- idempotent

alter table profiles add column if not exists phone_verified boolean not null default false;

-- freeze phone + phone_verified จาก client (PostgREST) → แก้ได้เฉพาะฝั่ง server (service-role/RPC)
-- กันผู้ใช้ตั้ง phone_verified=true เอง หรือเปลี่ยนเบอร์ตรง ๆ โดยไม่ผ่านตัวเช็คซ้ำ/ซิงค์ auth
create or replace function profiles_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.role          := old.role;
    new.roles         := old.roles;
    new.owner         := old.owner;
    new.permissions   := old.permissions;
    new.credit        := old.credit;
    new.points        := old.points;
    new.status        := old.status;
    new.payout        := old.payout;
    new.partner       := old.partner;
    new.franchise_id  := old.franchise_id;
    new.phone         := old.phone;
    new.phone_verified := old.phone_verified;
  end if;
  return new;
end;
$$;

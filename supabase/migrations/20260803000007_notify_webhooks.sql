-- ═══════════════════════════════════════════════════════════════════════
-- Database Webhooks (ทำเอง ผ่าน pg_net) → ยิงแจ้งเตือนไป /api/push/hook
--   เมื่อมี event สำคัญ: โอนเงิน/ปฏิเสธถอน · อนุมัติ/ปฏิเสธบัญชี · ได้แต้ม(ตีราคา)
--   endpoint จะส่งต่อเป็น device push + LINE OA
--
-- 🔐 secret อ่านจาก DB setting `app.push_hook_secret` (ไม่ฝังในไฟล์นี้ · ไม่ขึ้น git)
--    ต้อง "ตั้งค่าครั้งเดียว" แยกต่างหาก (ค่าเดียวกับ PUSH_HOOK_SECRET ใน Vercel):
--
--      alter database postgres set app.push_hook_secret = '<ค่าลับเดียวกับ Vercel>';
--      -- (ออปชัน) ปรับ URL ต่อ environment:  set app.hook_url = 'https://<domain>/api/push/hook';
--
-- ⚠️ ลำดับสำคัญบน prod: ตั้ง setting ข้างบน "ก่อน" รัน migration นี้
--    ไม่งั้น secret = null → ฟังก์ชันจะข้ามการยิง (แจ้งเตือนเงียบ) จนกว่าจะตั้ง
--    หมายเหตุ: setting มีผลกับ session ใหม่ — connection เดิมใน pool จะได้ค่าหลังหมุนรอบ
--
-- idempotent — รันซ้ำได้
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;

create or replace function public.notify_app_hook()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  secret text := current_setting('app.push_hook_secret', true);
  hook_url text := coalesce(current_setting('app.hook_url', true), 'https://thung-kheow.com/api/push/hook');
begin
  -- ยังไม่ตั้ง secret → ข้าม (fail-closed · ไม่ยิง request เปล่า)
  if secret is null or secret = '' then
    return new;
  end if;

  perform net.http_post(
    hook_url,
    jsonb_build_object(
      'table', tg_table_name,
      'type', tg_op,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    ),
    '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    5000
  );
  return new;
end;
$fn$;

-- โอนเงินสำเร็จ / ปฏิเสธถอน (เฉพาะตอน status เปลี่ยน)
drop trigger if exists notify_redemption on public.redemptions;
create trigger notify_redemption
  after update on public.redemptions
  for each row when (new.status is distinct from old.status)
  execute function public.notify_app_hook();

-- อนุมัติ / ปฏิเสธบัญชีรับเงิน (เฉพาะตอน payout เปลี่ยน)
drop trigger if exists notify_payout on public.profiles;
create trigger notify_payout
  after update on public.profiles
  for each row when (new.payout is distinct from old.payout)
  execute function public.notify_app_hook();

-- ถุงถูกตีราคา → ได้แต้ม (เฉพาะ point_transactions type = 'earn')
drop trigger if exists notify_earn on public.point_transactions;
create trigger notify_earn
  after insert on public.point_transactions
  for each row when (new.type = 'earn')
  execute function public.notify_app_hook();

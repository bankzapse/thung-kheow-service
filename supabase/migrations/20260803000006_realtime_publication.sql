-- ═══════════════════════════════════════════════════════════════════════
-- เปิด Realtime ให้ตารางหลัก → หน้าเว็บอัปเดตเอง (badge/ข้อมูลเด้ง) เมื่อมีการเปลี่ยนแปลง
--   เช่น ผู้ขายหย่อนถุงใหม่ (INSERT mesh_bags) → admin เห็น badge Drop Bag เด้งขึ้นทันที
--
-- แอป subscribe postgres_changes อยู่แล้ว (store.tsx · channel "rf-changes")
-- แค่ต้องมีตารางอยู่ใน publication supabase_realtime · idempotent — รันซ้ำได้
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
  tables text[] := array[
    'mesh_bags',          -- หย่อนถุง/ตีราคา → badge Drop Bag · เก็บของ · ศูนย์คัดแยก
    'redemptions',        -- คำขอแลกเงิน → badge โอนเงิน
    'profiles',           -- อนุมัติบัญชี (payout status) → badge อนุมัติบัญชี
    'point_transactions'  -- ได้แต้ม/แลก → คะแนนอัปเดตสด
  ];
begin
  -- สร้าง publication ถ้ายังไม่มี (ปกติ Supabase มีให้อยู่แล้ว)
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

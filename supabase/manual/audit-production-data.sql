-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT ข้อมูล Production (อ่านอย่างเดียว — ไม่แก้/ไม่ลบอะไร ปลอดภัย 100%)
-- ใช้ก่อนเคลียร์ข้อมูล: รันใน Supabase → SQL Editor ของโปรเจกต์ PROD
-- แล้วส่งผลลัพธ์กลับมา → จะได้เขียน DELETE เจาะจงว่าเก็บอะไร ลบอะไร
-- เป้าหมาย: เก็บ TK-01 + 21 ถุง + เจ้าของถุง/แฟรนไชส์จริง · ลบ test ที่เหลือ
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) จำนวนแถวทุกตาราง (ดูภาพรวมว่ามีขยะเยอะแค่ไหน)
select 'profiles'            as table_name, count(*) from profiles
union all select 'cabinets',            count(*) from cabinets
union all select 'mesh_bags',           count(*) from mesh_bags
union all select 'bag_items',           count(*) from bag_items
union all select 'franchises',          count(*) from franchises
union all select 'point_transactions',  count(*) from point_transactions
union all select 'reward_tickets',      count(*) from reward_tickets
union all select 'reward_draws',        count(*) from reward_draws
union all select 'redemptions',         count(*) from redemptions
union all select 'wallet_transactions', count(*) from wallet_transactions
union all select 'audit_logs',          count(*) from audit_logs
union all select 'bills',               count(*) from bills
union all select 'bill_items',          count(*) from bill_items
union all select 'jobs',                count(*) from jobs
union all select 'job_items',           count(*) from job_items
union all select 'factory_sales',       count(*) from factory_sales
union all select 'franchise_payouts',   count(*) from franchise_payouts
union all select 'expenses',            count(*) from expenses
union all select 'device_tokens',       count(*) from device_tokens
order by table_name;

-- 2) ตู้ทั้งหมด + จำนวนถุงในแต่ละตู้ (ดูว่ามีตู้ test อะไรบ้างนอกจาก TK-01)
select c.code, c.name, c.franchise_code, c.province, c.district, c.status,
       c.created_at::date as created,
       count(b.id) as bags
from cabinets c
left join mesh_bags b on b.cabinet_id = c.id
group by c.id
order by bags desc, c.created_at;

-- 3) แฟรนไชส์ทั้งหมด
select code, name, owner_name, phone, created_at::date as created from franchises order by created_at;

-- 4) ผู้ใช้ทั้งหมด + จำนวนถุงที่หย่อน (คนไม่มีถุง + สร้างวันเดิม ๆ = มักเป็น test)
select p.id, p.role, p.name, p.phone, p.email, p.owner,
       p.created_at::date as created,
       count(b.id) as bags_dropped
from profiles p
left join mesh_bags b on b.user_id = p.id
group by p.id
order by bags_dropped desc, p.created_at;

-- 5) สรุปถุงตามตู้ + สถานะ (ยืนยัน TK-01 มี 21 ถุงจริง)
select coalesce(c.code, '(ไม่มีตู้)') as cabinet, b.status, count(*) as bags,
       sum(b.value_baht) as total_baht, sum(b.points) as total_points
from mesh_bags b
left join cabinets c on c.id = b.cabinet_id
group by c.code, b.status
order by cabinet, b.status;

-- 6) รายชื่อ "ผู้ใช้จริงที่ต้องเก็บ" = เจ้าของถุงในตู้ TK-01
select distinct p.id, p.role, p.name, p.phone, p.created_at::date as created
from mesh_bags b
join cabinets c on c.id = b.cabinet_id and c.code = 'TK-01'
join profiles p on p.id = b.user_id
order by p.created_at;

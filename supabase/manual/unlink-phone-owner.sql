-- ปลดเบอร์ออกจากบัญชี auth (รันมือใน Supabase → SQL Editor)
--
-- ทำไมต้องรันมือ: GoTrue admin API (PUT /auth/v1/admin/users/<id>) "ไม่ลบ" เบอร์ให้
-- ไม่ว่าจะส่ง phone: "" หรือ phone: null — มันข้ามฟิลด์นั้นไปเฉย ๆ ตอบ 200 เหมือนสำเร็จ
-- ต้องแก้ที่ auth.users โดยตรง
--
-- ⚠️ ก่อนรัน: บัญชีต้องมี "ทางเข้าอื่น" ที่ยืนยันแล้วว่าใช้ได้ (อีเมล/ชื่อผู้ใช้ + รหัสผ่าน)
--    ไม่งั้นจะล็อกตัวเองออก โดยเฉพาะบัญชี owner ซึ่งไม่มีใครกู้ให้ได้
--
-- บัญชีเป้าหมาย: เจ้าของระบบ (Owner) — ยืนยันแล้วว่าเข้าด้วย username "owner" ได้

update auth.users
   set phone              = null,
       phone_confirmed_at = null,
       phone_change       = '',
       phone_change_token = ''
 where id = 'c9818627-a1f2-4dc1-b2a9-f56f97f874ce';

update public.profiles
   set phone = null
 where id = 'c9818627-a1f2-4dc1-b2a9-f56f97f874ce';

-- ตรวจผล — ต้องได้ phone ว่างทั้งสองแถว
select 'auth'     as src, id, email, phone from auth.users     where id = 'c9818627-a1f2-4dc1-b2a9-f56f97f874ce'
union all
select 'profiles' as src, id, username, phone from public.profiles where id = 'c9818627-a1f2-4dc1-b2a9-f56f97f874ce';

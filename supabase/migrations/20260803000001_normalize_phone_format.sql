-- เบอร์โทรใน profiles.phone ถูกเก็บ 2 รูปแบบปนกัน (พบจริง: 66xxxxxxxxx + 0xxxxxxxxx)
-- ทำให้ query ที่เดาแค่รูปแบบเดียวมองไม่เห็นบางแถว → กันบัญชีซ้ำ/กู้บัญชีพลาด
--
-- รูปแบบมาตรฐาน = 66xxxxxxxxx (bare E.164 ไม่มี +) ให้ตรงกับ auth.users.phone
-- แปลงแถวที่ยังเป็น 0xxxxxxxxx → 66xxxxxxxxx (เฉพาะเบอร์มือถือไทยที่ถูกต้อง)
-- idempotent — รันซ้ำได้ (รอบสองไม่มีแถว 0... เหลือให้แปลง)
--
-- หมายเหตุ: โค้ดยัง query แบบ 2 รูปแบบต่อไป (backward-compatible) จนกว่าจะมั่นใจว่า
--          ข้อมูลนิ่งแล้วค่อยเหลือ query เดียว (ดู lib ตัวช่วยที่ item 6)

update profiles
set phone = '66' || substring(phone from 2)
where phone ~ '^0[0-9]{8,9}$';

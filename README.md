# ♻️ Recycle Fund — ระบบรับซื้อของเก่าออนไลน์ (Web)

แพลตฟอร์มจับคู่ **ผู้ขาย** (มีของเก่า) กับ **ผู้ซื้อ/คนขับ** (มารับถึงบ้าน)
พร้อมระบบ **จองรอบเข้ารับ · ติดตามสถานะ · แจ้งเตือน LINE · ลุ้นรางวัลประจำเดือน**

> 📋 แผน MVP เต็ม + roadmap พร้อมขาย ดูที่ [`PLAN.md`](PLAN.md)

---

## 🚀 เริ่มใช้งาน (เดโมได้ทันที)

```bash
npm install        # (ครั้งแรก) — .npmrc ตั้ง legacy-peer-deps ไว้แล้ว
npm run dev        # เปิด http://localhost:3000
```

**ล็อกอินเดโม** (มีข้อมูลตัวอย่างพร้อม):
- ปุ่ม **“ผู้ขาย”** / **“ผู้ซื้อ/คนขับ”** ในหน้า login — เข้าได้ทันที
- หรือ **เบอร์โทร** (OTP กรอกเลขอะไรก็ได้ 6 หลัก) · **อีเมล** `seller@demo.com` / `buyer@demo.com`

> เดโมใช้ **data layer แบบ localStorage** (ไม่ต้องตั้งค่า backend) — กดใช้งานได้ครบทุก flow เหมาะกับการสาธิต/พรีเซนต์

---

## ✨ ฟีเจอร์ (ครบตาม MVP)

| กลุ่ม | ฟีเจอร์ |
|---|---|
| **เข้าสู่ระบบ** | เบอร์โทร + OTP · อีเมล/รหัสผ่าน · ลงทะเบียน (เลือกบทบาท) · จำสถานะล็อกอิน · dialog ยืนยันออกจากระบบ |
| **ผู้ขาย** | สร้างรายการ (เลือกวัสดุ + ปริมาณ) · ปักหมุด/ตำแหน่งปัจจุบัน · ข้อมูลติดต่อ+จุดสังเกต · **จองรอบผู้ซื้อ** หรือโพสต์งานเปิด · รายการของฉัน · ติดตามสถานะ |
| **ผู้ซื้อ/คนขับ** | **จัดการตารางรอบเข้ารับ** (วัน/เวลา/โซน/จำนวนคิว) · รับงานเปิด · คอนเฟิร์ม/ยกเลิก · อัปเดตสถานะ (กำลังไปรับ) · ปิดงาน+บันทึกยอดจริง |
| **หน้าแรก** | ทางเข้าสร้าง/รายการ · ราคาของเก่าวันนี้ (ListView) · teaser รางวัล |
| **รายได้** | โปรไฟล์ · ขายได้ต่อเดือน+รวม · กราฟรายเดือน · รายการทั้งหมด · สิทธิ์ลุ้นรางวัล (100 บาท = 1 สิทธิ์) |
| **รางวัล** | หน้าประกาศผล **ธีม Gold/Black** — เลขที่ออก + ผู้ได้รับรางวัล + กติกา |
| **LINE OA** | ปุ่มเชื่อมบัญชี · แจ้งเตือนสถานะงาน (โครง API พร้อมใช้) |

---

## 🗂 โครงสร้างโปรเจกต์

```
src/
  app/
    login/ register/            # auth
    (app)/                      # โซนล็อกอินแล้ว (มี bottom nav + guard)
      home/ jobs/ create/
      job/[id]/ schedule/
      income/ rewards/
    api/line/                   # notify · webhook · login · callback
  components/                   # ui, JobCard, PriceList, RewardTeaser, BottomNav ...
  lib/
    store.tsx                   # ⭐ data layer + auth (localStorage) — สลับเป็น Supabase ได้
    types.ts selectors.ts seed.ts materials.ts utils.ts
    supabase/                   # client/server (Phase 1)
    line.ts                     # LINE OA helpers
supabase/schema.sql             # ตาราง + RLS + seed (Phase 1)
PLAN.md                         # แผน MVP + roadmap
```

---

## 🔌 สลับไปใช้ Production (ตาม PLAN.md)

### 1) Supabase (backend จริง)
1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. รัน [`supabase/schema.sql`](supabase/schema.sql) ใน SQL Editor (สร้างตาราง + RLS + ราคากลาง — Phase 1 base)
   จากนั้น **รันไฟล์ใน `supabase/migrations/` ทั้งหมด "เรียงตามชื่อ (วันที่)"** ต่อ — schema.sql เป็นแค่ base
   ยังไม่มีคอลัมน์/guard ที่ migration เพิ่มทีหลัง (เช่น consent, phone_verified, guard 17 คอลัมน์)
3. ใส่ `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` ใน `.env.local`
4. ย้าย logic ใน `src/lib/store.tsx` ไปเรียก Supabase (client อยู่ที่ `src/lib/supabase/`)
   - Auth: `supabase.auth.signInWithOtp({ phone })` (เบอร์ OTP), `signInWithPassword` (อีเมล)

### 2) Google Maps (Phase 2)
- ใส่ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` แล้วแทน map placeholder ในหน้า `create` ด้วย Google Maps JS API

### 3) LINE OA
- **Messaging API**: ใส่ `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` → เรียก `POST /api/line/notify` ตอนสถานะงานเปลี่ยน
- **LINE Login**: ใส่ `LINE_LOGIN_CHANNEL_*` → ปุ่มเชื่อมชี้ไป `/api/line/login`
- ตั้ง Webhook URL = `https://<domain>/api/line/webhook`

---

## ☁️ Deploy (Vercel)

```bash
# push ขึ้น GitHub แล้ว import ที่ vercel.com
# ตั้ง Environment Variables ตาม .env.example
```

Framework: **Next.js** · Build: `next build` · ไม่ต้องตั้งค่าเพิ่ม

---

## 🧾 Tech stack
Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase · LINE Messaging/Login API · lucide-react

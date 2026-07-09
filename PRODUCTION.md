# ถุงเขียว — เตรียมขึ้น Production

ระบบรีไซเคิลแบบ **Drop & Go** (หย่อนถุง สแกน QR สะสมแต้ม แลกเงิน) + จัดการแฟรนไชส์
เฟสแรก: **เปิดเฉพาะ Drop & Go** · ระบบรับซื้อของเก่าหน้าบ้าน (pickup) ปิดไว้ก่อน (`PICKUP_ENABLED=false` ใน `src/lib/features.ts`)

## ✅ สถานะล่าสุด (อัปเดตล่าสุด)
| ส่วน | สถานะ | ต้องทำอะไรต่อ |
|---|---|---|
| **โค้ด 3 ระบบ (บริษัท/แฟรนไชส์/ศูนย์คัดแยก)** | ✅ ครบ ใช้งานได้ (โหมดเดโม) | — |
| **SMS OK OTP (ยืนยันเบอร์)** | ✅ ต่อ API เสร็จ + ทดสอบแล้ว (register + ลืมรหัสผ่าน) | ใส่ env บน Vercel + อนุมัติ Sender ID + อัปเกรดบัญชีจาก trial |
| **Supabase (ฐานข้อมูลจริง)** | ⏳ schema/migrations + repo mapping ครบแล้ว | สร้างโปรเจกต์ + รัน schema + ใส่ env + ทดสอบ end-to-end (ดูหัวข้อ Supabase) |
| **Demo login bypass** (`/app`) | ✅ auto-off เมื่อมี Supabase / สั่งปิดด้วย `NEXT_PUBLIC_DEMO=off` | ตั้ง env ตอนเปิดจริง |
| **PromptPay / โดเมน / LINE** | ⏳ รอข้อมูล | ดูข้อ 2–3 |

> **ยอดเงิน SMS OK คงเหลือ:** ฿606.04 (ตรวจสอบผ่าน `GET /m/balance` แล้ว — credentials ใช้งานได้)

## 3 Surface
| Surface | ใคร | Route | หมายเหตุ |
|---|---|---|---|
| **แอปคนทิ้ง** (ถุงเขียว) | ผู้ทิ้งขยะ | `/drop`, `/points` | มือถือ/LINE LIFF · WebView เป็น native ทีหลัง |
| **เว็บแฟรนไชส์** (ถุงเขียว Partner) | เจ้าของแฟรนไชส์ | `/franchise` | รหัสตู้ + สถิติ + รายได้/สัญญา + พิมพ์ QR |
| **เว็บบริษัท** (ถุงเขียว Admin) | บริษัท/แอดมิน | `/admin` | จัดการแฟรนไชส์ · ตู้ใกล้เต็ม (เข้าเก็บ) · แบ่งรายได้ · แลกเงิน |
| **ศูนย์คัดแยก** | ทีมคัดแยก (operator) | `/shop/cabinets` | ตีราคาถุง → ให้คะแนน · จ่ายเงินแลก |

## โมเดลรายได้ (แฟรนไชส์ ↔ บริษัท)
- ค่าสัญญา **฿14,999 / ตู้** (บริษัทลงทุนตู้+ระบบ)
- **ช่วงผ่อน:** ของขายได้ → บริษัท 80% / แฟรนไชส์ 20% จนบริษัทเก็บครบค่าสัญญา
- **หลังครบ:** ของขายได้ → แฟรนไชส์ 80% / บริษัท 20% (ค่าจ้างเก็บของ + ดูแลระบบ)
- โค้ด: `src/lib/revenue.ts` (`revenueShare`) · รายงานใน `/franchise` และ `/admin/franchises`

## 1) Domain ที่ควรจด
- `thungkhiao.co` (หรือ `.com` / `.app`) — โดเมนหลัก
  - `app.thungkhiao.co` → แอปคนทิ้ง (production เว็บ)
  - `partner.thungkhiao.co` → เว็บแฟรนไชส์ (หรือใช้ path `/franchise`)
  - `admin.thungkhiao.co` → เว็บบริษัท (หรือใช้ path `/admin`)
  > MVP ใช้โดเมนเดียว + path ก็ได้ (ทุก surface อยู่ใน Next app เดียว)

## 2) Account ที่ต้องเตรียม
| บริการ | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|
| **Vercel** | โฮสต์เว็บ (Next.js) | มีแล้ว (repo เชื่อม GitHub) · ผูก custom domain |
| **Supabase** | ฐานข้อมูล + Auth + RLS | สร้างโปรเจกต์ → รัน `supabase/schema.sql` (โปรเจกต์ใหม่) หรือ migrations ตามลำดับ (โปรเจกต์เดิม) |
| **SMS OK** | ส่ง OTP ยืนยันเบอร์ | มี key/secret แล้ว · ต้องอนุมัติ Sender ID `MindFull` + อัปเกรดจาก trial |
| **LINE Developers** | LINE Login + LIFF + Messaging API | LIFF app (เปิด `scanQRCode`), Messaging API (แจ้งเตือนคะแนนเข้า/แลกเงิน) |
| **Google Cloud** | (ออปชัน) Maps/Distance Matrix | เฉพาะ pickup — เฟส Drop ยังไม่ต้อง |
| **PromptPay / ธนาคาร** | จ่ายเงินแลกแต้มให้คนทิ้ง | บัญชีบริษัทสำหรับโอนออก |
| **Apple Developer** | ส่งแอป iOS ($99/ปี) | ตอนทำ native |
| **Google Play Console** | ส่งแอป Android ($25) | ตอนทำ native |
| **โดเมน + อีเมลบริษัท** | ติดต่อ/ยืนยัน store/โดเมน | เช่น hello@thungkhiao.co |

## 3) Environment variables (Vercel → Settings → Environment Variables)
คัดลอกจาก `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_LIFF_ID=            # เปิด QR scanner ในไลน์
LINE_CHANNEL_ACCESS_TOKEN=     # แจ้งเตือน LINE
LINE_CHANNEL_SECRET=
NEXT_PUBLIC_COMPANY_PROMPTPAY=  # พร้อมเพย์บริษัท (รับเงิน/อ้างอิง)

# SMS OK (OTP ยืนยันเบอร์โทร) — ต่อโค้ดเสร็จแล้ว
SMSOK_API_KEY=                 # จาก https://developer.smsok.co
SMSOK_API_SECRET=
SMSOK_SENDER=MindFull          # ต้องลงทะเบียน+อนุมัติ Sender ID ก่อน (case-sensitive)
OTP_SECRET=                    # (โหมดเดโม) สุ่มสตริงยาว ๆ — ไม่ตั้ง = fallback ใช้ SMSOK_API_SECRET
SEND_SMS_HOOK_SECRET=          # (โหมด Supabase) secret จาก Supabase Send SMS Hook (v1,whsec_...)
```
> ไม่ใส่ env = รันโหมดเดโม (localStorage) ได้เลย · ใส่ครบ = ใช้ Supabase จริง
> ใส่ `SMSOK_*` เมื่อไหร่ หน้า `/register` จะส่ง OTP จริงทันที (ไม่ใส่ = โหมดทดลอง กรอกเลขอะไรก็ได้ 6 หลัก)

### SMS OK OTP — วิธีทำงาน (โค้ดเสร็จแล้ว)
- `src/lib/smsok.ts` — client ยิง `POST https://api.smsok.co/s` (Basic auth `KEY:SECRET`)
- `src/lib/otp.ts` — ออกโค้ด 6 หลัก + โทเคนเซ็น HMAC (ไร้สถานะ ไม่ต้องมี DB) หมดอายุ 5 นาที
- `POST /api/otp/send` (คูลดาวน์ 30 วิ/เบอร์) · `POST /api/otp/verify`
- **โหมดเดโม** (`SMSOK_*` แต่ไม่มี Supabase): หน้า `/register` ยิง OTP ผ่าน `/api/otp/*` โดยตรง
- **โหมด Supabase ใช้ Send SMS Hook** (ไม่ต้องมี Twilio): สมัคร/ลืมรหัส ใช้ OTP ในตัว Supabase แต่การ**ส่ง SMS วิ่งผ่าน hook → SMS OK** ที่ `POST /api/auth/sms-hook` (`src/app/api/auth/sms-hook/route.ts` — ตรวจลายเซ็น Standard Webhooks ด้วย `SEND_SMS_HOOK_SECRET`)
- **ยังต้องทำฝั่ง SMS OK:** (1) ลงทะเบียน+อนุมัติ Sender ID `MindFull` (2) อัปเกรดบัญชีจาก trial — บัญชี trial จะถูกล็อกผู้ส่ง/ข้อความเป็นค่า default
- **⚙️ ตั้งค่า Supabase Auth (จำเป็น):**
  1. Authentication → Providers → **Phone: เปิด** + **Enable phone confirmations: เปิด** (SMS provider เลือกอะไรก็ได้ เดี๋ยว hook override)
  2. Authentication → Hooks → **Send SMS Hook: เปิด** → HTTP → URL = `https://<domain>/api/auth/sms-hook` → คัดลอก **secret** (`v1,whsec_...`) ไปใส่ env `SEND_SMS_HOOK_SECRET`
  3. Redeploy Vercel
- ทดสอบจริง: เปิด `/register` → กรอกเบอร์ตัวเอง → รับ SMS (ผ่าน SMS OK) → กรอกโค้ด → เข้าระบบ

### Supabase — ความพร้อม (สำคัญ)
- ตาราง 19 ตัวที่โค้ดใช้มีครบใน `supabase/schema.sql` ✅
- เพิ่ม migration `20260709000001_center_cabinet_address.sql` แล้ว (คอลัมน์ที่อยู่/พื้นที่ของศูนย์คัดแยก+ตู้ และ owner/permissions/franchise_id ของ profiles) — **โปรเจกต์ใหม่รัน `schema.sql`, โปรเจกต์เดิมรัน migration นี้**
- ✅ **repo mapping ต่อครบแล้ว** (`src/lib/supabase/repo.ts` + `profileToUser`): map ที่อยู่/พื้นที่ศูนย์คัดแยก, พื้นที่ตู้, owner/permissions/franchise_id ผู้ดูแล · เขียน addCabinet/editCabinet (พื้นที่) · จัดการบัญชีศูนย์คัดแยก/ผู้ดูแล (สร้าง/แก้/ลบ/สิทธิ์) ผ่าน service-role API `POST /api/admin/users` (ตรวจสิทธิ์ผู้เรียก: admin, บาง action ต้อง owner)
- ราคาของเก่า (`material_prices`) map แล้วทั้ง read (`loadAll`) + write (`setCentralPrice`); หน้าตีราคาศูนย์คัดแยกอ่านจาก `centralPrices` — ทำงานทั้งเดโม + Supabase
- ⚠️ **ยังไม่ได้ทดสอบกับ Supabase จริง** (ยังไม่มีโปรเจกต์) — โค้ด typecheck/build ผ่าน + โหมดเดโมไม่ regress · ต้องทดสอบ end-to-end อีกครั้งหลังสร้างโปรเจกต์ + ใส่ env (เผื่อปรับ RLS/สิทธิ์ auth phone signup)

## 4) ขั้นตอน Go-live
1. Supabase: สร้างโปรเจกต์ → SQL Editor → รัน `supabase/schema.sql` (รวม Drop & Go + แฟรนไชส์แล้ว)
2. Vercel: ใส่ env → ผูก custom domain → Redeploy
3. LINE: สร้าง LIFF app (endpoint = `https://app.thungkhiao.co`) + เปิด scope `scanQRCode` + `profile` · ใส่ `NEXT_PUBLIC_LIFF_ID`
4. สร้างแฟรนไชส์ + ตู้แรกใน `/admin/franchises` → พิมพ์ QR ป้ายตู้ + ถุง (บริษัท: ปุ่ม "ตู้ & QR" → `/admin/cabinets/[id]/qr` · แฟรนไชส์: `/franchise/cabinets/[id]/qr`)
5. ตั้งราคารับซื้อของเก่าใน `/admin/scrap-prices` (ศูนย์คัดแยกใช้ราคานี้ตีราคา)
6. **Demo bypass:** หน้า `/app` ปิดอัตโนมัติเมื่อใส่ env Supabase แล้ว · ถ้าจะรัน production แบบไม่มี Supabase ให้ตั้ง `NEXT_PUBLIC_DEMO=off` เพื่อปิด chooser (เด้งไป `/login`)
7. ทดสอบ end-to-end: สมัคร `/register` (รับ OTP จริง) → คนทิ้งสแกน `TK01-0000001` → ทีมคัดแยกตีราคา → คะแนนเข้า → แลกเงิน → บริษัทโอน
8. (ทีหลัง) ห่อ WebView เป็นแอป native → ส่ง store (ดู `native/README.md`)

## 5) ปิดท้าย / กฎหมาย
- **Privacy Policy** → `https://<โดเมน>/privacy` (หน้า `src/app/privacy/page.tsx`) — ใช้ลิงก์นี้กรอกใน App Store Connect + Play Console
- **Terms of Service** → `https://<โดเมน>/terms` (หน้า `src/app/terms/page.tsx`)
- ⚠️ ก่อน go-live: แก้ placeholder ในหน้าเอกสาร — `[ชื่อบริษัท]`, `[ที่อยู่บริษัท]`, อีเมล `support@thungkhiao.co`, LINE `@thungkhiao`, และวันที่มีผลบังคับใช้
- PDPA: ขอความยินยอมเก็บเบอร์/ข้อมูลผู้ใช้ (มีลิงก์เอกสารในหน้า login แล้ว)
- ปุ่มเปิด pickup ทีหลัง: แก้ `PICKUP_ENABLED = true` ใน `src/lib/features.ts` (โค้ดครบอยู่แล้ว)

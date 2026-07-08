# ถุงเขียว — เตรียมขึ้น Production

ระบบรีไซเคิลแบบ **Drop & Go** (หย่อนถุง สแกน QR สะสมแต้ม แลกเงิน) + จัดการแฟรนไชส์
เฟสแรก: **เปิดเฉพาะ Drop & Go** · ระบบรับซื้อของเก่าหน้าบ้าน (pickup) ปิดไว้ก่อน (`PICKUP_ENABLED=false` ใน `src/lib/features.ts`)

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
```
> ไม่ใส่ env = รันโหมดเดโม (localStorage) ได้เลย · ใส่ครบ = ใช้ Supabase จริง

## 4) ขั้นตอน Go-live
1. Supabase: สร้างโปรเจกต์ → SQL Editor → รัน `supabase/schema.sql` (รวม Drop & Go + แฟรนไชส์แล้ว)
2. Vercel: ใส่ env → ผูก custom domain → Redeploy
3. LINE: สร้าง LIFF app (endpoint = `https://app.thungkhiao.co`) + เปิด scope `scanQRCode` + `profile` · ใส่ `NEXT_PUBLIC_LIFF_ID`
4. สร้างแฟรนไชส์ + ตู้แรกใน `/admin/franchises` → พิมพ์ QR ป้ายตู้ + ถุง (`/franchise` หรือ `/shop/cabinets/[id]/qr`)
5. ทดสอบ end-to-end: คนทิ้งสแกน `GLN-AA-0000001` → ทีมคัดแยกตีราคา → คะแนนเข้า → แลกเงิน → บริษัทโอน
6. (ทีหลัง) ห่อ WebView เป็นแอป native → ส่ง store (ดู `native/README.md`)

## 5) ปิดท้าย / กฎหมาย
- **Privacy Policy** → `https://<โดเมน>/privacy` (หน้า `src/app/privacy/page.tsx`) — ใช้ลิงก์นี้กรอกใน App Store Connect + Play Console
- **Terms of Service** → `https://<โดเมน>/terms` (หน้า `src/app/terms/page.tsx`)
- ⚠️ ก่อน go-live: แก้ placeholder ในหน้าเอกสาร — `[ชื่อบริษัท]`, `[ที่อยู่บริษัท]`, อีเมล `support@thungkhiao.co`, LINE `@thungkhiao`, และวันที่มีผลบังคับใช้
- PDPA: ขอความยินยอมเก็บเบอร์/ข้อมูลผู้ใช้ (มีลิงก์เอกสารในหน้า login แล้ว)
- ปุ่มเปิด pickup ทีหลัง: แก้ `PICKUP_ENABLED = true` ใน `src/lib/features.ts` (โค้ดครบอยู่แล้ว)

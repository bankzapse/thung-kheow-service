# ถุงเขียว — Data Safety (Google Play) & App Privacy (Apple)

เอกสารนี้ map ข้อมูลที่แอปเก็บจริง → ช่องที่ต้องกรอกในคอนโซลทั้ง 2 store
อิงตาม [/privacy](src/app/privacy/page.tsx) · กรอกให้ตรงกันทั้ง 2 ที่เพื่อไม่ให้ถูกปฏิเสธ

## ข้อมูลที่แอปเก็บจริง (baseline)
| ข้อมูล | เก็บ? | จำเป็น | เข้ารหัสตอนส่ง | ใช้ทำอะไร |
|---|---|---|---|---|
| เบอร์โทรศัพท์ | ✅ | จำเป็น | ✅ (HTTPS) | ยืนยันตัวตน/บัญชี |
| อีเมล | ✅ (ถ้ากรอก) | ไม่บังคับ | ✅ | บัญชี/ติดต่อ |
| ชื่อที่แสดง (LINE) | ✅ | ไม่บังคับ | ✅ | โปรไฟล์/แสดงผล |
| รูปโปรไฟล์ (LINE) | ✅ | ไม่บังคับ | ✅ | โปรไฟล์ |
| LINE User ID | ✅ | ไม่บังคับ | ✅ | ยืนยันตัวตน/แจ้งเตือน |
| ประวัติการหย่อนถุง + คะแนน | ✅ | จำเป็น | ✅ | ฟังก์ชันหลัก (สะสม/แลกคะแนน) |
| บัญชีรับเงิน (พร้อมเพย์/ธนาคาร) | ✅ | จำเป็น (ตอนแลกเงิน) | ✅ | โอนเงินจากการแลกคะแนน |
| ตำแหน่งโดยประมาณ | ✅ (ถ้าอนุญาต) | ไม่บังคับ | ✅ | แสดงตู้ใกล้ตัว |
| ข้อมูลอุปกรณ์/log/crash | ✅ | ไม่บังคับ | ✅ | ความปลอดภัย/ปรับปรุง |

**ประกาศสำคัญ (จริงทั้งคู่):**
- ❌ ไม่มีการติดตามข้ามแอป/เว็บ (no tracking) · ไม่มี ad SDK · ไม่มีโฆษณา
- ❌ ไม่ขายข้อมูล
- ✅ เข้ารหัสระหว่างส่ง (HTTPS/TLS)
- ✅ ผู้ใช้ขอลบข้อมูล/บัญชีได้ (ต้องมี URL — ดูหัวข้อท้าย)
- Third parties เป็น **ผู้ประมวลผลแทนเรา** (Supabase=DB, Vercel=hosting, LINE=login/แจ้งเตือน) → นับเป็น "collected" ไม่ใช่ "shared/sold"

---

## A) Google Play — Data Safety form
(Play Console → App content → Data safety)

**คำถามหลัก**
- Does your app collect or share any of the required user data types? → **Yes**
- Is all user data encrypted in transit? → **Yes**
- Do you provide a way for users to request that their data be deleted? → **Yes** (ใส่ URL หน้าลบบัญชี)

**เลือก data types + ตอบต่อชนิด** (ทุกชนิด: Collected = Yes, Shared = No, Processed ephemerally = No เว้นระบุ, Data required = ตามตาราง)

| Category → Data type | Collected | Shared | Purposes |
|---|---|---|---|
| **Personal info › Name** | Yes | No | Account management, App functionality |
| **Personal info › Email address** | Yes | No | Account management |
| **Personal info › Phone number** | Yes | No | Account management, App functionality |
| **Personal info › User IDs** (LINE User ID) | Yes | No | Account management, App functionality |
| **Photos** (รูปโปรไฟล์ LINE) | Yes | No | App functionality |
| **Financial info › Other financial info** (บัญชี/พร้อมเพย์รับเงิน) | Yes | No | App functionality (จ่ายเงินแลกคะแนน) |
| **Location › Approximate location** | Yes | No | App functionality (แสดงตู้ใกล้ตัว) — Optional |
| **App activity › App interactions** (หย่อนถุง/คะแนน/แลกเงิน) | Yes | No | App functionality, Analytics |
| **App info and performance › Crash logs** | Yes | No | App functionality (Diagnostics) |
| **App info and performance › Diagnostics** | Yes | No | App functionality |
| **Device or other IDs › Device or other IDs** | Yes | No | Fraud prevention, security, and compliance |

> Purposes ที่ Play มีให้เลือก: App functionality · Analytics · Developer communications · Fraud prevention, security, compliance · Account management · (อย่าติ๊ก Advertising/marketing/Personalization)
> "Data required or optional": ทำตามคอลัมน์ "จำเป็น" ในตาราง baseline

---

## B) Apple App Store — App Privacy
(App Store Connect → App Privacy → Get started)

**คำถามหลัก:** Do you or your third-party partners collect data from this app? → **Yes**

**ต่อชนิด:** ระบุ Purposes · "Linked to the user's identity?" = **Yes** (ผูกกับบัญชี) · "Used for tracking?" = **No** (ทุกชนิด)

| Category → Data Type | Linked | Tracking | Purposes |
|---|---|---|---|
| **Contact Info › Name** | Yes | No | App Functionality |
| **Contact Info › Email Address** | Yes | No | App Functionality |
| **Contact Info › Phone Number** | Yes | No | App Functionality |
| **Identifiers › User ID** (LINE User ID) | Yes | No | App Functionality |
| **Identifiers › Device ID** | Yes | No | App Functionality, Analytics |
| **Financial Info › Other Financial Info** (บัญชีรับเงิน) | Yes | No | App Functionality |
| **Location › Coarse Location** | Yes | No | App Functionality |
| **User Content › Photos or Videos** (รูปโปรไฟล์) | Yes | No | App Functionality |
| **Usage Data › Product Interaction** | Yes | No | App Functionality, Analytics |
| **Diagnostics › Crash Data** | Yes | No | App Functionality |
| **Diagnostics › Performance Data** | Yes | No | App Functionality |

> Apple: "Used for tracking" = ใช้เชื่อมกับข้อมูลจาก app/เว็บของบริษัทอื่นเพื่อโฆษณา/ตัวกลางข้อมูล → ถุงเขียว = **No** ทั้งหมด
> Privacy Policy URL (บังคับ): `https://<โดเมน>/privacy`

---

## ✅ หน้าลบบัญชี/ข้อมูล + URL (บังคับทั้ง 2 store)
Google (ตั้งแต่ 2022) และ Apple บังคับให้มีช่องทางลบบัญชี **จากในแอป** และ/หรือ **URL เว็บ**
- **มีแล้ว:** `https://<โดเมน>/delete-account` (หน้า `src/app/delete-account/page.tsx`) — อธิบายวิธีขอลบ (ในแอป/อีเมล/LINE), ข้อมูลที่ลบ, ข้อยกเว้นตามกฎหมาย, ระยะเวลา 30 วัน
- ใส่ URL นี้ใน: **Play Console → Data safety → Deletion** และ **App Store review notes**
- **มี in-app deletion จริงแล้ว:** แท็บคะแนน → “ลบบัญชีและข้อมูล” → เรียก `POST /api/account/delete`
  (ตรวจ session → ลบ auth user ด้วย service_role → cascade ลบ profiles/bags/points/redemptions) · โหมดเดโมลบใน localStorage

## หมายเหตุก่อนกรอก
- ถ้าเฟสแรก **ไม่เปิดใช้ location/analytics/crash SDK จริง** → อย่าติ๊กชนิดนั้น (กรอกเกินจริงก็ถูกปฏิเสธได้) ปรับตามที่เปิดใช้จริงตอนส่ง
- ตอนนี้ยังไม่มี analytics/crash SDK (เช่น GA/Firebase/Sentry) — ถ้ายังไม่ใส่ ให้ตัด Analytics/Crash/Diagnostics ออกจากฟอร์ม
- LINE Login เก็บข้อมูลตามนโยบาย LINE — ประกาศ LINE User ID/ชื่อ/รูปตามตารางพอ

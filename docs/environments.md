# สภาพแวดล้อม: Production ↔ Dev

แยก prod/dev ให้ข้อมูลจริงปลอดภัย — dev พังยังไงก็ไม่แตะ prod

```
                    ┌─ main branch ─→ Vercel Production ─→ thung-kheow.com
GitHub repo ────────┤                      └── env: Supabase PROD (ข้อมูลจริง)
                    └─ dev branch  ─→ Vercel Preview    ─→ dev.thung-kheow.com
                                           └── env: Supabase DEV (โปรเจกต์แยก, ฟรีทเทียร์)
```

- **DB แยกคนละโปรเจกต์ Supabase** (ไม่แชร์ตาราง)
- **Vercel project เดียว** ผูกโดเมนตาม branch + env แยกตาม target
- `NEXT_PUBLIC_*` ฝังตอน build → แต่ละ env มีค่าของตัวเอง (Vercel เลือกให้ตาม target)

---

## ตั้งค่าครั้งแรก (dev)

### 1) Supabase — สร้างโปรเจกต์ dev
1. [supabase.com](https://supabase.com) → **New project** ชื่อ `thung-kheow-dev` (org ฟรี, region Singapore)
2. ตั้ง schema + migrations รวดเดียว (ต้องมี `psql`):
   ```bash
   ./scripts/db-apply.sh 'postgresql://postgres.xxx:PASSWORD@...:5432/postgres'
   ```
   connection string อยู่ที่ Supabase → **Settings → Database → Connection string → URI**
   (หรือรัน `supabase/schema.sql` แล้วไฟล์ใน `supabase/migrations/` เรียงชื่อ ใน SQL Editor เอง)
3. **Settings → API** → ก๊อป `URL`, `anon/publishable key`, `service_role key`
4. **Authentication** → เปิด provider ให้ตรง prod (Phone OTP / อีเมล)

### 2) Vercel — env + โดเมน (Project → Settings)
**Environment Variables** — ตั้งคนละชุดตาม target:

| ตัวแปร | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod | **dev** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | **dev** |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | **dev** |
| `NEXT_PUBLIC_SITE_URL` | `https://thung-kheow.com` | `https://dev.thung-kheow.com` |

> ค่าอื่น (SMS/LINE/OTP) ใช้ร่วมได้ก่อน · โค้ดรับทั้ง `_ANON_KEY` และ `_PUBLISHABLE_KEY`

**Domains** → Add `dev.thung-kheow.com` → Edit → **Git Branch = `dev`**

### 3) Cloudflare — DNS
Add record: `CNAME` · Name `dev` · Target ตามที่ Vercel บอก (ปกติ `cname.vercel-dns.com`) · **DNS only** (เมฆเทา)

### 4) Git — branch dev
```bash
git checkout -b dev main && git push -u origin dev   # push เข้า dev → เด้งขึ้น dev.thung-kheow.com
```

---

## ⚠️ LINE Login / LIFF บน dev
LIFF ผูก endpoint กับโดเมน prod → บน dev ปุ่มล็อกอิน LINE จะไม่ทำงาน
เว้นแต่สร้าง LINE Login channel + LIFF แยกชี้ dev · **ทางง่าย:** ล็อกอินเบอร์/OTP หรือโหมดเดโมบน dev

---

## เคลียร์ข้อมูล Production (ลบถาวร — ทำเมื่อจำเป็น)
1. **Backup ก่อนเสมอ** — Supabase → Database → Backups
2. **Audit** — รัน [`supabase/manual/audit-production-data.sql`](../supabase/manual/audit-production-data.sql) (อ่านอย่างเดียว) ดูว่าอะไร real/test
3. **ทดสอบ DELETE บน dev ก่อน** แล้วค่อยรันบน prod
4. เป้าหมาย: เก็บ `TK-01` + ถุงในตู้ + เจ้าของถุง/แฟรนไชส์จริง · ลบ test ที่เหลือ

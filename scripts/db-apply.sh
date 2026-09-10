#!/usr/bin/env bash
# ตั้ง schema + migrations ให้ Supabase โปรเจกต์ใหม่ (เช่น dev) รวดเดียว — แทนก๊อปทีละไฟล์ใน SQL Editor
#
# ต้องมี:
#   1) psql          → brew install libpq && brew link --force libpq   (หรือ postgresql)
#   2) connection string จาก Supabase → Settings → Database → Connection string → URI
#      (ใช้แบบ "Session pooler" หรือ direct ก็ได้ · ใส่รหัสผ่าน DB ที่ตั้งตอนสร้างโปรเจกต์)
#
# ใช้:
#   ./scripts/db-apply.sh 'postgresql://postgres.xxxx:PASSWORD@aws-0-...:5432/postgres'
#   # หรือ  DATABASE_URL='postgresql://...' ./scripts/db-apply.sh
#
# ⚠️ รันกับโปรเจกต์ "ว่าง/ใหม่" เท่านั้น — ไม่ใช่ prod ที่มีข้อมูลจริง
set -euo pipefail

DB="${1:-${DATABASE_URL:-}}"
if [[ -z "$DB" ]]; then
  echo "❌ ต้องส่ง connection string — ดู header ในไฟล์นี้" >&2
  exit 1
fi

DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "▶ schema.sql (base)"
psql "$DB" -v ON_ERROR_STOP=1 -q -f "$DIR/supabase/schema.sql"

n=0
for f in "$DIR"/supabase/migrations/*.sql; do
  echo "▶ $(basename "$f")"
  psql "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
  n=$((n + 1))
done

echo "✅ เสร็จ — schema.sql + $n migrations"
echo "   ถัดไป: Supabase → Authentication → ตั้งค่า provider (Phone OTP / อีเมล) ตามที่ prod ใช้"

-- คอนฟิกกลางของระบบ (key-value / jsonb) — เริ่มจาก "ภารกิจ & โบนัส" ที่บริษัทตั้งเอง
-- อ่านได้ทุกคน (ผู้ขายต้องเห็นภารกิจ) · แก้ไขเฉพาะแอดมิน/บริษัท (is_admin)
-- idempotent — รันซ้ำได้

create table if not exists app_config (
  key        text primary key,
  value      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_config enable row level security;

drop policy if exists app_config_read on app_config;
create policy app_config_read on app_config for select using (true);

drop policy if exists app_config_admin on app_config;
create policy app_config_admin on app_config for all using (is_admin()) with check (is_admin());

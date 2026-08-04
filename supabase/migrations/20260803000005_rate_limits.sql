-- ═══════════════════════════════════════════════════════════════════════
-- Rate limit กลาง (fixed-window) — เก็บ counter ใน DB → shared ทุก instance บน serverless
--   ใช้เสริม throttle ต่อเบอร์เดิม (otp_throttle) ด้วยลิมิต "ต่อ IP/ผู้ใช้"
--   กันหมุนเบอร์ยิง otp/send (ค่า SMS บาน) + ถล่ม endpoint อื่น
--   idempotent — รันซ้ำได้
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.rate_limits (
  key          text primary key,        -- เช่น 'otp_send_ip:1.2.3.4'
  count        int not null default 0,
  window_start timestamptz not null default now()
);

-- RLS เปิด · ไม่มี policy → client แตะไม่ได้เลย (เฉพาะ SECURITY DEFINER function ด้านล่าง)
alter table public.rate_limits enable row level security;

/**
 * นับ 1 ครั้งต่อ key แบบ fixed-window · คืน true = ยังไม่เกินลิมิต (ทำต่อได้)
 * atomic ด้วย upsert เดียว → ปลอดภัยจาก race บน serverless
 */
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  now_ts timestamptz := now();
begin
  insert into public.rate_limits as rl (key, count, window_start)
    values (p_key, 1, now_ts)
  on conflict (key) do update
    set count = case when rl.window_start < now_ts - make_interval(secs => p_window_seconds) then 1
                     else rl.count + 1 end,
        window_start = case when rl.window_start < now_ts - make_interval(secs => p_window_seconds) then now_ts
                            else rl.window_start end
  returning rl.count into v_count;
  return v_count <= p_limit;
end;
$$;

grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated, service_role;

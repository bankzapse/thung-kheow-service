-- ═══════════════════════════════════════════════════════════════════════
-- Audit log — บันทึกการกระทำที่อ่อนไหว (เงิน/บัญชี/สิทธิ์) ไว้ตรวจสอบย้อนหลัง
--   · เขียนจาก service-role (server API) + DB trigger เท่านั้น → กันแก้จาก client
--   · อ่านได้เฉพาะ admin/owner · แก้/ลบไม่ได้เลย (append-only)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null, -- ใครทำ (คงบันทึกไว้แม้ผู้ใช้ถูกลบ)
  actor_role  text,                                              -- บทบาทตอนนั้น (admin/owner/…)
  action      text not null,                                     -- เช่น 'redemption.paid', 'createFranchise'
  target_type text,                                              -- ชนิดเป้าหมาย เช่น 'profile','franchise'
  target_id   text,                                              -- id เป้าหมาย
  summary     text,                                              -- สรุปอ่านง่าย (ภาษาไทย)
  metadata    jsonb,                                             -- ข้อมูลเสริม (ห้ามใส่ PII/รหัสผ่าน)
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx   on public.audit_logs (actor_id);
create index if not exists audit_logs_action_idx  on public.audit_logs (action);

-- RLS: อ่านได้เฉพาะ admin/owner · ไม่มี policy insert/update/delete
--      → client ทำอะไรกับตารางนี้ไม่ได้เลย (service_role + SECURITY DEFINER trigger bypass RLS)
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'admin' or p.owner = true)
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- Trigger: จ่ายเงินแลกคะแนน (redemptions.status → 'paid')
--   จุดจ่ายเงินออกไปผ่าน client (RLS) ไม่ใช่ server API → ใช้ trigger จับให้ tamper-proof
--   บันทึก actor จาก auth.uid() (บริษัท/แอดมินที่กดจ่าย) · ไม่เก็บเลขบัญชี (PII)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.audit_redemption_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and coalesce(old.status, '') <> 'paid' then
    insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, summary, metadata)
    values (
      auth.uid(),
      (select case when p.owner then 'owner' else p.role::text end from public.profiles p where p.id = auth.uid()), -- ::text กัน CASE ปน enum×text
      'redemption.paid',
      'redemption',
      new.id::text,
      'จ่ายเงินแลกคะแนน ฿' || coalesce(new.amount_baht::text, '?'),
      jsonb_build_object('amountBaht', new.amount_baht, 'points', new.points, 'code', new.code)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_redemption_paid on public.redemptions;
create trigger trg_audit_redemption_paid
  after update of status on public.redemptions
  for each row execute function public.audit_redemption_paid();

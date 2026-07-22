"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { STATUS_META, type JobStatus } from "@/lib/types";
import { Check, X, Info, MessageCircle, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";

/* ---------------- Status badge ---------------- */
export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("chip", m.color, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

/* ---------------- Status stepper ---------------- */
const FLOW: JobStatus[] = ["submitted", "confirmed", "en_route", "completed"];
export function Stepper({ status }: { status: JobStatus }) {
  const cancelled = status === "cancelled";
  const current = STATUS_META[status].step;
  return (
    <div className="flex items-center">
      {FLOW.map((s, i) => {
        const meta = STATUS_META[s];
        const done = !cancelled && current >= meta.step;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition",
                  done ? "bg-brand-600 text-white" : "bg-neutral-200 text-neutral-400",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-[10px]", done ? "text-brand-700 font-medium" : "text-neutral-400")}>
                {meta.label}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <div className={cn("mx-1 h-0.5 flex-1 rounded", done && current > meta.step ? "bg-brand-500" : "bg-neutral-200")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] animate-backdrop-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm animate-scale-in rounded-3xl bg-white p-5 shadow-float ring-1 ring-neutral-900/5">
        {title && <h3 className="mb-2 text-lg font-bold text-neutral-900">{title}</h3>}
        <div className="text-sm text-neutral-600">{children}</div>
        {footer && <div className="mt-5 flex gap-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Bottom sheet ---------------- */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] animate-backdrop-in" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-float animate-slide-up">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-200" />
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
            <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
            value === o.value ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
/**
 * หน้าว่าง — เดิมเป็นข้อความเปล่ากับ emoji จาง ๆ ดูเหมือนหน้าเสีย
 * ใส่วงกลมไล่สีรองไอคอน + ปุ่มพาไปทำสิ่งที่ควรทำต่อ (ไม่ใช่ปล่อยให้ผู้ใช้ตัน)
 */
export function EmptyState({
  icon,
  title,
  hint,
  actionLabel,
  actionHref,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="relative mb-2">
        <div className="absolute inset-0 -z-10 scale-125 rounded-full bg-gradient-to-br from-brand-100 to-brand-50 blur-md" />
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-4xl ring-1 ring-brand-100">
          {icon ?? "📭"}
        </div>
      </div>
      <p className="font-semibold text-neutral-700">{title}</p>
      {hint && <p className="max-w-[16rem] text-sm text-neutral-400">{hint}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-3 !px-5">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin", className)} />;
}

/* ---------------- Skeleton (โครงโหลดข้อมูล) ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-neutral-200/70", className)} />;
}

/** โครงรายการ (การ์ด) ระหว่างโหลดข้อมูล */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-neutral-900/5">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Global loading bar (บนสุดของจอ) ---------------- */
/** แถบโหลดบาง ๆ ด้านบน แสดงเมื่อมีงานกำลังประมวลผล (pending > 0) — ให้ feedback ทั่วทั้งระบบ */
export function GlobalLoadingBar() {
  const { pending } = useStore();
  const active = pending > 0;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden">
      <div
        className={cn(
          "h-full bg-gradient-to-r from-brand-400 via-brand-600 to-brand-400 transition-opacity duration-200",
          active ? "animate-loading-bar opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

/* ---------------- Full-screen boot loader ---------------- */
export function BootLoader({ label = "กำลังโหลด…" }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-white">
      <div className="flex flex-col items-center gap-3 text-neutral-400">
        <Spinner className="h-7 w-7 text-brand-500" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

/** โครงหน้าฝั่งผู้ขาย (มือถือ) ระหว่างโหลดข้อมูล — เห็นเป็นหน้ารายการที่กำลังโหลด */
export function AppSkeleton() {
  return (
    <div className="min-h-dvh bg-neutral-50 px-4 pb-24 pt-6">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="flex gap-3">
          <Skeleton className="h-20 flex-1 rounded-2xl" />
          <Skeleton className="h-20 flex-1 rounded-2xl" />
        </div>
        <Skeleton className="h-3.5 w-28" />
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}

/** โครงหน้าคอนโซล (บริษัท/แฟรนไชส์/ศูนย์) ระหว่างโหลด — header + sidebar + เนื้อหา */
export function ConsoleSkeleton() {
  return (
    <div className="min-h-dvh bg-neutral-100">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 shadow-sm">
        <div className="flex h-14 items-center gap-3 px-4">
          <Skeleton className="h-8 w-8 rounded-lg bg-white/30" />
          <Skeleton className="h-4 w-44 bg-white/30" />
        </div>
        <nav className="flex gap-2 border-t border-white/10 bg-white px-3 py-2 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 shrink-0 rounded-lg" />
          ))}
        </nav>
      </header>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col gap-2 border-r border-neutral-200 bg-white px-3 py-4 md:flex">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl" />
          ))}
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <Skeleton className="h-7 w-56" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-3.5 w-32" />
            <SkeletonList rows={4} />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Toaster ---------------- */
export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] mx-auto flex max-w-md flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={cn(
            "pointer-events-auto flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-float ring-1 ring-white/10 animate-fade-in",
            t.kind === "line" ? "bg-[#06C755]" : t.kind === "info" ? "bg-neutral-800" : "bg-brand-600",
          )}
        >
          <span className="shrink-0">
            {t.kind === "line" ? (
              <MessageCircle className="h-4 w-4" />
            ) : t.kind === "info" ? (
              <Info className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </span>
          <span className="text-left">{t.text}</span>
        </button>
      ))}
    </div>
  );
}

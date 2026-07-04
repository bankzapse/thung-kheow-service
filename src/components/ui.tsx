"use client";

import React from "react";
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
export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 text-4xl opacity-60">{icon ?? "📭"}</div>
      <p className="font-medium text-neutral-600">{title}</p>
      {hint && <p className="text-sm text-neutral-400">{hint}</p>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin", className)} />;
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

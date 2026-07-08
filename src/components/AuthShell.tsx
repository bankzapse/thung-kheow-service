"use client";

import { Logo } from "@/components/Logo";

/** โครงหน้า auth (login/register/forgot) — พื้นหลัง gradient + โลโก้ + การ์ดขาว */
export function AuthShell({
  subtitle,
  grad = "from-brand-500 via-brand-600 to-brand-700",
  children,
  footer,
}: {
  subtitle: string;
  grad?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className={`relative min-h-dvh overflow-hidden bg-gradient-to-br ${grad}`}>
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-lg">
            <Logo size={44} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">ถุงเขียว</h1>
          <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5">{children}</div>

        {footer}
      </div>
    </div>
  );
}

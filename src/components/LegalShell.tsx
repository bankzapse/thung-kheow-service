import Link from "next/link";
import { Logo } from "./Logo";
import { ArrowLeft } from "lucide-react";

export function LegalShell({ title, subtitle, updated, children }: { title: string; subtitle?: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f4f6f8]">
      <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-5">
          <Link href="/login" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-bold text-neutral-900">ถุง<span className="text-brand-600">เขียว</span></span>
          </Link>
          <Link href="/login" className="btn-ghost ml-auto !px-2 !py-2 text-sm text-neutral-500"><ArrowLeft className="h-4 w-4" /> กลับ</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-2xl font-extrabold text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        <p className="mt-1 text-xs text-neutral-400">อัปเดตล่าสุด: {updated}</p>
        <div className="mt-6 space-y-7 text-[15px] leading-relaxed text-neutral-700">{children}</div>
        <footer className="mt-10 border-t border-neutral-200 pt-5 text-xs text-neutral-400">
          <p>ถุงเขียว (Thung Khiao) · ดำเนินการโดย บริษัท [ชื่อบริษัท] จำกัด</p>
          <p className="mt-1">
            <Link href="/privacy" className="text-brand-600">นโยบายความเป็นส่วนตัว</Link> ·{" "}
            <Link href="/terms" className="text-brand-600">ข้อกำหนดการใช้งาน</Link> ·{" "}
            <Link href="/delete-account" className="text-brand-600">ลบบัญชี</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

export function Sec({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-neutral-900">{n}. {title}</h2>
      {children}
    </section>
  );
}

export function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-brand-500">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

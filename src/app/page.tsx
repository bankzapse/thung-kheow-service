import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Photo } from "@/components/Photo";
import { LiffEntry } from "@/components/LiffEntry";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESC, LEGAL_NAME, LEGAL_NAME_EN, SUPPORT_EMAIL, SUPPORT_TEL, LINE_OA_ID, LINE_OA_ADD_URL } from "@/lib/site";
import {
  Recycle, ScanLine, Coins, Banknote, Boxes, Leaf, ShieldCheck, MapPin, ArrowRight,
  PackageCheck, Building2, Smartphone, Mail, Phone, MessageCircle, Facebook, Plus,
} from "lucide-react";

// metadataBase / OG / twitter ตั้งไว้ที่ root layout แล้ว (src/app/layout.tsx)
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE }, // absolute = ไม่เติม "| ถุงเขียว" ต่อท้าย
  description: SITE_DESC,
  alternates: { canonical: "/" },
};

// ตัวเลขเครือข่าย — อัปเดตทุกสัปดาห์
const STATS = {
  updated: "8 กรกฎาคม 2569",
  cabinets: 128,
  bags: 46200,
  wasteTon: 82,
  paid: 1_240_000,
};

// รูปประกอบ (Unsplash License — ใช้เชิงพาณิชย์ได้) เก็บไว้ในเครื่องเอง
// ไม่ hotlink เพราะเป็น dependency ภายนอกใน LCP path + เสี่ยงรูปหาย
const IMG = {
  hero: "/img/hero.jpg",
  nature: "/img/nature.jpg",
  bottles: "/img/bottles.jpg",
};

const th = (n: number) => n.toLocaleString("en-US");

/**
 * JSON-LD — บอก Google ว่าใครเป็นผู้ให้บริการ + ตอบคำถามที่คนไทยค้นจริง
 * FAQ ต้องแสดงบนหน้าจริงด้วย (ดูส่วน FAQ ด้านล่าง) — Google ลงโทษถ้า markup ไม่ตรงกับที่เห็น
 */
const FAQS = [
  {
    q: "ถุงเขียวคืออะไร ขายขยะได้เงินจริงไหม",
    a: "ถุงเขียวคือบริการรับซื้อขยะรีไซเคิลผ่านตู้ Drop Bag คัดแยกขยะใส่ถุง นำไปหย่อนที่ตู้ สแกน QR สะสมแต้ม แล้วแลกเป็นเงินจริงเข้าพร้อมเพย์ 1 คะแนน = 1 บาท",
  },
  {
    q: "ตู้รับซื้อขยะของถุงเขียวอยู่ที่ไหนบ้าง",
    a: `ปัจจุบันมีตู้ Drop Bag ${STATS.cabinets} จุด ตรวจสอบจุดที่ใกล้บ้านคุณได้ในแอปถุงเขียว`,
  },
  {
    q: "รับซื้อของเก่าประเภทไหนบ้าง",
    a: "ขวดพลาสติก PET ขวดขาวขุ่น HDPE กระป๋องอะลูมิเนียม กระดาษ ขวดแก้ว และพลาสติกรีไซเคิลอื่น ๆ ตีราคาตามน้ำหนักและชนิดวัสดุ ดูราคากลางได้ในแอป",
  },
  {
    q: "แลกคะแนนเป็นเงินได้อย่างไร",
    a: "กดแลกคะแนนในแอป ระบุบัญชีพร้อมเพย์ที่ต้องการรับเงิน ทีมงานจะตรวจสอบและโอนให้ตามรอบที่กำหนด",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      alternateName: ["Thung Khiao", "ถุงเขียว รีไซเคิล"],
      legalName: `${LEGAL_NAME} (${LEGAL_NAME_EN})`,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description: SITE_DESC,
      email: SUPPORT_EMAIL,
      telephone: SUPPORT_TEL,
      areaServed: { "@type": "Country", name: "TH" },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: SUPPORT_EMAIL,
          telephone: SUPPORT_TEL,
          availableLanguage: ["th"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "th-TH",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Landing() {
  return (
    <div className="min-h-dvh scroll-smooth bg-white text-neutral-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {/* เปิดจากในแอป LINE → เข้าแอปเลย ไม่ต้องผ่านหน้าการตลาด */}
      <LiffEntry />
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={34} />
            <span className="text-lg font-extrabold tracking-tight">ถุง<span className="text-brand-600">เขียว</span></span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-neutral-500 md:flex">
            <a href="#what" className="hover:text-brand-600">สิ่งที่เราทำ</a>
            <a href="#how" className="hover:text-brand-600">วิธีการทำงาน</a>
            <a href="#stats" className="hover:text-brand-600">สถิติ</a>
            <a href="#sponsors" className="hover:text-brand-600">ผู้สนับสนุน</a>
            <a href="#contact" className="hover:text-brand-600">ติดต่อ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden text-sm font-semibold text-neutral-600 hover:text-brand-600 sm:block">เข้าสู่ระบบ</Link>
            <Link href="/app" className="btn-primary !px-4 !py-2 text-sm">ทดลองใช้</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-emerald-50">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              <Leaf className="h-3.5 w-3.5" /> รีไซเคิลได้เงิน · ลดขยะเพื่อโลก
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-neutral-900 md:text-5xl">
              เปลี่ยน<span className="text-brand-600">ขยะรีไซเคิล</span><br />ให้เป็น<span className="text-brand-600">เงินจริง</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-neutral-500">
              คัดแยกขยะใส่ถุง หย่อนที่ตู้ <b className="text-neutral-700">Drop Bag</b> สแกน QR สะสมแต้ม แล้วแลกเป็นเงินเข้าพร้อมเพย์ — ง่าย โปร่งใส ทำได้ทั้งชุมชน
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/app" className="btn-primary !px-5 !py-3 text-base">เริ่มใช้งาน <ArrowRight className="h-4 w-4" /></Link>
              <a href="#how" className="btn-outline !px-5 !py-3 text-base">ดูวิธีการทำงาน</a>
            </div>
            <div className="mt-6 flex items-center gap-5 text-sm text-neutral-400">
              <span className="flex items-center gap-1.5"><Coins className="h-4 w-4 text-brand-500" /> 1 คะแนน = ฿1</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-500" /> โอนผ่านพร้อมเพย์</span>
            </div>
          </div>
          <div className="relative">
            <Photo src={IMG.hero} alt="คัดแยกขยะรีไซเคิลใส่ถุงเขียวเพื่อขายเป็นเงิน" className="aspect-[4/3] w-full rounded-3xl shadow-2xl ring-1 ring-black/5" grad="from-brand-400 to-emerald-600" priority sizes="(max-width: 1024px) 100vw, 560px" />
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5 sm:block">
              <p className="text-2xl font-extrabold text-brand-600">{STATS.wasteTon} ตัน</p>
              <p className="text-xs text-neutral-400">ขยะเข้าสู่รีไซเคิล</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section id="what" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:py-20">
        <SectionHead eyebrow="สิ่งที่เราทำ" title="ระบบรีไซเคิลครบวงจร ที่คืนคุณค่าให้ทุกคน" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Boxes className="h-6 w-6" />} title="ตู้ Drop Bag" desc="จุดหย่อนถุงรีไซเคิลใกล้บ้าน กระจายทั่วชุมชน หย่อนได้ 24 ชม." />
          <Feature icon={<ScanLine className="h-6 w-6" />} title="สแกน QR ครั้งเดียว" desc="รหัสเดียวบอกทั้งแฟรนไชส์ ตู้ และถุง สะสมแต้มอัตโนมัติ" />
          <Feature icon={<Banknote className="h-6 w-6" />} title="แลกเป็นเงินจริง" desc="สะสมแต้มแลกเงินเข้าพร้อมเพย์ 1 คะแนน = ฿1 โปร่งใส ตรวจสอบได้" />
          <Feature icon={<Building2 className="h-6 w-6" />} title="โมเดลแฟรนไชส์" desc="เปิดตู้เป็นเจ้าของแฟรนไชส์ แบ่งรายได้จากขยะที่รีไซเคิลได้" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="scroll-mt-20 bg-neutral-50 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="วิธีการทำงาน" title="4 ขั้นตอนง่าย ๆ เปลี่ยนขยะเป็นเงิน" />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="grid gap-5">
              <Step n={1} icon={<Recycle className="h-5 w-5" />} title="คัดแยกใส่ถุง" desc="แยกขยะรีไซเคิล (ขวด กระป๋อง กระดาษ พลาสติก) ใส่ถุงตาข่ายถุงเขียว" />
              <Step n={2} icon={<MapPin className="h-5 w-5" />} title="หย่อนที่ตู้ Drop Bag" desc="นำถุงไปหย่อนที่ตู้ใกล้บ้าน สแกน QR บนถุงด้วยแอป" />
              <Step n={3} icon={<PackageCheck className="h-5 w-5" />} title="ทีมงานคัดแยก & ตีราคา" desc="ศูนย์คัดแยกชั่งน้ำหนัก ตีราคาตามวัสดุ แล้วให้คะแนนเข้าบัญชี" />
              <Step n={4} icon={<Coins className="h-5 w-5" />} title="แลกเป็นเงิน" desc="สะสมแต้มครบ กดแลกเงินเข้าพร้อมเพย์ ภายใน 1–3 วันทำการ" />
            </div>
            <div className="relative overflow-hidden rounded-3xl">
              <Photo src={IMG.bottles} alt="ขวดพลาสติกที่รับซื้อเป็นของเก่า" className="h-full min-h-[320px] w-full" grad="from-emerald-400 to-teal-600" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="relative scroll-mt-20 overflow-hidden bg-gradient-to-br from-brand-600 to-emerald-700 py-16 text-white md:py-20">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">ผลกระทบของเครือข่าย</p>
            <h2 className="mt-2 text-2xl font-extrabold md:text-3xl">ตัวเลขที่เราภูมิใจ — อัปเดตทุกสัปดาห์</h2>
            <p className="mt-1 text-sm text-white/70">ข้อมูลล่าสุด: {STATS.updated}</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
            <BigStat icon={<Boxes className="h-6 w-6" />} value={`${th(STATS.cabinets)}`} label="ตู้ทั้งหมด (จุด)" />
            <BigStat icon={<Recycle className="h-6 w-6" />} value={`${th(STATS.bags)}`} label="ถุงที่หย่อนแล้ว (ใบ)" />
            <BigStat icon={<Leaf className="h-6 w-6" />} value={`${th(STATS.wasteTon)}`} label="ขยะเข้าสู่รีไซเคิล (ตัน)" />
            <BigStat icon={<Banknote className="h-6 w-6" />} value={`฿${th(STATS.paid)}`} label="คืนสู่ชุมชนแล้ว (บาท)" />
          </div>
        </div>
      </section>

      {/* SPONSORS */}
      <section id="sponsors" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:py-20">
        <SectionHead eyebrow="ผู้สนับสนุน & พันธมิตร" title="ร่วมสร้างเศรษฐกิจหมุนเวียนไปด้วยกัน" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {["เทศบาลนคร", "โรงงานรีไซเคิล", "ห้างค้าปลีก", "มูลนิธิสิ่งแวดล้อม", "พันธมิตรขนส่ง"].map((s) => (
            <div key={s} className="flex h-20 items-center justify-center rounded-2xl bg-neutral-50 px-4 text-center text-sm font-semibold text-neutral-500 ring-1 ring-neutral-100">
              {s}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-neutral-400">
          สนใจเป็นผู้สนับสนุนหรือพันธมิตร? <a href="#contact" className="font-semibold text-brand-600">ติดต่อเรา</a>
        </p>
      </section>

      {/* DOWNLOAD */}
      <section className="bg-neutral-50 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
          <div className="relative order-2 overflow-hidden rounded-3xl md:order-1">
            <Photo src={IMG.nature} alt="ธรรมชาติสีเขียว — ลดขยะเพื่อสิ่งแวดล้อม" className="aspect-[5/4] w-full shadow-xl ring-1 ring-black/5" grad="from-brand-400 to-emerald-600" sizes="(max-width: 1024px) 100vw, 480px" />
          </div>
          <div className="order-1 md:order-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700"><Smartphone className="h-3.5 w-3.5" /> ดาวน์โหลดแอป</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-neutral-900">พก “ถุงเขียว” ไว้ในมือ</h2>
            <p className="mt-3 max-w-md text-neutral-500">สแกนถุง ดูคะแนน แลกเงิน และติดตามสถานะ — ครบในแอปเดียว รองรับ iOS และ Android</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <StoreBadge store="apple" />
              <StoreBadge store="google" />
            </div>
            <p className="mt-3 text-xs text-neutral-400">* เร็ว ๆ นี้ · หรือ <Link href="/app" className="font-semibold text-brand-600">ทดลองใช้บนเว็บ</Link></p>
          </div>
        </div>
      </section>

      {/* FAQ — ต้องแสดงจริงเพื่อให้ตรงกับ FAQPage JSON-LD ด้านบน */}
      <section id="faq" className="scroll-mt-20 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <SectionHead eyebrow="คำถามที่พบบ่อย" title="ขายขยะกับถุงเขียว ทำอย่างไร" />
          <div className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl ring-1 ring-neutral-100">
            {FAQS.map((f) => (
              <details key={f.q} className="group bg-white p-5 open:bg-brand-50/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-neutral-800">
                  <h3 className="text-base font-semibold">{f.q}</h3>
                  <span className="shrink-0 text-brand-600 transition group-open:rotate-45">
                    <Plus className="h-5 w-5" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="scroll-mt-20 bg-neutral-900 py-14 text-neutral-300">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <Logo size={34} />
                <span className="text-lg font-extrabold text-white">ถุงเขียว</span>
              </div>
              <p className="mt-3 max-w-sm text-sm text-neutral-400">
                เปลี่ยนขยะรีไซเคิลให้เป็นเงิน สร้างรายได้ให้ชุมชน และลดขยะเพื่อสิ่งแวดล้อมอย่างยั่งยืน
              </p>
              <div className="mt-4 flex gap-3">
                <SocialIcon href="#"><Facebook className="h-4 w-4" /></SocialIcon>
                <SocialIcon href="#"><MessageCircle className="h-4 w-4" /></SocialIcon>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="mb-3 text-sm font-semibold text-white">ติดต่อเรา</p>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-400" /> support@thung-kheow.com</li>
                  <li className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-brand-400" />
                    <a href={LINE_OA_ADD_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      LINE: {LINE_OA_ID}
                    </a>
                  </li>
                  <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-400" /> 02-000-0000</li>
                </ul>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-white">ลิงก์</p>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li><Link href="/app" className="hover:text-white">ทดลองใช้งาน</Link></li>
                  <li><Link href="/terms" className="hover:text-white">ข้อกำหนดการใช้งาน</Link></li>
                  <li><Link href="/privacy" className="hover:text-white">นโยบายความเป็นส่วนตัว</Link></li>
                  <li><Link href="/delete-account" className="hover:text-white">ขอลบบัญชี</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-neutral-500">
            © {new Date().getFullYear()} ถุงเขียว (Thung Khiao) · ดำเนินการโดย ห้างหุ้นส่วนจำกัด พุงกลม แคทเทอริ่ง
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- sub-components (server) ---------- */
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">{title}</h2>
    </div>
  );
}
function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">{icon}</div>
      <h3 className="mt-4 font-bold text-neutral-900">{title}</h3>
      <p className="mt-1.5 text-sm text-neutral-500">{desc}</p>
    </div>
  );
}
function Step({ n, icon, title, desc }: { n: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
        {icon}
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-brand-700 ring-1 ring-brand-100">{n}</span>
      </div>
      <div>
        <h3 className="font-bold text-neutral-900">{title}</h3>
        <p className="mt-0.5 text-sm text-neutral-500">{desc}</p>
      </div>
    </div>
  );
}
function BigStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-5 text-center ring-1 ring-white/15 backdrop-blur">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">{icon}</div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums md:text-4xl">{value}</p>
      <p className="mt-1 text-xs text-white/75">{label}</p>
    </div>
  );
}
function StoreBadge({ store }: { store: "apple" | "google" }) {
  return (
    <a href="#" className="inline-flex items-center gap-2.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-white transition hover:bg-neutral-800">
      {store === "apple" ? (
        <svg viewBox="0 0 384 512" className="h-6 w-6" fill="currentColor"><path d="M318.7 268c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C69.3 141 0 184.6 0 273.5 0 300 4.8 327.3 14.5 355.6c12.8 36.6 59 126.2 107.2 124.7 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.1 102.6-118.8-65.2-30.7-61.8-90-57.8-90.5zM255.2 92.5c30.3-36 27.5-68.8 26.6-80.5-26.7 1.5-57.6 18.2-75.2 38.7-19.4 22-30.8 49.2-28.3 78.4 28.9 2.2 55.3-12.6 76.9-36.6z" /></svg>
      ) : (
        <svg viewBox="0 0 512 512" className="h-6 w-6" fill="currentColor"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" /></svg>
      )}
      <span className="text-left leading-tight">
        <span className="block text-[10px] text-white/70">{store === "apple" ? "Download on the" : "GET IT ON"}</span>
        <span className="block text-sm font-bold">{store === "apple" ? "App Store" : "Google Play"}</span>
      </span>
    </a>
  );
}
function SocialIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-neutral-300 transition hover:bg-white/20 hover:text-white">{children}</a>
  );
}

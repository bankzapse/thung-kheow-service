"use client";

import { useEffect, useMemo, useState } from "react";
import { buildFlowA4 } from "@/lib/posters/flowA4";
import { defaultFlowConfig, LINE_ADD_URL, LINE_OA_ID } from "@/lib/posters/defaults";
import { FONTS, fontFaceCssLinked } from "@/lib/posters/fonts";
import { ICON_KEYS, ICONS } from "@/lib/posters/icons";
import { qrDataUri, toDataUri, renderPng, renderPrintBleedPng, downloadBlob, printPng } from "@/lib/posters/render";
import type { FlowConfig } from "@/lib/posters/types";
import { Printer, Download, FileImage, RotateCcw, Loader2 } from "lucide-react";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
    {children}
  </label>
);
const inputCls = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-neutral-200 bg-white p-4">
    <h3 className="mb-3 text-sm font-bold text-neutral-800">{title}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

export default function PosterEditor() {
  const [cfg, setCfg] = useState<FlowConfig>(() => defaultFlowConfig());
  const [lineId, setLineId] = useState(LINE_OA_ID);
  const [busy, setBusy] = useState<string | null>(null);
  const fontCss = useMemo(() => fontFaceCssLinked(), []);

  // สร้าง QR ครั้งแรก + เมื่อเปลี่ยน LINE id
  useEffect(() => {
    const url = `https://line.me/R/ti/p/${lineId}`;
    qrDataUri(lineId === LINE_OA_ID ? LINE_ADD_URL : url).then((qr) => setCfg((c) => ({ ...c, qrUri: qr }))).catch(() => {});
  }, [lineId]);

  const built = useMemo(() => (cfg.qrUri ? buildFlowA4(cfg) : null), [cfg]);

  const patch = (u: Partial<FlowConfig>) => setCfg((c) => ({ ...c, ...u }));
  const patchStep = (i: number, u: Partial<FlowConfig["steps"][number]>) =>
    setCfg((c) => ({ ...c, steps: c.steps.map((s, k) => (k === i ? { ...s, ...u } : s)) }));
  const patchMat = (i: number, u: Partial<FlowConfig["materials"][number]>) =>
    setCfg((c) => ({ ...c, materials: c.materials.map((m, k) => (k === i ? { ...m, ...u } : m)) }));

  const uploadMat = (i: number, file: File) => {
    const fr = new FileReader();
    fr.onload = () => patchMat(i, { img: fr.result as string });
    fr.readAsDataURL(file);
  };

  // เตรียม config ที่ฝังรูปเป็น data URI (สำหรับ export/print)
  const resolveForExport = async (): Promise<FlowConfig> => {
    const logoUri = await toDataUri(cfg.logoUri);
    const materials = await Promise.all(cfg.materials.map(async (m) => ({ ...m, img: await toDataUri(m.img) })));
    return { ...cfg, logoUri, materials };
  };

  const doExport = async (kind: "png" | "print" | "bleed") => {
    try {
      setBusy(kind);
      const exportCfg = await resolveForExport();
      const b = buildFlowA4(exportCfg);
      if (kind === "bleed") {
        const blob = await renderPrintBleedPng(b, cfg.fontFamily);
        downloadBlob(blob, "poster-flow-a4-print.png");
      } else {
        const blob = await renderPng(b, cfg.fontFamily, 3508);
        if (kind === "print") printPng(blob, true);
        else downloadBlob(blob, "poster-flow-a4.png");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาด: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <style dangerouslySetInnerHTML={{ __html: fontCss }} />

      {/* ── พรีวิว + ปุ่ม ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => doExport("print")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} พิมพ์
          </button>
          <button onClick={() => doExport("png")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            {busy === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />} ดาวน์โหลด PNG
          </button>
          <button onClick={() => doExport("bleed")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            {busy === "bleed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} ไฟล์โรงพิมพ์ (bleed+crop)
          </button>
          <button onClick={() => setCfg(defaultFlowConfig())} disabled={!!busy} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50">
            <RotateCcw className="h-4 w-4" /> รีเซ็ต
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-3 shadow-inner">
          {built ? (
            <div className="[&>svg]:h-auto [&>svg]:w-full [&>svg]:rounded-lg" dangerouslySetInnerHTML={{ __html: built.svg }} />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-neutral-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังสร้าง QR…</div>
          )}
        </div>
        <p className="text-xs text-neutral-400">พรีวิวเรนเดอร์สดในเบราว์เซอร์ · ปริ้นแบบไร้ขอบให้เลือก “Borderless / เต็มหน้า” + Scale 100% ที่หน้าเครื่องพิมพ์</p>
      </div>

      {/* ── แผงควบคุม ── */}
      <div className="max-h-[calc(100vh-160px)] space-y-4 overflow-y-auto pr-1 lg:sticky lg:top-4">
        <Section title="ตัวอักษร & สี">
          <Field label="ฟอนต์">
            <select value={cfg.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })} className={inputCls}>
              {FONTS.map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}
            </select>
          </Field>
          <Field label={`ขนาดตัวอักษรรวม: ${Math.round(cfg.scale * 100)}%`}>
            <input type="range" min={0.8} max={1.25} step={0.01} value={cfg.scale} onChange={(e) => patch({ scale: +e.target.value })} className="w-full" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {([["band", "แถบเขียว"], ["circle", "วงกลม"], ["ink", "หัวข้อ"]] as const).map(([k, lb]) => (
              <label key={k} className="text-center text-[11px] text-neutral-500">
                {lb}
                <input type="color" value={cfg.palette[k]} onChange={(e) => patch({ palette: { ...cfg.palette, [k]: e.target.value, ...(k === "band" ? {} : {}) } })} className="mt-1 h-8 w-full cursor-pointer rounded border border-neutral-200" />
              </label>
            ))}
          </div>
        </Section>

        <Section title="หัวโปสเตอร์">
          <Field label="ชื่อ"><input value={cfg.headerTitle} onChange={(e) => patch({ headerTitle: e.target.value })} className={inputCls} /></Field>
          <Field label="คำโปรย"><input value={cfg.headerSubtitle} onChange={(e) => patch({ headerSubtitle: e.target.value })} className={inputCls} /></Field>
          <Field label="ข้อความมุมขวา"><input value={cfg.headerRight} onChange={(e) => patch({ headerRight: e.target.value })} className={inputCls} /></Field>
          <Field label="LINE OA id (สร้าง QR ขั้นตอน 1)"><input value={lineId} onChange={(e) => setLineId(e.target.value)} className={inputCls} /></Field>
        </Section>

        <Section title="ขั้นตอน (5)">
          {cfg.steps.map((s, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 p-3">
              <div className="mb-2 text-xs font-bold text-neutral-400">ขั้นตอน {i + 1}</div>
              <div className="space-y-2">
                <input value={s.title} onChange={(e) => patchStep(i, { title: e.target.value })} className={inputCls} placeholder="หัวข้อ" />
                <input value={s.lines[0] ?? ""} onChange={(e) => patchStep(i, { lines: [e.target.value, s.lines[1] ?? ""] })} className={inputCls} placeholder="บรรทัด 1" />
                <input value={s.lines[1] ?? ""} onChange={(e) => patchStep(i, { lines: [s.lines[0] ?? "", e.target.value] })} className={inputCls} placeholder="บรรทัด 2" />
                {i > 0 && (
                  <div className="flex gap-2">
                    <select value={s.icon} onChange={(e) => patchStep(i, { icon: e.target.value })} className={inputCls}>
                      {ICON_KEYS.map((k) => <option key={k} value={k}>{ICONS[k].label}</option>)}
                    </select>
                    <input type="color" value={s.iconColor} onChange={(e) => patchStep(i, { iconColor: e.target.value })} className="h-9 w-12 shrink-0 cursor-pointer rounded border border-neutral-200" title="สีไอคอน" />
                  </div>
                )}
                {i === 0 && <p className="text-[11px] text-neutral-400">ขั้นตอนแรกเป็น QR (สร้างจาก LINE id ด้านบน)</p>}
              </div>
            </div>
          ))}
        </Section>

        <Section title="วัสดุที่รับ (6)">
          <Field label="หัวข้อ"><input value={cfg.materialsHeading} onChange={(e) => patch({ materialsHeading: e.target.value })} className={inputCls} /></Field>
          <Field label="คำอธิบายย่อย"><input value={cfg.materialsSub} onChange={(e) => patch({ materialsSub: e.target.value })} className={inputCls} /></Field>
          <Field label="ป้ายห้าม (แดง)"><input value={cfg.warnPill} onChange={(e) => patch({ warnPill: e.target.value })} className={inputCls} /></Field>
          {cfg.materials.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <img src={m.img} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-neutral-200 object-cover" />
              <input value={m.label} onChange={(e) => patchMat(i, { label: e.target.value })} className={inputCls} />
              <label className="shrink-0 cursor-pointer rounded-lg border border-neutral-300 px-2 py-2 text-xs text-neutral-600 hover:bg-neutral-50">
                เปลี่ยนรูป
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMat(i, e.target.files[0])} />
              </label>
            </div>
          ))}
        </Section>

        <Section title="แบนเนอร์ลุ้นโชค">
          <Field label="หัวข้อ"><input value={cfg.promo.heading} onChange={(e) => patch({ promo: { ...cfg.promo, heading: e.target.value } })} className={inputCls} /></Field>
          <Field label="คำอธิบาย"><input value={cfg.promo.sub} onChange={(e) => patch({ promo: { ...cfg.promo, sub: e.target.value } })} className={inputCls} /></Field>
          <Field label="ป้าย"><input value={cfg.promo.pill} onChange={(e) => patch({ promo: { ...cfg.promo, pill: e.target.value } })} className={inputCls} /></Field>
        </Section>

        <Section title="คำเตือน & ท้ายโปสเตอร์">
          <Field label="คำเตือนบรรทัด 1"><input value={cfg.legalWarn[0] ?? ""} onChange={(e) => patch({ legalWarn: [e.target.value, cfg.legalWarn[1] ?? ""] })} className={inputCls} /></Field>
          <Field label="คำเตือนบรรทัด 2"><input value={cfg.legalWarn[1] ?? ""} onChange={(e) => patch({ legalWarn: [cfg.legalWarn[0] ?? "", e.target.value] })} className={inputCls} /></Field>
          <Field label="ท้าย: ซ้าย"><input value={cfg.footerLeft} onChange={(e) => patch({ footerLeft: e.target.value })} className={inputCls} /></Field>
          <Field label="ท้าย: กลาง"><input value={cfg.footerCenter} onChange={(e) => patch({ footerCenter: e.target.value })} className={inputCls} /></Field>
          <Field label="ท้าย: ขวา"><input value={cfg.footerRight} onChange={(e) => patch({ footerRight: e.target.value })} className={inputCls} /></Field>
        </Section>
      </div>
    </div>
  );
}

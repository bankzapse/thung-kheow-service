"use client";

import { useEffect, useMemo, useState } from "react";
import { buildFlowA4 } from "@/lib/posters/flowA4";
import { buildFlowWide } from "@/lib/posters/flowWide";
import { buildCabinet } from "@/lib/posters/cabinet";
import { defaultFlowConfig, defaultCabinetConfig, POSTER_SPECS, LINE_OA_ID } from "@/lib/posters/defaults";
import { FONTS, fontFaceCssLinked } from "@/lib/posters/fonts";
import { ICON_KEYS, ICONS } from "@/lib/posters/icons";
import { qrDataUri, toDataUri, renderPng, renderPrintBleedPng, downloadBlob, printPng } from "@/lib/posters/render";
import { addSave, deleteSave, listSaves, savesShared, type PosterSave } from "@/lib/posters/saves";
import type { BuiltSvg, CabinetConfig, CabinetStyles, FlowConfig, FlowStyles, Palette, PosterKind, SectionStyle } from "@/lib/posters/types";
import { Printer, Download, FileImage, RotateCcw, Loader2, Save, Trash2, CornerDownLeft } from "lucide-react";

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
const KINDS: PosterKind[] = ["flow-a4", "flow-wide", "cabinet"];

/** แถวปรับฟอนต์ + สี + ขนาด ต่อ section */
function StyleRow({ style, onChange }: { style: SectionStyle; onChange: (u: Partial<SectionStyle>) => void }) {
  return (
    <div className="mb-1 space-y-2 rounded-lg bg-neutral-50 p-2">
      <div className="flex items-end gap-2">
        <label className="flex-1 text-[11px] text-neutral-500">
          ฟอนต์
          <select value={style.font} onChange={(e) => onChange({ font: e.target.value })} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">ตามค่ารวม</option>
            {FONTS.map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}
          </select>
        </label>
        <label className="text-center text-[11px] text-neutral-500">
          หัวข้อ
          <input type="color" value={style.title} onChange={(e) => onChange({ title: e.target.value })} className="mt-1 block h-8 w-10 cursor-pointer rounded border border-neutral-200" />
        </label>
        <label className="text-center text-[11px] text-neutral-500">
          ข้อความ
          <input type="color" value={style.body} onChange={(e) => onChange({ body: e.target.value })} className="mt-1 block h-8 w-10 cursor-pointer rounded border border-neutral-200" />
        </label>
      </div>
      <label className="block text-[11px] text-neutral-500">
        ขนาดตัวอักษร: {Math.round(style.scale * 100)}%
        <input type="range" min={0.6} max={1.6} step={0.02} value={style.scale} onChange={(e) => onChange({ scale: +e.target.value })} className="w-full" />
      </label>
    </div>
  );
}

export default function PosterEditor({ userName = "ผู้ดูแล" }: { userName?: string }) {
  const [kind, setKind] = useState<PosterKind>("flow-a4");
  const [flow, setFlow] = useState<FlowConfig>(() => defaultFlowConfig());
  const [cab, setCab] = useState<CabinetConfig>(() => defaultCabinetConfig());
  const [lineId, setLineId] = useState(LINE_OA_ID);
  const [qr, setQr] = useState("");
  const [printMargin, setPrintMargin] = useState(0); // ระยะขอบตอนพิมพ์ (มม.) · 0 = ชิดขอบ
  const [busy, setBusy] = useState<string | null>(null);
  const [saves, setSaves] = useState<PosterSave[]>([]);
  const [saveName, setSaveName] = useState("");
  const [savesBusy, setSavesBusy] = useState(false);

  useEffect(() => {
    listSaves().then(setSaves).catch(() => {});
  }, []);
  const fontCss = useMemo(() => fontFaceCssLinked(), []);
  const isCab = kind === "cabinet";
  const spec = POSTER_SPECS[kind];

  useEffect(() => {
    const url = `https://line.me/R/ti/p/${lineId}`;
    // cabinet ใช้ dark ให้เข้ากับพื้นขาว (เหมือน A4)
    qrDataUri(url).then(setQr).catch(() => {});
  }, [lineId]);

  // config ปัจจุบัน (ฝัง qr + lineId ตอน build)
  const built: BuiltSvg | null = useMemo(() => {
    if (!qr) return null;
    if (kind === "cabinet") return buildCabinet({ ...cab, qrUri: qr, lineId });
    const b = { ...flow, qrUri: qr };
    return kind === "flow-wide" ? buildFlowWide(b) : buildFlowA4(b);
  }, [kind, flow, cab, qr, lineId]);

  // shared font/size/palette helpers (ทำงานทั้ง flow และ cabinet)
  const font = isCab ? cab.fontFamily : flow.fontFamily;
  const scale = isCab ? cab.scale : flow.scale;
  const palette = isCab ? cab.palette : flow.palette;
  const setFont = (v: string) => (isCab ? setCab((c) => ({ ...c, fontFamily: v })) : setFlow((c) => ({ ...c, fontFamily: v })));
  const setScale = (v: number) => (isCab ? setCab((c) => ({ ...c, scale: v })) : setFlow((c) => ({ ...c, scale: v })));
  const setPalette = (k: keyof Palette, v: string) =>
    isCab ? setCab((c) => ({ ...c, palette: { ...c.palette, [k]: v } })) : setFlow((c) => ({ ...c, palette: { ...c.palette, [k]: v } }));

  const patchF = (u: Partial<FlowConfig>) => setFlow((c) => ({ ...c, ...u }));
  const patchStep = (i: number, u: Partial<FlowConfig["steps"][number]>) =>
    setFlow((c) => ({ ...c, steps: c.steps.map((s, k) => (k === i ? { ...s, ...u } : s)) }));
  const patchMat = (i: number, u: Partial<FlowConfig["materials"][number]>) =>
    setFlow((c) => ({ ...c, materials: c.materials.map((m, k) => (k === i ? { ...m, ...u } : m)) }));
  const uploadMat = (i: number, file: File) => {
    const fr = new FileReader();
    fr.onload = () => patchMat(i, { img: fr.result as string });
    fr.readAsDataURL(file);
  };
  const patchC = (u: Partial<CabinetConfig>) => setCab((c) => ({ ...c, ...u }));
  const patchCStep = (i: number, u: Partial<CabinetConfig["steps"][number]>) =>
    setCab((c) => ({ ...c, steps: c.steps.map((s, k) => (k === i ? { ...s, ...u } : s)) }));
  const setFStyle = (sec: keyof FlowStyles, u: Partial<SectionStyle>) =>
    setFlow((c) => ({ ...c, styles: { ...c.styles, [sec]: { ...c.styles[sec], ...u } } }));
  const setCStyle = (sec: keyof CabinetStyles, u: Partial<SectionStyle>) =>
    setCab((c) => ({ ...c, styles: { ...c.styles, [sec]: { ...c.styles[sec], ...u } } }));

  const resolveExport = async (): Promise<BuiltSvg> => {
    if (kind === "cabinet") {
      const logoUri = await toDataUri(cab.logoUri);
      return buildCabinet({ ...cab, logoUri, qrUri: qr, lineId });
    }
    const logoUri = await toDataUri(flow.logoUri);
    const materials = await Promise.all(flow.materials.map(async (m) => ({ ...m, img: await toDataUri(m.img) })));
    const b = { ...flow, logoUri, materials, qrUri: qr };
    return kind === "flow-wide" ? buildFlowWide(b) : buildFlowA4(b);
  };

  // ฟอนต์ทุกตัวที่ใช้จริง (รวม + ราย section) — ต้องฝังครบตอน export ไม่งั้น section ที่ตั้งฟอนต์ต่างจะตกฟอนต์
  const usedFonts = (): string[] => {
    const styles: SectionStyle[] = Object.values(isCab ? cab.styles : flow.styles);
    return [...new Set([font, ...styles.map((s) => s.font).filter(Boolean)])];
  };

  const doExport = async (mode: "png" | "print" | "bleed") => {
    try {
      setBusy(mode);
      const b = await resolveExport();
      const fonts = usedFonts();
      if (mode === "bleed") {
        const blob = await renderPrintBleedPng(b, fonts, spec.targetW, spec.physWidthMm);
        downloadBlob(blob, `${spec.file}-print.png`);
      } else {
        const blob = await renderPng(b, fonts, spec.targetW);
        if (mode === "print") printPng(blob, spec.landscape, printMargin);
        else downloadBlob(blob, `${spec.file}.png`);
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาด: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const resetCurrent = () => (isCab ? setCab(defaultCabinetConfig()) : setFlow(defaultFlowConfig()));

  const doSave = async () => {
    try {
      setSavesBusy(true);
      const name = saveName.trim() || `${spec.label} · ${new Date().toLocaleString("th-TH")}`;
      const list = await addSave({ kind, name, config: isCab ? cab : flow, savedBy: userName });
      setSaves(list);
      setSaveName("");
    } catch (e) {
      alert("บันทึกไม่สำเร็จ: " + (e as Error).message);
    } finally {
      setSavesBusy(false);
    }
  };
  const restoreSave = (s: PosterSave) => {
    if (s.kind === "cabinet") {
      const d = defaultCabinetConfig();
      const c = s.config as CabinetConfig;
      const styles: CabinetStyles = {
        header: { ...d.styles.header, ...c.styles?.header },
        steps: { ...d.styles.steps, ...c.styles?.steps },
        footer: { ...d.styles.footer, ...c.styles?.footer },
      };
      setKind("cabinet");
      setCab({ ...d, ...c, palette: { ...d.palette, ...c.palette }, styles });
    } else {
      const d = defaultFlowConfig();
      const c = s.config as FlowConfig;
      const styles: FlowStyles = {
        header: { ...d.styles.header, ...c.styles?.header },
        steps: { ...d.styles.steps, ...c.styles?.steps },
        materials: { ...d.styles.materials, ...c.styles?.materials },
        promo: { ...d.styles.promo, ...c.styles?.promo },
        footer: { ...d.styles.footer, ...c.styles?.footer },
      };
      setKind(s.kind);
      setFlow({ ...d, ...c, palette: { ...d.palette, ...c.palette }, styles });
    }
  };
  const removeSave = async (id: string) => {
    try {
      setSavesBusy(true);
      setSaves(await deleteSave(id));
    } catch (e) {
      alert("ลบไม่สำเร็จ: " + (e as Error).message);
    } finally {
      setSavesBusy(false);
    }
  };
  const shortTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <style dangerouslySetInnerHTML={{ __html: fontCss }} />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === k ? "bg-brand-600 text-white" : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"}`}>
              {POSTER_SPECS[k].label}
            </button>
          ))}
        </div>

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
          <button onClick={resetCurrent} disabled={!!busy} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50">
            <RotateCcw className="h-4 w-4" /> รีเซ็ต
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          <span className="font-medium">ระยะขอบตอนพิมพ์</span>
          <input type="number" min={0} max={30} step={1} value={printMargin} onChange={(e) => setPrintMargin(Math.min(30, Math.max(0, Math.round(+e.target.value || 0))))} className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5" />
          <span className="text-neutral-400">มม. · 0 = ชิดขอบ (ต้องเปิด “ไร้ขอบ/Borderless” ที่เครื่องพิมพ์)</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-3 shadow-inner">
          {built ? (
            <div className={`mx-auto ${isCab ? "max-w-[520px]" : ""} [&>svg]:h-auto [&>svg]:w-full [&>svg]:rounded-lg`} dangerouslySetInnerHTML={{ __html: built.svg }} />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-neutral-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังสร้าง QR…</div>
          )}
        </div>
        <p className="text-xs text-neutral-400">พรีวิวเรนเดอร์สดในเบราว์เซอร์ · ปริ้นไร้ขอบให้เลือก “Borderless / เต็มหน้า” + Scale 100% · ไฟล์โรงพิมพ์มี bleed+crop marks</p>
      </div>

      <div className="max-h-[calc(100vh-160px)] space-y-4 overflow-y-auto pr-1 lg:sticky lg:top-4">
        <Section title="บันทึกการแก้ไข">
          <div className="flex gap-2">
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="ตั้งชื่อเวอร์ชัน (ไม่บังคับ)" className={inputCls} />
            <button onClick={doSave} disabled={savesBusy} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {savesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} บันทึก
            </button>
          </div>
          <p className="text-[11px] text-neutral-400">{savesShared ? "เก็บบน Supabase · แชร์ทุก admin" : "เก็บในเบราว์เซอร์นี้ (ยังไม่ได้ตั้ง Supabase)"}</p>
          {saves.length === 0 ? (
            <p className="text-xs text-neutral-400">ยังไม่มีเวอร์ชันที่บันทึก</p>
          ) : (
            <ul className="space-y-2">
              {saves.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-neutral-800">{s.name}</div>
                    <div className="truncate text-[11px] text-neutral-400">{POSTER_SPECS[s.kind].label} · {s.savedBy} · {shortTime(s.savedAt)}</div>
                  </div>
                  <button onClick={() => restoreSave(s)} title="ใช้เวอร์ชันนี้" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"><CornerDownLeft className="h-3.5 w-3.5" /> ใช้</button>
                  <button onClick={() => removeSave(s.id)} title="ลบ" className="shrink-0 rounded-md border border-neutral-300 p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="ตัวอักษร & สี">
          <Field label="ฟอนต์">
            <select value={font} onChange={(e) => setFont(e.target.value)} className={inputCls}>
              {FONTS.map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}
            </select>
          </Field>
          <Field label={`ขนาดตัวอักษรรวม: ${Math.round(scale * 100)}%`}>
            <input type="range" min={0.8} max={1.25} step={0.01} value={scale} onChange={(e) => setScale(+e.target.value)} className="w-full" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {(isCab ? ([["circle", "เขียวอ่อน"], ["band", "เขียวกลาง"], ["ink", "—"]] as const) : ([["band", "แถบเขียว"], ["circle", "วงกลม"], ["ink", "หัวข้อ"]] as const)).map(([k, lb]) => (
              <label key={k} className="text-center text-[11px] text-neutral-500">
                {lb}
                <input type="color" value={palette[k]} onChange={(e) => setPalette(k, e.target.value)} className="mt-1 h-8 w-full cursor-pointer rounded border border-neutral-200" />
              </label>
            ))}
          </div>
          <Field label="LINE OA id (สร้าง QR)"><input value={lineId} onChange={(e) => setLineId(e.target.value)} className={inputCls} /></Field>
        </Section>

        {!isCab && (
          <>
            <Section title="หัวโปสเตอร์">
              <StyleRow style={flow.styles.header} onChange={(u) => setFStyle("header", u)} />
              <Field label="ชื่อ"><input value={flow.headerTitle} onChange={(e) => patchF({ headerTitle: e.target.value })} className={inputCls} /></Field>
              <Field label="คำโปรย"><input value={flow.headerSubtitle} onChange={(e) => patchF({ headerSubtitle: e.target.value })} className={inputCls} /></Field>
              <Field label="ข้อความมุมขวา"><input value={flow.headerRight} onChange={(e) => patchF({ headerRight: e.target.value })} className={inputCls} /></Field>
            </Section>
            <Section title="ขั้นตอน (5)">
              <StyleRow style={flow.styles.steps} onChange={(u) => setFStyle("steps", u)} />
              {flow.steps.map((s, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 p-3">
                  <div className="mb-2 text-xs font-bold text-neutral-400">ขั้นตอน {i + 1}{i === 0 ? " (QR)" : ""}</div>
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
                  </div>
                </div>
              ))}
            </Section>
            <Section title="วัสดุที่รับ (6)">
              <StyleRow style={flow.styles.materials} onChange={(u) => setFStyle("materials", u)} />
              <Field label="หัวข้อ"><input value={flow.materialsHeading} onChange={(e) => patchF({ materialsHeading: e.target.value })} className={inputCls} /></Field>
              <Field label="คำอธิบายย่อย"><input value={flow.materialsSub} onChange={(e) => patchF({ materialsSub: e.target.value })} className={inputCls} /></Field>
              <Field label="ป้ายห้าม (แดง)"><input value={flow.warnPill} onChange={(e) => patchF({ warnPill: e.target.value })} className={inputCls} /></Field>
              {flow.materials.map((m, i) => (
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
              <StyleRow style={flow.styles.promo} onChange={(u) => setFStyle("promo", u)} />
              <Field label="หัวข้อ"><input value={flow.promo.heading} onChange={(e) => patchF({ promo: { ...flow.promo, heading: e.target.value } })} className={inputCls} /></Field>
              <Field label="คำอธิบาย"><input value={flow.promo.sub} onChange={(e) => patchF({ promo: { ...flow.promo, sub: e.target.value } })} className={inputCls} /></Field>
              <Field label="ป้าย"><input value={flow.promo.pill} onChange={(e) => patchF({ promo: { ...flow.promo, pill: e.target.value } })} className={inputCls} /></Field>
            </Section>
            <Section title="คำเตือน & ท้ายโปสเตอร์">
              <StyleRow style={flow.styles.footer} onChange={(u) => setFStyle("footer", u)} />
              <p className="text-[11px] text-neutral-400">“หัวข้อ” = สีคำเตือน · “ข้อความ” = สีท้ายโปสเตอร์</p>
              <Field label="คำเตือนบรรทัด 1"><input value={flow.legalWarn[0] ?? ""} onChange={(e) => patchF({ legalWarn: [e.target.value, flow.legalWarn[1] ?? ""] })} className={inputCls} /></Field>
              <Field label="คำเตือนบรรทัด 2"><input value={flow.legalWarn[1] ?? ""} onChange={(e) => patchF({ legalWarn: [flow.legalWarn[0] ?? "", e.target.value] })} className={inputCls} /></Field>
              <Field label="ท้าย: ซ้าย"><input value={flow.footerLeft} onChange={(e) => patchF({ footerLeft: e.target.value })} className={inputCls} /></Field>
              <Field label="ท้าย: กลาง"><input value={flow.footerCenter} onChange={(e) => patchF({ footerCenter: e.target.value })} className={inputCls} /></Field>
              <Field label="ท้าย: ขวา"><input value={flow.footerRight} onChange={(e) => patchF({ footerRight: e.target.value })} className={inputCls} /></Field>
            </Section>
          </>
        )}

        {isCab && (
          <>
            <Section title="หัวโปสเตอร์">
              <StyleRow style={cab.styles.header} onChange={(u) => setCStyle("header", u)} />
              <Field label="ชื่อแบรนด์"><input value={cab.brand} onChange={(e) => patchC({ brand: e.target.value })} className={inputCls} /></Field>
              <Field label="พาดหัว"><input value={cab.headline} onChange={(e) => patchC({ headline: e.target.value })} className={inputCls} /></Field>
              <Field label="คำโปรย"><input value={cab.subheadline} onChange={(e) => patchC({ subheadline: e.target.value })} className={inputCls} /></Field>
              <Field label="ข้อความเหนือ QR"><input value={cab.qrCaption} onChange={(e) => patchC({ qrCaption: e.target.value })} className={inputCls} /></Field>
            </Section>
            <Section title="ขั้นตอน (4)">
              <StyleRow style={cab.styles.steps} onChange={(u) => setCStyle("steps", u)} />
              {cab.steps.map((s, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 p-3">
                  <div className="mb-2 text-xs font-bold text-neutral-400">ขั้นตอน {s.n}</div>
                  <div className="space-y-2">
                    <input value={s.title} onChange={(e) => patchCStep(i, { title: e.target.value })} className={inputCls} placeholder="หัวข้อ" />
                    <input value={s.sub} onChange={(e) => patchCStep(i, { sub: e.target.value })} className={inputCls} placeholder="คำอธิบาย" />
                  </div>
                </div>
              ))}
            </Section>
            <Section title="ท้ายโปสเตอร์">
              <StyleRow style={cab.styles.footer} onChange={(u) => setCStyle("footer", u)} />
              <Field label="บรรทัดท้าย"><input value={cab.footer} onChange={(e) => patchC({ footer: e.target.value })} className={inputCls} /></Field>
              <Field label="เว็บไซต์"><input value={cab.site} onChange={(e) => patchC({ site: e.target.value })} className={inputCls} /></Field>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

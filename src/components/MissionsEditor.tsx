"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { activeMissions, MISSIONS, METRIC_UNIT, METRIC_LABEL } from "@/lib/rewards";
import type { Mission, MissionMetric } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Target, Plus, Trash2, Save, RotateCcw, CheckCircle2 } from "lucide-react";

const METRICS: MissionMetric[] = ["bags", "categories", "weight"];

/** บริษัทตั้งภารกิจ (กิจกรรม + แต้ม) ได้เอง — หน้าแอดมิน */
export function MissionsEditor() {
  const { db, setMissions } = useStore();
  const [rows, setRows] = useState<Mission[]>(() => activeMissions(db).map((m) => ({ ...m })));
  const [saved, setSaved] = useState(false);

  const patch = (i: number, k: keyof Mission, v: string | number) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
    setSaved(false);
  };
  const addRow = () => {
    setRows((r) => [...r, { key: uid("m-"), label: "", desc: "", target: 1, reward: 10, metric: "bags", unit: "ถุง" }]);
    setSaved(false);
  };
  const removeRow = (i: number) => {
    setRows((r) => r.filter((_, idx) => idx !== i));
    setSaved(false);
  };
  const save = () => {
    const clean = rows
      .filter((r) => r.label.trim())
      .map((r) => ({ ...r, label: r.label.trim(), desc: r.desc?.trim() || "", target: Math.max(1, Number(r.target) || 1), reward: Math.max(0, Number(r.reward) || 0), unit: METRIC_UNIT[r.metric] }));
    setMissions(clean);
    setRows(clean.map((m) => ({ ...m })));
    setSaved(true);
  };
  const reset = () => {
    setRows(MISSIONS.map((m) => ({ ...m })));
    setSaved(false);
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 font-bold text-neutral-800"><Target className="h-4 w-4 text-brand-600" /> จัดการภารกิจ</h2>
          <p className="text-xs text-neutral-400">บริษัทกำหนดกิจกรรม + แต้มที่ผู้ขายจะได้ (มีผลทันทีกับทุกคน)</p>
        </div>
        <button className="btn-ghost !px-2 text-xs text-neutral-500" onClick={reset} title="คืนค่าเริ่มต้น">
          <RotateCcw className="h-3.5 w-3.5" /> ค่าเริ่มต้น
        </button>
      </div>

      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={r.key} className="rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
            <div className="flex items-start gap-2">
              <input
                className="input flex-1"
                placeholder="ชื่อภารกิจ (เช่น หย่อนครบ 5 ถุง)"
                value={r.label}
                onChange={(e) => patch(i, "label", e.target.value)}
              />
              <button className="mt-2 shrink-0 text-neutral-300 hover:text-red-500" onClick={() => removeRow(i)} title="ลบภารกิจ">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div>
                <label className="label !text-[11px]">วัดจาก</label>
                <select className="input !py-1.5 text-sm" value={r.metric} onChange={(e) => patch(i, "metric", e.target.value as MissionMetric)}>
                  {METRICS.map((m) => <option key={m} value={m}>{METRIC_LABEL[m]}</option>)}
                </select>
              </div>
              <div className="w-24">
                <label className="label !text-[11px]">ทำครบ ({METRIC_UNIT[r.metric]})</label>
                <input className="input !py-1.5 text-sm" inputMode="numeric" value={r.target || ""} onChange={(e) => patch(i, "target", Number(e.target.value.replace(/\D/g, "")) || 0)} />
              </div>
              <div className="w-24">
                <label className="label !text-[11px]">ได้แต้ม</label>
                <input className="input !py-1.5 text-sm" inputMode="numeric" value={r.reward || ""} onChange={(e) => patch(i, "reward", Number(e.target.value.replace(/\D/g, "")) || 0)} />
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="py-3 text-center text-sm text-neutral-400">ยังไม่มีภารกิจ — กด “เพิ่มภารกิจ”</p>}
      </div>

      <button className="btn-outline w-full !border-dashed" onClick={addRow}>
        <Plus className="h-4 w-4" /> เพิ่มภารกิจ
      </button>

      <div className="flex items-center gap-2 border-t border-neutral-100 pt-3">
        {saved ? (
          <span className="flex flex-1 items-center gap-1.5 text-sm font-medium text-brand-600"><CheckCircle2 className="h-4 w-4" /> บันทึกแล้ว</span>
        ) : (
          <span className="flex-1 text-xs text-neutral-400">แก้แล้วอย่าลืมกดบันทึก</span>
        )}
        <button className="btn-primary" onClick={save}>
          <Save className="h-4 w-4" /> บันทึกภารกิจ
        </button>
      </div>
    </div>
  );
}

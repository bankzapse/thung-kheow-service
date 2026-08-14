import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";
import type { CabinetConfig, FlowConfig, PosterKind } from "./types";

/** บันทึกการแก้ไขโปสเตอร์ 1 เวอร์ชัน (เก็บใน app_config key='poster_saves' — แชร์ทุก admin) */
export interface PosterSave {
  id: string;
  kind: PosterKind;
  name: string;
  config: FlowConfig | CabinetConfig;
  savedBy: string;
  savedAt: string; // ISO
}

const KEY = "poster_saves";
const LS = "tk_poster_saves"; // fallback โหมดเดโม/ยังไม่ตั้ง Supabase
const MAX = 40;

/** true = เก็บบน Supabase (แชร์), false = localStorage เครื่องนี้ */
export const savesShared = supabaseConfigured;

function lsRead(): PosterSave[] {
  try {
    const a = JSON.parse(localStorage.getItem(LS) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export async function listSaves(): Promise<PosterSave[]> {
  if (!supabaseConfigured) return lsRead();
  try {
    const sb = createClient();
    const { data } = await sb.from("app_config").select("value").eq("key", KEY).maybeSingle();
    const arr = (data?.value as PosterSave[] | null) ?? [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function persist(list: PosterSave[]): Promise<PosterSave[]> {
  const trimmed = list.slice(0, MAX);
  if (!supabaseConfigured) {
    localStorage.setItem(LS, JSON.stringify(trimmed));
    return trimmed;
  }
  const sb = createClient();
  const { error } = await sb.from("app_config").upsert({ key: KEY, value: trimmed as unknown as Json, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return trimmed;
}

export async function addSave(input: Omit<PosterSave, "id" | "savedAt">): Promise<PosterSave[]> {
  const cur = await listSaves();
  const rec: PosterSave = { ...input, id: crypto.randomUUID(), savedAt: new Date().toISOString() };
  return persist([rec, ...cur]);
}

export async function deleteSave(id: string): Promise<PosterSave[]> {
  const cur = await listSaves();
  return persist(cur.filter((x) => x.id !== id));
}

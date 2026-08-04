import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/supabase/audit";
import type { Database } from "@/lib/supabase/database.types";
import { usernameToEmail } from "@/lib/username";

export const runtime = "nodejs";

/**
 * แผนที่ action → สรุป audit (เฉพาะที่อ่อนไหว) — บันทึกเมื่อ action สำเร็จเท่านั้น
 * ⚠️ ห้ามใส่ PII อ่อนไหว (เบอร์/รหัสผ่าน) — เก็บแค่ตัวระบุ + สรุปสั้น
 */
type AuditMeta = { targetType?: string; targetId?: string; summary: string };
const str = (v: unknown) => (v == null || v === "" ? undefined : String(v));
const AUDITABLE: Record<string, (b: Record<string, unknown>) => AuditMeta> = {
  verifySellerPhone: (b) => ({ targetType: "profile", targetId: str(b.userId), summary: "ยืนยันเบอร์ผู้ขาย" }),
  closeMonthlyBonus: (b) => ({ targetType: "month", targetId: str(b.month), summary: `ปิดยอดโบนัสประจำเดือน ${str(b.month) ?? ""}` }),
  updateCabinet: (b) => ({ targetType: "cabinet", targetId: str(b.cabinetId), summary: "แก้ข้อมูลตู้" }),
  setCabinetLocation: (b) => ({ targetType: "cabinet", targetId: str(b.cabinetId), summary: "ปักพิกัดตู้" }),
  createFranchise: (b) => ({ targetType: "franchise", targetId: str(b.code), summary: `สร้างแฟรนไชส์ ${str(b.code) ?? ""}` }),
  updateFranchise: (b) => ({ targetType: "franchise", targetId: str(b.franchiseId), summary: "แก้ข้อมูลแฟรนไชส์" }),
  removeFranchise: (b) => ({ targetType: "franchise", targetId: str(b.franchiseId), summary: "ลบแฟรนไชส์ (รวมตู้ + บัญชีเจ้าของ)" }),
  createCenter: (b) => ({ targetType: "profile", summary: `สร้างบัญชีศูนย์คัดแยก ${str(b.name) ?? ""}` }),
  updateCenter: (b) => ({ targetType: "profile", targetId: str(b.userId), summary: "แก้บัญชีศูนย์คัดแยก" }),
  removeCenter: (b) => ({ targetType: "profile", targetId: str(b.userId), summary: "ลบบัญชีศูนย์คัดแยก" }),
  removeSeller: (b) => ({ targetType: "profile", targetId: str(b.userId), summary: "ลบบัญชีผู้ขาย" }),
  resetSellerPassword: (b) => ({ targetType: "profile", targetId: str(b.userId), summary: "รีเซ็ตรหัสผ่านผู้ขาย" }),
  createAdmin: (b) => ({ targetType: "profile", summary: `สร้างบัญชีผู้ดูแล ${str(b.name) ?? ""}` }),
  setAdminPermissions: (b) => ({ targetType: "profile", targetId: str(b.userId), summary: "ตั้งสิทธิ์ผู้ดูแล" }),
  removeAdmin: (b) => ({ targetType: "profile", targetId: str(b.userId), summary: "ลบบัญชีผู้ดูแล" }),
};

/**
 * จัดการบัญชีศูนย์คัดแยก (buyer) + ผู้ดูแล (admin) ฝั่งบริษัท
 * - ตรวจ session ผู้เรียก → ต้องเป็น admin (บาง action ต้องเป็น owner)
 * - ใช้ service_role สร้าง/ลบ auth user + อัปเดต profile (bypass RLS)
 * ใช้เฉพาะเมื่อเปิด Supabase (มี env) — โหมดเดโมจัดการใน localStorage เอง
 */

const toE164 = (p: string) => "+66" + String(p || "").trim().replace(/^0/, "");
const bad = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

/**
 * 🔒 ยืนยันว่าเป้าหมายเป็นบัญชีศูนย์คัดแยก (buyer) จริง และไม่ใช่เจ้าของระบบ
 * ใช้ก่อนเรียก admin.auth.admin.* ซึ่ง bypass RLS และไม่มี scope ของตัวเอง
 * คืน NextResponse เมื่อไม่ผ่าน (ให้ caller return ต่อ) · คืน null เมื่อผ่าน
 */
async function assertBuyerTarget(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from("profiles").select("role, owner").eq("id", userId).single();
  const t = data as { role?: string; owner?: boolean } | null;
  if (!t) return bad("ไม่พบบัญชีนี้", 404);
  if (t.owner === true) return bad("แก้ไข/ลบบัญชีเจ้าของระบบไม่ได้", 403);
  if (t.role !== "buyer") return bad("แก้ไข/ลบได้เฉพาะบัญชีศูนย์คัดแยก", 403);
  return null;
}

export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return bad("not enabled", 404);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const caller = auth?.user;
  if (!caller) return bad("unauthorized", 401);

  const { data: me } = await supabase.from("profiles").select("role, roles, owner").eq("id", caller.id).single();
  const meRow = me as { role?: string; roles?: string[]; owner?: boolean } | null;
  // อนุญาตถ้าเป็นเจ้าของระบบ หรือมีบทบาท admin (บทบาทหลักหรืออยู่ใน roles) — กันกรณี active role ถูกสลับเป็นอย่างอื่น
  const isAdmin = !!meRow && (meRow.owner === true || meRow.role === "admin" || (Array.isArray(meRow.roles) && meRow.roles.includes("admin")));
  if (!isAdmin) return bad("forbidden", 403);
  const isOwner = !!meRow?.owner;

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;
  const admin = createAdminClient();
  const table = <T extends keyof Database["public"]["Tables"]>(n: T) => admin.from(n);

  const run = async (): Promise<NextResponse> => {
   try {
    switch (action) {
      case "verifySellerPhone": {
        // แอดมินยืนยันเบอร์ให้ผู้ขาย (fallback เคส OTP ส่งไม่ถึง เช่น เบอร์ตั้ง anti-spam)
        const { userId } = body;
        if (!userId) return bad("missing userId");
        const { data: prof } = await table("profiles").select("role").eq("id", userId).maybeSingle();
        if (!prof || prof.role !== "seller") return bad("ยืนยันได้เฉพาะบัญชีผู้ขาย");
        const { error } = await table("profiles").update({ phone_verified: true }).eq("id", userId);
        if (error) return bad(error.message ?? "ยืนยันเบอร์ไม่สำเร็จ");
        return NextResponse.json({ ok: true });
      }
      case "closeMonthlyBonus": {
        // ปิดยอดโบนัสประจำเดือน — เครดิตแต้มโบนัสให้ผู้ขายทีเดียว (points ถูก guard → ใช้ service-role)
        // กันจ่ายซ้ำด้วยโน้ต "โบนัสประจำเดือน YYYY-MM" (ถ้ามีแล้ว = ปิดยอดไปแล้ว)
        const { month, credits } = body;
        if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return bad("รูปแบบเดือนไม่ถูกต้อง");
        const note = `โบนัสประจำเดือน ${month}`;
        const { data: existing } = await table("point_transactions").select("id").eq("note", note).limit(1);
        if (existing?.length) return bad("ปิดยอดโบนัสเดือนนี้ไปแล้ว");
        const rows = (Array.isArray(credits) ? credits : []).filter((c) => c && c.userId && Number(c.points) > 0);
        let count = 0;
        let total = 0;
        for (const c of rows) {
          const pts = Math.min(Math.round(Number(c.points)), 100000); // กันค่าผิดปกติ
          if (pts <= 0) continue;
          const { data: prof } = await table("profiles").select("points, role").eq("id", c.userId).maybeSingle();
          if (!prof || prof.role !== "seller") continue; // จ่ายเฉพาะบัญชีผู้ขายจริง
          const bal = Number(prof.points ?? 0) + pts;
          const { error: e1 } = await table("profiles").update({ points: bal }).eq("id", c.userId);
          if (e1) continue;
          await table("point_transactions").insert({ user_id: c.userId, type: "adjust", points: pts, balance_after: bal, note });
          count++;
          total += pts;
        }
        return NextResponse.json({ ok: true, count, total });
      }
      case "updateCabinet": {
        // แก้ข้อมูลตู้ (ชื่อ/ที่อยู่/จังหวัด/อำเภอ/ตำบล) — cabinets เขียนตรงไม่ได้ (RLS อ่านอย่างเดียว)
        const { cabinetId, name, address, province, district, subdistrict } = body;
        if (!cabinetId) return bad("missing cabinetId");
        const patch: Record<string, unknown> = {};
        if (name != null) patch.name = String(name).trim();
        if (address != null) patch.address = String(address).trim();
        if (province != null) patch.province = String(province).trim() || null;
        if (district != null) patch.district = String(district).trim() || null;
        if (subdistrict != null) patch.subdistrict = String(subdistrict).trim() || null;
        if (!Object.keys(patch).length) return NextResponse.json({ ok: true });
        const { error } = await table("cabinets").update(patch as Database["public"]["Tables"]["cabinets"]["Update"]).eq("id", cabinetId);
        if (error) return bad(error.message ?? "บันทึกข้อมูลตู้ไม่สำเร็จ");
        return NextResponse.json({ ok: true });
      }
      case "setCabinetLocation": {
        // ปักพิกัดตู้ (แก้ตู้เดิมที่ยังไม่มีพิกัด) — cabinets เขียนตรงไม่ได้ (RLS อ่านอย่างเดียว)
        // จึงอัปเดตผ่าน service-role ที่นี่ · จำกัดเฉพาะ admin (ตรวจไว้ด้านบนแล้ว)
        const { cabinetId, lat, lng } = body;
        if (!cabinetId || !Number.isFinite(lat) || !Number.isFinite(lng)) return bad("พิกัดไม่ครบ");
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return bad("พิกัดไม่ถูกต้อง");
        const { error } = await table("cabinets").update({ lat, lng }).eq("id", cabinetId);
        if (error) return bad(error.message ?? "บันทึกตำแหน่งไม่สำเร็จ");
        return NextResponse.json({ ok: true });
      }
      case "createFranchise": {
        // เข้าระบบด้วย "ชื่อผู้ใช้" (username → email ภายใน) · เบอร์เป็นแค่ข้อมูลติดต่อ
        const { code, name, ownerName, username, phone, password } = body;
        const uname = String(username || "").trim().toLowerCase();
        const email = usernameToEmail(uname);
        const contact = String(phone || "").trim();
        if (!code?.trim() || !email || String(password || "").length < 8) return bad("ข้อมูลไม่ครบ (ชื่อผู้ใช้ 3–32 ตัว + รหัสผ่าน ≥8)");
        if (contact && !/^0\d{8,9}$/.test(contact)) return bad("เบอร์ติดต่อไม่ถูกต้อง (10 หลัก ขึ้นต้น 0)");
        // กันชื่อผู้ใช้ซ้ำ (unique index อยู่ที่ lower(username) แล้ว แต่เช็คก่อนให้ error อ่านง่าย)
        const { data: dup } = await table("profiles").select("id").eq("username", uname).maybeSingle();
        if (dup) return bad("ชื่อผู้ใช้นี้มีแล้ว");
        const frName = String(name || code).trim();
        const owner = String(ownerName || frName).trim();
        const { data: fr, error: eF } = await table("franchises").insert({ code: String(code).toUpperCase(), name: frName, owner_name: owner, phone: contact || null }).select("id").single();
        if (eF || !fr) return bad(/duplicate|unique/i.test(eF?.message ?? "") ? "อักษรย่อแฟรนไชส์นี้มีแล้ว" : (eF?.message ?? "สร้างแฟรนไชส์ไม่สำเร็จ"));
        const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: owner, role: "franchise" } });
        if (error || !created?.user) {
          await table("franchises").delete().eq("id", fr.id);
          return bad(/registered|duplicate|exists/i.test(error?.message ?? "") ? "ชื่อผู้ใช้นี้มีแล้ว" : (error?.message ?? "สร้างบัญชีเจ้าของไม่สำเร็จ"));
        }
        const { error: eP } = await table("profiles")
          .update({ role: "franchise", name: owner, franchise_id: fr.id, username: uname, ...(contact ? { phone: contact } : {}) })
          .eq("id", created.user.id);
        if (eP) { await admin.auth.admin.deleteUser(created.user.id).catch(() => {}); await table("franchises").delete().eq("id", fr.id); return bad("ตั้งค่าบัญชีเจ้าของไม่สำเร็จ"); }
        return NextResponse.json({ ok: true, id: fr.id });
      }
      case "updateFranchise": {
        const { franchiseId, name, ownerName, password, username } = body;
        if (!franchiseId) return bad("missing franchiseId");
        const newPhone = body.phone != null && body.phone !== "" ? String(body.phone).trim() : "";
        if (newPhone && !/^0\d{8,9}$/.test(newPhone)) return bad("เบอร์ไม่ถูกต้อง (10 หลัก)");
        if (password != null && password !== "" && String(password).length < 8) return bad("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
        // 1) แก้ข้อมูลแฟรนไชส์ (ชื่อ/เจ้าของ/เบอร์ติดต่อ)
        const frPatch: Record<string, unknown> = {};
        if (name != null) frPatch.name = String(name).trim();
        if (ownerName != null) frPatch.owner_name = String(ownerName).trim();
        if (newPhone) frPatch.phone = newPhone;
        if (Object.keys(frPatch).length) await table("franchises").update(frPatch as Database["public"]["Tables"]["franchises"]["Update"]).eq("id", franchiseId);
        // 2) แก้บัญชีเข้าระบบของเจ้าของแฟรนไชส์ (role=franchise ที่ผูกกับแฟรนไชส์นี้)
        const { data: owners } = await table("profiles").select("id").eq("franchise_id", franchiseId).eq("role", "franchise");
        const ownerId = (owners as { id: string }[] | null)?.[0]?.id;
        if (ownerId) {
          // เปลี่ยนรหัสผ่าน — แยกจากเบอร์ เพื่อไม่ให้เบอร์ชนแล้วรหัสผ่านพังตาม
          if (password) {
            const { error } = await admin.auth.admin.updateUserById(ownerId, { password: String(password) });
            if (error) return bad(error.message, 500);
          }
          // เปลี่ยนเบอร์เข้าระบบ เฉพาะเมื่อ "ต่างจากเบอร์ปัจจุบัน" (กันชนเบอร์ตัวเองแล้ว error)
          if (newPhone) {
            const { data: cur } = await admin.auth.admin.getUserById(ownerId);
            const curPhone = cur?.user?.phone ?? ""; // GoTrue คืน E164 ไม่มี + เช่น 66800000001
            const targetBare = toE164(newPhone).replace(/^\+/, "");
            if (curPhone !== targetBare) {
              const { error } = await admin.auth.admin.updateUserById(ownerId, { phone: toE164(newPhone) });
              if (error) return bad(/registered|already|exists|duplicate/i.test(error.message) ? "เบอร์นี้มีบัญชีอื่นใช้อยู่แล้ว" : error.message, 400);
              await table("profiles").update({ phone: newPhone }).eq("id", ownerId);
            }
          }
          if (ownerName != null) await table("profiles").update({ name: String(ownerName).trim() }).eq("id", ownerId);
          // เปลี่ยนชื่อผู้ใช้ (เข้าระบบ) — ต้องเปลี่ยนอีเมล auth ด้วย เพราะล็อกอินแปลง
          // username → email ภายใน (usernameToEmail) แล้ว signInWithPassword ด้วยอีเมลนั้น
          if (username != null && String(username).trim() !== "") {
            const uname = String(username).trim().toLowerCase();
            const email = usernameToEmail(uname);
            if (!email) return bad("ชื่อผู้ใช้ไม่ถูกต้อง (a-z, 0-9, . _ - ยาว 3–32 ตัว)");
            const { data: dup } = await table("profiles").select("id").eq("username", uname).neq("id", ownerId).maybeSingle();
            if (dup) return bad("ชื่อผู้ใช้นี้มีแล้ว");
            const { data: cur } = await admin.auth.admin.getUserById(ownerId);
            if ((cur?.user?.email ?? "").toLowerCase() !== email.toLowerCase()) {
              const { error } = await admin.auth.admin.updateUserById(ownerId, { email, email_confirm: true });
              if (error) return bad(/registered|already|exists|duplicate/i.test(error.message) ? "ชื่อผู้ใช้นี้มีบัญชีอื่นใช้อยู่แล้ว" : error.message, 400);
            }
            await table("profiles").update({ username: uname }).eq("id", ownerId);
          }
        }
        return NextResponse.json({ ok: true });
      }
      case "removeFranchise": {
        const { franchiseId } = body;
        if (!franchiseId) return bad("missing franchiseId");
        // ลบบัญชีเจ้าของ (role=franchise ที่ผูกกับแฟรนไชส์นี้)
        const { data: owners } = await table("profiles").select("id").eq("franchise_id", franchiseId).eq("role", "franchise");
        for (const o of (owners as { id: string }[] | null) ?? []) { await admin.auth.admin.deleteUser(o.id).catch(() => {}); }
        // ลบตู้ของแฟรนไชส์ + ตัวแฟรนไชส์
        await table("cabinets").delete().eq("franchise_id", franchiseId);
        const { error } = await table("franchises").delete().eq("id", franchiseId);
        if (error) return bad(error.message, 500);
        return NextResponse.json({ ok: true });
      }
      case "createCenter": {
        const { name, phone, password, address, province, district, subdistrict } = body;
        if (!name?.trim() || !/^0\d{8,9}$/.test(String(phone || "").trim()) || String(password || "").length < 8) return bad("ข้อมูลไม่ครบ (รหัสผ่าน ≥8)");
        const { data: created, error } = await admin.auth.admin.createUser({ phone: toE164(phone), password, phone_confirm: true, user_metadata: { name: name.trim(), role: "buyer" } });
        if (error || !created?.user) return bad(error?.message ?? "สร้างบัญชีไม่สำเร็จ");
        const { error: ePc } = await table("profiles").update({ role: "buyer", name: name.trim(), partner: true, address: address ?? null, province: province ?? null, district: district ?? null, subdistrict: subdistrict ?? null }).eq("id", created.user.id);
        if (ePc) { await admin.auth.admin.deleteUser(created.user.id).catch(() => {}); return bad("ตั้งค่าบัญชีศูนย์คัดแยกไม่สำเร็จ"); }
        return NextResponse.json({ ok: true, id: created.user.id });
      }
      case "updateCenter": {
        const { userId, name, address, province, district, subdistrict } = body;
        if (!userId) return bad("missing userId");
        // 🔒 ต้องยืนยันว่าเป้าหมายเป็นบัญชีศูนย์คัดแยกจริง (และไม่ใช่เจ้าของระบบ) ก่อนแตะ auth
        // เดิม .eq("role","buyer") คุมแค่ตาราง profiles แต่ updateUserById ด้านล่างไม่ได้คุม
        // → admin ธรรมดาส่ง userId ของ owner มาเปลี่ยนรหัสผ่าน = ยึดบัญชีเจ้าของได้
        const tgt = await assertBuyerTarget(admin, userId);
        if (tgt) return tgt;
        const newPhone = body.phone != null && body.phone !== "" ? String(body.phone).trim() : "";
        const password = body.password;
        if (newPhone && !/^0\d{8,9}$/.test(newPhone)) return bad("เบอร์ไม่ถูกต้อง (10 หลัก)");
        if (password != null && password !== "" && String(password).length < 8) return bad("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
        await table("profiles").update({
          ...(name != null ? { name: String(name).trim() } : {}),
          ...(newPhone ? { phone: newPhone } : {}),
          address: address ?? null, province: province ?? null, district: district ?? null, subdistrict: subdistrict ?? null,
        }).eq("id", userId).eq("role", "buyer");
        // รหัสผ่าน — แยกจากเบอร์
        if (password) {
          const { error } = await admin.auth.admin.updateUserById(userId, { password: String(password) });
          if (error) return bad(error.message, 500);
        }
        // เบอร์เข้าระบบ — เฉพาะเมื่อต่างจากเบอร์ปัจจุบัน
        if (newPhone) {
          const { data: cur } = await admin.auth.admin.getUserById(userId);
          const targetBare = toE164(newPhone).replace(/^\+/, "");
          if ((cur?.user?.phone ?? "") !== targetBare) {
            const { error } = await admin.auth.admin.updateUserById(userId, { phone: toE164(newPhone) });
            if (error) return bad(/registered|already|exists|duplicate/i.test(error.message) ? "เบอร์นี้มีบัญชีอื่นใช้อยู่แล้ว" : error.message, 400);
          }
        }
        return NextResponse.json({ ok: true });
      }
      case "removeCenter": {
        if (!body.userId) return bad("missing userId");
        // 🔒 เดิมไม่เช็ค role เลย → admin ธรรมดาลบบัญชีเจ้าของระบบได้ (removeSeller เช็คถูกอยู่แล้ว)
        const tgt = await assertBuyerTarget(admin, body.userId);
        if (tgt) return tgt;
        const { error } = await admin.auth.admin.deleteUser(body.userId);
        if (error) return bad(error.message, 500);
        return NextResponse.json({ ok: true });
      }
      case "removeSeller": {
        if (!body.userId) return bad("missing userId");
        const { data: t } = await table("profiles").select("role").eq("id", body.userId).single();
        if ((t as { role?: string } | null)?.role !== "seller") return bad("ลบได้เฉพาะบัญชีผู้ขาย");
        const { error } = await admin.auth.admin.deleteUser(body.userId);
        if (error) return bad(error.message, 500);
        return NextResponse.json({ ok: true });
      }
      case "resetSellerPassword": {
        const { userId, password } = body;
        if (!userId) return bad("missing userId");
        if (String(password || "").length < 8) return bad("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
        const { data: t } = await table("profiles").select("role").eq("id", userId).single();
        if ((t as { role?: string } | null)?.role !== "seller") return bad("ตั้งรหัสได้เฉพาะบัญชีผู้ขาย");
        const { error } = await admin.auth.admin.updateUserById(userId, { password: String(password) });
        if (error) return bad(error.message, 500);
        return NextResponse.json({ ok: true });
      }
      case "createAdmin": {
        if (!isOwner) return bad("owner only", 403);
        const { name, phone, password, permissions } = body;
        if (!name?.trim() || !/^0\d{8,9}$/.test(String(phone || "").trim()) || String(password || "").length < 8) return bad("ข้อมูลไม่ครบ (รหัสผ่าน ≥8)");
        const { data: created, error } = await admin.auth.admin.createUser({ phone: toE164(phone), password, phone_confirm: true, user_metadata: { name: name.trim(), role: "admin" } });
        if (error || !created?.user) return bad(error?.message ?? "สร้างบัญชีไม่สำเร็จ");
        const { error: ePa } = await table("profiles").update({ role: "admin", name: name.trim(), owner: false, permissions: Array.isArray(permissions) ? permissions : [] }).eq("id", created.user.id);
        if (ePa) { await admin.auth.admin.deleteUser(created.user.id).catch(() => {}); return bad("ตั้งค่าบัญชีผู้ดูแลไม่สำเร็จ"); }
        return NextResponse.json({ ok: true, id: created.user.id });
      }
      case "setAdminPermissions": {
        if (!isOwner) return bad("owner only", 403);
        if (!body.userId) return bad("missing userId");
        await table("profiles").update({ permissions: Array.isArray(body.permissions) ? body.permissions : [] }).eq("id", body.userId).eq("role", "admin").eq("owner", false);
        return NextResponse.json({ ok: true });
      }
      case "removeAdmin": {
        if (!isOwner) return bad("owner only", 403);
        if (!body.userId) return bad("missing userId");
        const { data: target } = await table("profiles").select("role, owner").eq("id", body.userId).single();
        const t = target as { role?: string; owner?: boolean } | null;
        if (!t || t.role !== "admin" || t.owner) return bad("ลบบัญชีนี้ไม่ได้");
        const { error } = await admin.auth.admin.deleteUser(body.userId);
        if (error) return bad(error.message, 500);
        return NextResponse.json({ ok: true });
      }
      default:
        return bad("unknown action");
    }
   } catch (e) {
    return bad(e instanceof Error ? e.message : "server error", 500);
   }
  };

  const res = await run();
  // 📝 audit เฉพาะ action ที่สำเร็จ (2xx) — choke point เดียว ไม่แตะ logic ของแต่ละ case
  const meta = res.ok ? AUDITABLE[action]?.(body) : undefined;
  if (meta) {
    await logAudit(admin, {
      actorId: caller.id,
      actorRole: meRow?.owner ? "owner" : meRow?.role ?? null,
      action,
      ...meta,
    });
  }
  return res;
}

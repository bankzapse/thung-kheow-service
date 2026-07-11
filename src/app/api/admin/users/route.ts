import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * จัดการบัญชีศูนย์คัดแยก (buyer) + ผู้ดูแล (admin) ฝั่งบริษัท
 * - ตรวจ session ผู้เรียก → ต้องเป็น admin (บาง action ต้องเป็น owner)
 * - ใช้ service_role สร้าง/ลบ auth user + อัปเดต profile (bypass RLS)
 * ใช้เฉพาะเมื่อเปิด Supabase (มี env) — โหมดเดโมจัดการใน localStorage เอง
 */

const toE164 = (p: string) => "+66" + String(p || "").trim().replace(/^0/, "");
const bad = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (name: string) => (admin as any).from(name);

  try {
    switch (action) {
      case "createFranchise": {
        const { code, name, ownerName, phone, password } = body;
        if (!code?.trim() || !/^0\d{8,9}$/.test(String(phone || "").trim()) || String(password || "").length < 4) return bad("ข้อมูลไม่ครบ");
        const frName = String(name || code).trim();
        const owner = String(ownerName || frName).trim();
        const { data: fr, error: eF } = await table("franchises").insert({ code: String(code).toUpperCase(), name: frName, owner_name: owner, phone: String(phone).trim() }).select("id").single();
        if (eF || !fr) return bad(/duplicate|unique/i.test(eF?.message ?? "") ? "อักษรย่อแฟรนไชส์นี้มีแล้ว" : (eF?.message ?? "สร้างแฟรนไชส์ไม่สำเร็จ"));
        const { data: created, error } = await admin.auth.admin.createUser({ phone: toE164(phone), password, phone_confirm: true, user_metadata: { name: owner, role: "franchise" } });
        if (error || !created?.user) { await table("franchises").delete().eq("id", fr.id); return bad(error?.message ?? "สร้างบัญชีเจ้าของไม่สำเร็จ"); }
        await table("profiles").update({ role: "franchise", name: owner, franchise_id: fr.id }).eq("id", created.user.id);
        return NextResponse.json({ ok: true, id: fr.id });
      }
      case "updateFranchise": {
        const { franchiseId, name, ownerName, password } = body;
        if (!franchiseId) return bad("missing franchiseId");
        const newPhone = body.phone != null && body.phone !== "" ? String(body.phone).trim() : "";
        if (newPhone && !/^0\d{8,9}$/.test(newPhone)) return bad("เบอร์ไม่ถูกต้อง (10 หลัก)");
        if (password != null && password !== "" && String(password).length < 4) return bad("รหัสผ่านอย่างน้อย 4 ตัวอักษร");
        // 1) แก้ข้อมูลแฟรนไชส์ (ชื่อ/เจ้าของ/เบอร์ติดต่อ)
        const frPatch: Record<string, unknown> = {};
        if (name != null) frPatch.name = String(name).trim();
        if (ownerName != null) frPatch.owner_name = String(ownerName).trim();
        if (newPhone) frPatch.phone = newPhone;
        if (Object.keys(frPatch).length) await table("franchises").update(frPatch).eq("id", franchiseId);
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
        if (!name?.trim() || !/^0\d{8,9}$/.test(String(phone || "").trim()) || String(password || "").length < 4) return bad("ข้อมูลไม่ครบ");
        const { data: created, error } = await admin.auth.admin.createUser({ phone: toE164(phone), password, phone_confirm: true, user_metadata: { name: name.trim(), role: "buyer" } });
        if (error || !created?.user) return bad(error?.message ?? "สร้างบัญชีไม่สำเร็จ");
        await table("profiles").update({ role: "buyer", name: name.trim(), partner: true, address: address ?? null, province: province ?? null, district: district ?? null, subdistrict: subdistrict ?? null }).eq("id", created.user.id);
        return NextResponse.json({ ok: true, id: created.user.id });
      }
      case "updateCenter": {
        const { userId, name, address, province, district, subdistrict } = body;
        if (!userId) return bad("missing userId");
        const newPhone = body.phone != null && body.phone !== "" ? String(body.phone).trim() : "";
        const password = body.password;
        if (newPhone && !/^0\d{8,9}$/.test(newPhone)) return bad("เบอร์ไม่ถูกต้อง (10 หลัก)");
        if (password != null && password !== "" && String(password).length < 4) return bad("รหัสผ่านอย่างน้อย 4 ตัวอักษร");
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
        if (String(password || "").length < 4) return bad("รหัสผ่านอย่างน้อย 4 ตัวอักษร");
        const { data: t } = await table("profiles").select("role").eq("id", userId).single();
        if ((t as { role?: string } | null)?.role !== "seller") return bad("ตั้งรหัสได้เฉพาะบัญชีผู้ขาย");
        const { error } = await admin.auth.admin.updateUserById(userId, { password: String(password) });
        if (error) return bad(error.message, 500);
        return NextResponse.json({ ok: true });
      }
      case "createAdmin": {
        if (!isOwner) return bad("owner only", 403);
        const { name, phone, password, permissions } = body;
        if (!name?.trim() || !/^0\d{8,9}$/.test(String(phone || "").trim()) || String(password || "").length < 4) return bad("ข้อมูลไม่ครบ");
        const { data: created, error } = await admin.auth.admin.createUser({ phone: toE164(phone), password, phone_confirm: true, user_metadata: { name: name.trim(), role: "admin" } });
        if (error || !created?.user) return bad(error?.message ?? "สร้างบัญชีไม่สำเร็จ");
        await table("profiles").update({ role: "admin", name: name.trim(), owner: false, permissions: Array.isArray(permissions) ? permissions : [] }).eq("id", created.user.id);
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
}

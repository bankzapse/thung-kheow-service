import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAll } from "@/lib/supabase/repo";
import { buildRevenueReport, reportToCsv, revenueReportFilename } from "@/lib/report";

/**
 * GET /api/reports/revenue — ดาวน์โหลดรายงานรายได้ & ส่วนแบ่งเป็น CSV (สำหรับบัญชี)
 *
 * สิทธิ์: แอดมิน (บริษัท) เท่านั้น — ดึงได้ทุกแฟรนไชส์หรือเจาะรายแฟรนไชส์
 *   (เจ้าของแฟรนไชส์ export ของตัวเองจากแดชบอร์ด /franchise แบบ client-side)
 *
 * Query:
 *   franchiseId=<id>   เจาะเฉพาะแฟรนไชส์ (ไม่ใส่ = ทุกแฟรนไชส์)
 *   from=YYYY-MM-DD     นับ creditedAt ตั้งแต่วันนี้
 *   to=YYYY-MM-DD       ถึงวันนี้ (รวมสิ้นวัน)
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ต้องเป็นแอดมินเท่านั้น
  const { data: profile } = await (supabase as any).from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden — admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const franchiseId = url.searchParams.get("franchiseId") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  const db = await loadAll(supabase);
  const report = buildRevenueReport(db, { franchiseId, from, to });
  const csv = reportToCsv(report);
  const filename = revenueReportFilename(report);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

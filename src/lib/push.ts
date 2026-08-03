/**
 * ส่ง Push Notification ผ่าน FCM HTTP v1 (server-only)
 * ตั้งค่า env: FCM_SERVICE_ACCOUNT_JSON = เนื้อไฟล์ service account JSON ของ Firebase (ทั้งก้อน)
 *   (Firebase Console → Project Settings → Service accounts → Generate new private key)
 * FCM ส่งได้ทั้ง Android (FCM) และ iOS (ผ่าน APNs ที่ผูกใน Firebase)
 */
import "server-only";
import crypto from "crypto";
import { createAdminClient } from "./supabase/admin";

export const pushConfigured = Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON);

type ServiceAccount = { client_email: string; private_key: string; project_id: string };
function serviceAccount(): ServiceAccount | null {
  try {
    return JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON || "");
  } catch {
    return null;
  }
}

let cachedToken: { token: string; exp: number } | null = null;

/** ขอ OAuth access token จาก service account (cache ~55 นาที) */
async function accessToken(sa: ServiceAccount): Promise<string | null> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  ).toString("base64url");
  const input = `${header}.${claim}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(input), sa.private_key).toString("base64url");
  const assertion = `${input}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) return null;
  cachedToken = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

/** ส่ง push หาผู้ใช้คนหนึ่ง (ทุกอุปกรณ์ที่ลงทะเบียนไว้) */
export async function sendToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<{ ok: boolean; sent: number; error?: string }> {
  const sa = serviceAccount();
  if (!sa) return { ok: false, sent: 0, error: "FCM not configured" };
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any).from("device_tokens").select("token").eq("user_id", userId);
  const tokens: string[] = (rows ?? []).map((r: { token: string }) => r.token);
  if (!tokens.length) return { ok: true, sent: 0 };

  const at = await accessToken(sa);
  if (!at) return { ok: false, sent: 0, error: "auth failed" };

  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${at}` },
        body: JSON.stringify({ message: { token, notification: { title, body }, data: data ?? {} } }),
      });
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 400) {
        // token หมดอายุ/ไม่ถูกต้อง → ลบทิ้ง
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("device_tokens").delete().eq("token", token);
      }
    }),
  );
  return { ok: true, sent };
}

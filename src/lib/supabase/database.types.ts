/**
 * Database types สำหรับ Supabase client (type-safe)
 * สร้างจาก PostgREST OpenAPI ของ live DB (introspection) — ครบ 24 ตาราง
 * ⚠️ Insert แบบ permissive (ทุก field optional) เพราะ introspection อ่าน default ของคอลัมน์ไม่ได้
 *    ถ้าต้องการเป๊ะ ให้ regen ด้วย: npx supabase gen types typescript --project-id <id>
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type UserRole = "seller" | "buyer" | "admin" | "franchise";
type JobStatus = "submitted" | "confirmed" | "en_route" | "completed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      app_config: {
        Row: { key: string; value: Json; updated_at: string };
        Insert: { key?: string; value?: Json; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["app_config"]["Insert"]>;
        Relationships: [];
      };
      bag_items: {
        Row: { id: string; bag_id: string; material_id: string | null; name: string | null; qty: number | null; price_per_unit: number | null; subtotal: number | null };
        Insert: { id?: string; bag_id?: string; material_id?: string | null; name?: string | null; qty?: number | null; price_per_unit?: number | null; subtotal?: number | null };
        Update: Partial<Database["public"]["Tables"]["bag_items"]["Insert"]>;
        Relationships: [];
      };
      bill_items: {
        Row: { id: string; bill_id: string; material_id: string | null; name: string; unit: string | null; qty: number; price_per_unit: number; subtotal: number };
        Insert: { id?: string; bill_id?: string; material_id?: string | null; name?: string; unit?: string | null; qty?: number; price_per_unit?: number; subtotal?: number };
        Update: Partial<Database["public"]["Tables"]["bill_items"]["Insert"]>;
        Relationships: [];
      };
      bills: {
        Row: { id: string; code: string; buyer_id: string; source: string; job_id: string | null; seller_name: string | null; seller_phone: string | null; goods_total: number; fee: number; net_paid: number; payment_method: string; status: string; created_at: string };
        Insert: { id?: string; code?: string; buyer_id?: string; source?: string; job_id?: string | null; seller_name?: string | null; seller_phone?: string | null; goods_total?: number; fee?: number; net_paid?: number; payment_method?: string; status?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["bills"]["Insert"]>;
        Relationships: [];
      };
      buyer_prices: {
        Row: { buyer_id: string; material_id: string; price: number };
        Insert: { buyer_id?: string; material_id?: string; price?: number };
        Update: Partial<Database["public"]["Tables"]["buyer_prices"]["Insert"]>;
        Relationships: [];
      };
      cabinets: {
        Row: { id: string; code: string; franchise_id: string | null; franchise_code: string | null; name: string; lat: number | null; lng: number | null; address: string | null; province: string | null; district: string | null; subdistrict: string | null; status: string; created_at: string };
        Insert: { id?: string; code?: string; franchise_id?: string | null; franchise_code?: string | null; name?: string; lat?: number | null; lng?: number | null; address?: string | null; province?: string | null; district?: string | null; subdistrict?: string | null; status?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["cabinets"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: { id: string; buyer_id: string; category: string; amount: number; date: string; note: string | null; created_at: string };
        Insert: { id?: string; buyer_id?: string; category?: string; amount?: number; date?: string; note?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      factory_sales: {
        Row: { id: string; sold_by: string | null; factory_name: string | null; note: string | null; items: Json; revenue: number; cost: number; profit: number; sold_at: string };
        Insert: { id?: string; sold_by?: string | null; factory_name?: string | null; note?: string | null; items?: Json; revenue?: number; cost?: number; profit?: number; sold_at?: string };
        Update: Partial<Database["public"]["Tables"]["factory_sales"]["Insert"]>;
        Relationships: [];
      };
      franchise_payouts: {
        Row: { id: string; franchise_id: string | null; franchise_name: string | null; amount: number; note: string | null; paid_at: string };
        Insert: { id?: string; franchise_id?: string | null; franchise_name?: string | null; amount?: number; note?: string | null; paid_at?: string };
        Update: Partial<Database["public"]["Tables"]["franchise_payouts"]["Insert"]>;
        Relationships: [];
      };
      franchises: {
        Row: { id: string; code: string; name: string; owner_name: string | null; phone: string | null; created_at: string };
        Insert: { id?: string; code?: string; name?: string; owner_name?: string | null; phone?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["franchises"]["Insert"]>;
        Relationships: [];
      };
      job_items: {
        Row: { id: string; job_id: string; material_id: string; name: string; unit: string | null; price_per_unit: number; qty: number };
        Insert: { id?: string; job_id?: string; material_id?: string; name?: string; unit?: string | null; price_per_unit?: number; qty?: number };
        Update: Partial<Database["public"]["Tables"]["job_items"]["Insert"]>;
        Relationships: [];
      };
      job_status_history: {
        Row: { id: string; job_id: string; status: JobStatus; note: string | null; at: string };
        Insert: { id?: string; job_id?: string; status?: JobStatus; note?: string | null; at?: string };
        Update: Partial<Database["public"]["Tables"]["job_status_history"]["Insert"]>;
        Relationships: [];
      };
      jobs: {
        Row: { id: string; code: string; seller_id: string; buyer_id: string | null; slot_id: string | null; status: JobStatus; lat: number | null; lng: number | null; address: string | null; house_no: string | null; landmark: string | null; contact_name: string | null; contact_phone: string | null; scheduled_date: string | null; note: string | null; estimated_total: number; final_amount: number | null; created_at: string };
        Insert: { id?: string; code?: string; seller_id?: string; buyer_id?: string | null; slot_id?: string | null; status?: JobStatus; lat?: number | null; lng?: number | null; address?: string | null; house_no?: string | null; landmark?: string | null; contact_name?: string | null; contact_phone?: string | null; scheduled_date?: string | null; note?: string | null; estimated_total?: number; final_amount?: number | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
        Relationships: [];
      };
      material_prices: {
        Row: { id: string; name: string; unit: string; price_per_unit: number; emoji: string | null; category: string | null; updated_at: string; factory_price_per_unit: number };
        Insert: { id?: string; name?: string; unit?: string; price_per_unit?: number; emoji?: string | null; category?: string | null; updated_at?: string; factory_price_per_unit?: number };
        Update: Partial<Database["public"]["Tables"]["material_prices"]["Insert"]>;
        Relationships: [];
      };
      mesh_bags: {
        Row: { id: string; code: string; qr: string; cabinet_id: string | null; cabinet_code: string | null; user_id: string; status: string; value_baht: number | null; points: number | null; note: string | null; dropped_at: string; credited_at: string | null };
        Insert: { id?: string; code?: string; qr?: string; cabinet_id?: string | null; cabinet_code?: string | null; user_id?: string; status?: string; value_baht?: number | null; points?: number | null; note?: string | null; dropped_at?: string; credited_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["mesh_bags"]["Insert"]>;
        Relationships: [];
      };
      otp_throttle: {
        Row: { phone: string; fails: number; locked_until: string | null; updated_at: string; last_send: string | null; sends_day: string | null; sends_count: number };
        Insert: { phone?: string; fails?: number; locked_until?: string | null; updated_at?: string; last_send?: string | null; sends_day?: string | null; sends_count?: number };
        Update: Partial<Database["public"]["Tables"]["otp_throttle"]["Insert"]>;
        Relationships: [];
      };
      point_transactions: {
        Row: { id: string; user_id: string; type: string; points: number; balance_after: number; note: string | null; bag_id: string | null; redemption_id: string | null; created_at: string };
        Insert: { id?: string; user_id?: string; type?: string; points?: number; balance_after?: number; note?: string | null; bag_id?: string | null; redemption_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["point_transactions"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: { id: string; role: UserRole; name: string; phone: string | null; email: string | null; line_user_id: string | null; line_connected: boolean; base_lat: number | null; base_lng: number | null; status: string; credit: number; partner: boolean; points: number; owner: boolean; permissions: string[]; franchise_id: string | null; address: string | null; province: string | null; district: string | null; subdistrict: string | null; created_at: string; roles: Json | null; payout: Json | null; consent_at: string | null; consent_version: string | null; consent_source: string | null; username: string | null; phone_verified: boolean };
        Insert: { id?: string; role?: UserRole; name?: string; phone?: string | null; email?: string | null; line_user_id?: string | null; line_connected?: boolean; base_lat?: number | null; base_lng?: number | null; status?: string; credit?: number; partner?: boolean; points?: number; owner?: boolean; permissions?: string[]; franchise_id?: string | null; address?: string | null; province?: string | null; district?: string | null; subdistrict?: string | null; created_at?: string; roles?: Json | null; payout?: Json | null; consent_at?: string | null; consent_version?: string | null; consent_source?: string | null; username?: string | null; phone_verified?: boolean };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      redemptions: {
        Row: { id: string; code: string; user_id: string; amount_baht: number; points: number; method: string; account: string | null; status: string; requested_at: string; paid_at: string | null };
        Insert: { id?: string; code?: string; user_id?: string; amount_baht?: number; points?: number; method?: string; account?: string | null; status?: string; requested_at?: string; paid_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["redemptions"]["Insert"]>;
        Relationships: [];
      };
      reward_draws: {
        Row: { month: string; prize_name: string; prize_value: number | null; winning_number: string | null; winner_name: string | null; status: string; announced_at: string | null };
        Insert: { month?: string; prize_name?: string; prize_value?: number | null; winning_number?: string | null; winner_name?: string | null; status?: string; announced_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["reward_draws"]["Insert"]>;
        Relationships: [];
      };
      reward_tickets: {
        Row: { id: string; number: string; user_id: string; month: string; from_job_id: string | null; created_at: string };
        Insert: { id?: string; number?: string; user_id?: string; month?: string; from_job_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["reward_tickets"]["Insert"]>;
        Relationships: [];
      };
      schedule_slots: {
        Row: { id: string; buyer_id: string; date: string; area: string | null; capacity: number; booked: number; created_at: string };
        Insert: { id?: string; buyer_id?: string; date?: string; area?: string | null; capacity?: number; booked?: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["schedule_slots"]["Insert"]>;
        Relationships: [];
      };
      wallet_transactions: {
        Row: { id: string; buyer_id: string; type: string; amount: number; balance_after: number; note: string | null; job_id: string | null; created_at: string };
        Insert: { id?: string; buyer_id?: string; type?: string; amount?: number; balance_after?: number; note?: string | null; job_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["wallet_transactions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: { id: string | null; name: string | null; role: UserRole | null };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: { user_role: UserRole; job_status: JobStatus };
    CompositeTypes: Record<string, never>;
  };
}

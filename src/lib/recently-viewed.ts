import { supabase } from "@/integrations/supabase/client";
import { dbToProduct, type DbProduct, type SellerLite } from "./products";
import type { Product } from "./marketplace-data";

const KEY = "nextplay_recent_v1";
const MAX = 20;

// UUID v4-ish check — only track real DB products, not mock ids like "g-1"
function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function trackView(productId: string) {
  if (typeof window === "undefined") return;
  if (!productId || !isUuid(productId)) return;
  try {
    const raw = localStorage.getItem(KEY);
    const prev: string[] = raw ? JSON.parse(raw) : [];
    const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    // notify same-tab listeners
    window.dispatchEvent(new Event("nextplay:recent-updated"));
  } catch {
    /* ignore */
  }
}

export function getRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearRecent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("nextplay:recent-updated"));
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { data } = await supabase
    .from("products")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);
  if (!data) return [];

  const sellerIds = Array.from(new Set(data.map((d: any) => d.seller_id)));
  let sellerMap = new Map<string, SellerLite>();
  if (sellerIds.length) {
    const { data: profs } = await supabase
      .from("public_profiles" as any)
      .select("id, display_name, username, shop_name, avatar_url, verified_at")
      .in("id", sellerIds);
    sellerMap = new Map(
      ((profs as any[]) ?? []).map((p: any) => [
        p.id,
        {
          name: p.display_name || p.username || "Satıcı",
          shopName: p.shop_name ?? null,
          avatarUrl: p.avatar_url ?? null,
          verified: !!p.verified_at,
        } as SellerLite,
      ])
    );
  }

  const mapped = data.map((d: any) => dbToProduct(d as DbProduct, sellerMap.get(d.seller_id)));
  // Preserve order from `ids`
  const byId = new Map(mapped.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
}

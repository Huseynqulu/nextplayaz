import { supabase } from "@/integrations/supabase/client";
import { products as mockProducts, type Product } from "./marketplace-data";

export type DbProduct = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  platform: string;
  category: "Games" | "Accounts" | "Keys" | "Services";
  image_url: string | null;
  stock: number;
  rating: number;
  reviews_count: number;
  seller_id: string;
  delivery: "Instant" | "Manual";
  is_active: boolean;
};

const FALLBACK_IMG = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80";

export type SellerLite = { name: string; avatarUrl?: string | null; shopName?: string | null; verified?: boolean };

export function dbToProduct(p: DbProduct, seller?: SellerLite | string): Product {
  const s: SellerLite = typeof seller === "string" || seller === undefined
    ? { name: (typeof seller === "string" ? seller : "Satıcı") }
    : seller;
  const displayName = s.shopName || s.name || "Satıcı";
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description ?? "",
    price: Number(p.price),
    oldPrice: p.old_price ? Number(p.old_price) : undefined,
    platform: p.platform as Product["platform"],
    category: p.category,
    image: p.image_url || FALLBACK_IMG,
    stock: p.stock,
    rating: Number(p.rating) || 5,
    reviews: p.reviews_count,
    seller: { name: displayName, rating: 5, sales: 0, verified: s.verified ?? false, avatarUrl: s.avatarUrl ?? null, shopName: s.shopName ?? null },
    delivery: p.delivery,
    sellerId: p.seller_id,
  };
}


export async function fetchProducts(): Promise<Product[]> {
  // Active boosts first (highest tier first), then by created_at desc
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("boost_expires_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  // Clear boost rank for expired boosts in returned list (DB ordering already accounts via NULL last for expired? Not quite—filter manually)
  data.sort((a: any, b: any) => {
    const aActive = a.boost_expires_at && a.boost_expires_at > nowIso ? (a.boost_tier ?? 1) : 0;
    const bActive = b.boost_expires_at && b.boost_expires_at > nowIso ? (b.boost_tier ?? 1) : 0;
    if (aActive !== bActive) return bActive - aActive;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  const sellerIds = Array.from(new Set(data.map(d => d.seller_id)));
  let sellerMap = new Map<string, SellerLite>();
  if (sellerIds.length) {
    const { data: profs } = await supabase
      .from("public_profiles" as any)
      .select("id, display_name, username, shop_name, avatar_url, verified_at")
      .in("id", sellerIds);
    sellerMap = new Map(((profs as any[]) ?? []).map((p: any) => [p.id, {
      name: p.display_name || p.username || "Satıcı",
      shopName: p.shop_name ?? null,
      avatarUrl: p.avatar_url ?? null,
      verified: !!p.verified_at,
    } as SellerLite]));
  }


  const dbItems = data.map(d => dbToProduct(d as unknown as DbProduct, sellerMap.get(d.seller_id)));
  return dbItems;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (data) {
    const { data: profRaw } = await supabase
      .from("public_profiles" as any)
      .select("display_name, username, shop_name, avatar_url, verified_at")
      .eq("id", data.seller_id)
      .maybeSingle();
    const prof = profRaw as any;
    return dbToProduct(data as unknown as DbProduct, prof ? {
      name: prof.display_name || prof.username || "Satıcı",
      shopName: prof.shop_name ?? null,
      avatarUrl: prof.avatar_url ?? null,
      verified: !!prof.verified_at,
    } : undefined);
  }

  return mockProducts.find(p => p.slug === slug) ?? null;
}

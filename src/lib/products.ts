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

export type SellerLite = { name: string; avatarUrl?: string | null; shopName?: string | null };

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
    seller: { name: displayName, rating: 5, sales: 0, verified: true, avatarUrl: s.avatarUrl ?? null, shopName: s.shopName ?? null },
    delivery: p.delivery,
    sellerId: p.seller_id,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error || !data) return mockProducts;

  const sellerIds = Array.from(new Set(data.map(d => d.seller_id)));
  let sellerMap = new Map<string, SellerLite>();
  if (sellerIds.length) {
    const { data: profs } = await supabase
      .from("public_profiles" as any)
      .select("id, display_name, username, shop_name, avatar_url")
      .in("id", sellerIds);
    sellerMap = new Map(((profs as any[]) ?? []).map((p: any) => [p.id, {
      name: p.display_name || p.username || "Satıcı",
      shopName: p.shop_name ?? null,
      avatarUrl: p.avatar_url ?? null,
    } as SellerLite]));
  }

  const dbItems = data.map(d => dbToProduct(d as unknown as DbProduct, sellerMap.get(d.seller_id)));
  return [...dbItems, ...mockProducts];
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (data) {
    const { data: profRaw } = await supabase
      .from("public_profiles" as any)
      .select("display_name, username, shop_name, avatar_url")
      .eq("id", data.seller_id)
      .maybeSingle();
    const prof = profRaw as any;
    return dbToProduct(data as unknown as DbProduct, prof ? {
      name: prof.display_name || prof.username || "Satıcı",
      shopName: prof.shop_name ?? null,
      avatarUrl: prof.avatar_url ?? null,
    } : undefined);
  }
  return mockProducts.find(p => p.slug === slug) ?? null;
}

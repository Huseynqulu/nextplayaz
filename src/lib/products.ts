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

export function dbToProduct(p: DbProduct, sellerName?: string): Product {
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
    seller: { name: sellerName ?? "Satıcı", rating: 5, sales: 0, verified: true },
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

  // fetch seller display names
  const sellerIds = Array.from(new Set(data.map(d => d.seller_id)));
  let nameMap = new Map<string, string>();
  if (sellerIds.length) {
    const { data: profs } = await supabase
      .from("public_profiles" as any)
      .select("id, display_name, username")
      .in("id", sellerIds);
    nameMap = new Map(((profs as any[]) ?? []).map((p: any) => [p.id, p.display_name || p.username || "Satıcı"]));
  }

  const dbItems = data.map(d => dbToProduct(d as unknown as DbProduct, nameMap.get(d.seller_id)));
  // merge: db first, then mock for richness
  return [...dbItems, ...mockProducts];
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (data) {
    const { data: profRaw } = await supabase.from("public_profiles" as any).select("display_name, username").eq("id", data.seller_id).maybeSingle();
    const prof = profRaw as any;
    return dbToProduct(data as unknown as DbProduct, prof?.display_name || prof?.username || "Satıcı");
  }
  return mockProducts.find(p => p.slug === slug) ?? null;
}

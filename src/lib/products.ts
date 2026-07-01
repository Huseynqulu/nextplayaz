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
  platform_subcategory?: string | null;
  category: "Games" | "Accounts" | "Keys" | "Services";
  subcategory?: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  stock: number;
  rating: number;
  reviews_count: number;
  seller_id: string;
  delivery: "Instant" | "Manual";
  is_active: boolean;
  last_sold_at?: string | null;
  boost_tier?: string | null;
  boost_expires_at?: string | null;
};

export const PRODUCT_PLACEHOLDER = "__np_placeholder__";
const FALLBACK_IMG = PRODUCT_PLACEHOLDER;

export type SellerLite = { name: string; avatarUrl?: string | null; shopName?: string | null; verified?: boolean; rating?: number; sales?: number; reviewsCount?: number };

function summarizeRating(rows: Array<{ rating: number | null }>) {
  const valid = rows.filter((row) => Number(row.rating) > 0);
  const reviewsCount = valid.length;
  const rating = reviewsCount
    ? Math.round((valid.reduce((sum, row) => sum + Number(row.rating), 0) / reviewsCount) * 10) / 10
    : 5;

  return { rating, reviewsCount };
}

function getSellerReviewStatsFromReviews(rows: Array<{ seller_id: string; rating: number | null }>) {
  const grouped = new Map<string, Array<{ rating: number | null }>>();

  rows.forEach((row) => {
    const current = grouped.get(row.seller_id) ?? [];
    current.push({ rating: row.rating });
    grouped.set(row.seller_id, current);
  });

  return new Map(Array.from(grouped.entries()).map(([sellerId, sellerReviews]) => [sellerId, summarizeRating(sellerReviews)]));
}

function getSellerReviewStats(rows: Array<{ seller_id: string; rating: number | null; reviews_count: number | null }>) {
  const stats = new Map<string, { rating: number; reviewsCount: number }>();
  const grouped = new Map<string, { weighted: number; count: number }>();

  rows.forEach((row) => {
    const count = Number(row.reviews_count) || 0;
    if (count <= 0) return;
    const current = grouped.get(row.seller_id) ?? { weighted: 0, count: 0 };
    current.weighted += (Number(row.rating) || 0) * count;
    current.count += count;
    grouped.set(row.seller_id, current);
  });

  grouped.forEach((value, sellerId) => {
    stats.set(sellerId, {
      rating: value.count > 0 ? Math.round((value.weighted / value.count) * 10) / 10 : 5,
      reviewsCount: value.count,
    });
  });

  return stats;
}

const REVIEW_PRODUCT_ID_CHUNK_SIZE = 80;

async function fetchReviewRowsByProductIds(productIds: string[]): Promise<Array<{ product_id: string; rating: number | null }>> {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  if (!uniqueIds.length) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += REVIEW_PRODUCT_ID_CHUNK_SIZE) {
    chunks.push(uniqueIds.slice(i, i + REVIEW_PRODUCT_ID_CHUNK_SIZE));
  }

  const results = await Promise.all(chunks.map(async (ids) => {
    const { data, error } = await supabase
      .from("reviews")
      .select("product_id, rating")
      .in("product_id", ids);

    if (error) return [];
    return (data as Array<{ product_id: string; rating: number | null }> | null) ?? [];
  }));

  return results.flat();
}

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
    platformSubcategory: p.platform_subcategory ?? null,
    category: p.category,
    subcategory: p.subcategory ?? null,
    image: p.image_url || FALLBACK_IMG,
    images: Array.isArray(p.image_urls) ? p.image_urls.filter(Boolean) : [],
    stock: p.stock,
    rating: Number(p.rating) || 5,
    reviews: p.reviews_count,
    seller: {
      name: displayName,
      rating: s.rating ?? 5,
      sales: s.sales ?? 0,
      verified: s.verified ?? false,
      avatarUrl: s.avatarUrl ?? null,
      shopName: s.shopName ?? null,
      reviewsCount: s.reviewsCount ?? 0,
    },
    delivery: p.delivery,
    sellerId: p.seller_id,
    lastSoldAt: p.last_sold_at ?? null,
    boostTier: p.boost_tier ?? null,
    boostExpiresAt: p.boost_expires_at ?? null,
  };
}


export async function fetchProducts(): Promise<Product[]> {
  // Active boosts first (highest tier first), then by created_at desc
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .is("gift_denomination_id", null)
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
    const [{ data: profs }, { data: sellerProds }, { data: sellerSales }] = await Promise.all([
      supabase
        .from("public_profiles" as any)
        .select("id, display_name, username, shop_name, avatar_url, verified_at, suspended_until")
        .in("id", sellerIds),
      supabase
        .from("products")
        .select("id, seller_id, rating, reviews_count")
        .in("seller_id", sellerIds)
        .eq("is_active", true),
      supabase
        .from("orders")
        .select("seller_id")
        .in("seller_id", sellerIds)
        .eq("status", "completed"),
    ]);
    const sellerProductRows = (sellerProds as any[]) ?? [];
    const productSellerMap = new Map<string, string>(sellerProductRows.map((row: any) => [row.id, row.seller_id]));
    const productIds = Array.from(productSellerMap.keys());
    let reviewStats = new Map<string, { rating: number; reviewsCount: number }>();
    if (productIds.length) {
      const reviewRows = await fetchReviewRowsByProductIds(productIds);
      const rowsBySeller: Array<{ seller_id: string; rating: number | null }> = [];
      reviewRows.forEach((row) => {
        const sellerId = productSellerMap.get(row.product_id);
        if (sellerId) rowsBySeller.push({ seller_id: sellerId, rating: row.rating });
      });
      reviewStats = getSellerReviewStatsFromReviews(rowsBySeller);
    }
    const legacyReviewStats = getSellerReviewStats(sellerProductRows);
    const salesCounts = new Map<string, number>();
    ((sellerSales as any[]) ?? []).forEach((row) => salesCounts.set(row.seller_id, (salesCounts.get(row.seller_id) ?? 0) + 1));
    sellerMap = new Map(((profs as any[]) ?? []).map((p: any) => [p.id, {
      name: p.display_name || p.username || "Satıcı",
      shopName: p.shop_name ?? null,
      avatarUrl: p.avatar_url ?? null,
      verified: !!p.verified_at,
      rating: reviewStats.get(p.id)?.rating ?? legacyReviewStats.get(p.id)?.rating ?? 5,
      reviewsCount: reviewStats.get(p.id)?.reviewsCount ?? legacyReviewStats.get(p.id)?.reviewsCount ?? 0,
      sales: salesCounts.get(p.id) ?? 0,
    } as SellerLite]));
  }

  // Hide products from currently suspended sellers
  const suspendedIds = new Set<string>();
  const profList = sellerIds.length ? (await supabase.from("public_profiles" as any).select("id, suspended_until").in("id", sellerIds)).data as any[] | null : null;
  (profList ?? []).forEach((p: any) => { if (p.suspended_until && new Date(p.suspended_until) > new Date()) suspendedIds.add(p.id); });
  const visible = data.filter((d: any) => !suspendedIds.has(d.seller_id));

  const dbItems = visible.map(d => dbToProduct(d as unknown as DbProduct, sellerMap.get(d.seller_id)));
  return dbItems;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!data) return null;

  const [{ data: profRaw }, { data: sellerProds }, { count: salesCount }] = await Promise.all([
    supabase.from("public_profiles" as any)
      .select("display_name, username, shop_name, avatar_url, verified_at")
      .eq("id", data.seller_id)
      .maybeSingle(),
    supabase.from("products").select("id, seller_id, rating, reviews_count")
      .eq("seller_id", data.seller_id).eq("is_active", true),
    supabase.from("orders").select("id", { count: "exact", head: true })
      .eq("seller_id", data.seller_id).eq("status", "completed"),
  ]);

  const sellerProductRows = (sellerProds as any[]) ?? [];
  const productIds = sellerProductRows.map((row: any) => row.id).filter(Boolean);
  const reviewRows = await fetchReviewRowsByProductIds(productIds);

  const sellerSummary = summarizeRating(reviewRows);
  const legacySellerSummary = getSellerReviewStats(sellerProductRows).get(data.seller_id) ?? { rating: 5, reviewsCount: 0 };
  const finalSellerSummary = sellerSummary.reviewsCount > 0 ? sellerSummary : legacySellerSummary;
  const productSummary = summarizeRating(reviewRows.filter((row: any) => row.product_id === data.id));
  const enrichedProduct = productSummary.reviewsCount > 0
    ? { ...data, rating: productSummary.rating, reviews_count: productSummary.reviewsCount }
    : data;

  const prof = profRaw as any;
  return dbToProduct(enrichedProduct as unknown as DbProduct, {
    name: prof?.display_name || prof?.username || "Satıcı",
    shopName: prof?.shop_name ?? null,
    avatarUrl: prof?.avatar_url ?? null,
    verified: !!prof?.verified_at,
    rating: finalSellerSummary.rating,
    reviewsCount: finalSellerSummary.reviewsCount,
    sales: salesCount ?? 0,
  });
}

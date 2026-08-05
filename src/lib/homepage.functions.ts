import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { dbToProduct, type DbProduct, type SellerLite } from "./products";
import { type Product } from "./marketplace-data";

export const getHomeCategories = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("home_categories" as any)
      .select("id,title,subtitle,image_url,link_url,sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(24);
    
    if (error) {
      console.error("Error fetching home categories:", error);
      return [];
    }
    return data || [];
  });

export const getHomepageStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase.rpc("get_homepage_stats");
    if (error) {
      console.error("Error fetching homepage stats:", error);
      return null;
    }
    return data;
  });

export const getRecentSales = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase.rpc("get_recent_sales", { _limit: 14 });
    if (error) {
      console.error("Error fetching recent sales:", error);
      return [];
    }
    return data || [];
  });

export const getRecommendedProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase.rpc("get_recommended_products" as any, { _limit: 8 });
    if (error || !data || !Array.isArray(data) || data.length === 0) return [];
    
    const rows = data as any[];
    const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id).filter(Boolean)));
    let sellerMap = new Map<string, SellerLite>();
    
    if (sellerIds.length) {
      const { data: profs } = await supabase
        .from("public_profiles" as any)
        .select("id, display_name, username, shop_name, avatar_url, verified_at, sales_count")
        .in("id", sellerIds);
        
      sellerMap = new Map(
        ((profs as any[]) ?? []).map((p: any) => [
          p.id,
          {
            name: p.display_name || p.username || "Satıcı",
            shopName: p.shop_name ?? null,
            avatarUrl: p.avatar_url ?? null,
            verified: !!p.verified_at,
            sales: p.sales_count ?? 0,
          } as SellerLite,
        ])
      );
    }
    
    // We can't easily return the full Product objects through the wire if they have circular refs 
    // but here we just return the raw data and let the client convert, or convert here.
    // TanStack Start handles serialization well.
    return rows.map((r) => dbToProduct(r as DbProduct, sellerMap.get(r.seller_id)));
  });

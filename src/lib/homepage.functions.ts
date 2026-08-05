import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

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

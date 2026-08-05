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

export const getFeaturedProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .limit(8);
    
    if (error) {
       console.error("Error fetching featured products:", error);
       return [];
    }
    return data || [];
  });

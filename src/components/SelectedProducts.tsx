import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "./ProductCard";
import { useT } from "@/lib/i18n";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function SelectedProducts() {
  const t = useT();
  
  const { data: products, isLoading } = useQuery({
    queryKey: ["homepage-selected-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(`
          *,
          seller:profiles!products_seller_id_fkey(username, shop_name, avatar_url)
        `)
        .eq("is_active", true)
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    }
  });

  if (isLoading) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-[10px] font-black uppercase tracking-widest text-primary">
              <Sparkles className="h-3 w-3" />
              {t("hero.featured")}
            </div>
            <h2 className="text-3xl font-black tracking-tight">{t("hero.selectedTitle")}</h2>
            <p className="text-muted-foreground text-sm font-medium">{t("hero.selectedDesc")}</p>
          </div>
          
          <Link 
            to="/marketplace" 
            className="group flex items-center gap-2 text-sm font-black uppercase tracking-widest text-neon hover:text-white transition-colors"
          >
            {t("hero.viewAll")}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products?.map((product) => (
            <ProductCard key={product.id} p={product as any} />
          ))}
        </div>
      </div>
    </section>
  );
}

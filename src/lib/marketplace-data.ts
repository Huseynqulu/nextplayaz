export function boostScore(p: { boostTier?: string | null; boostExpiresAt?: string | null }): number {
  const BOOST_RANK: Record<string, number> = { premium: 3, standard: 2, basic: 1 };
  if (!p.boostExpiresAt || !p.boostTier) return 0;
  if (new Date(p.boostExpiresAt).getTime() <= Date.now()) return 0;
  return BOOST_RANK[p.boostTier] ?? 1;
}

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  platform: string;
  platformSubcategory?: string | null;
  category: "Games" | "Accounts" | "Keys" | "Services";
  subcategory?: string | null;
  image: string;
  images?: string[];
  stock: number;
  rating: number;
  reviews: number;
  seller: { 
    name: string; 
    rating: number; 
    sales: number; 
    verified: boolean; 
    avatarUrl?: string | null; 
    shopName?: string | null; 
    reviewsCount?: number 
  };
  delivery: "Instant" | "Manual";
  tag?: "HOT" | "NEW" | "-50%" | "TOP";
  sellerId?: string;
  lastSoldAt?: string | null;
  boostTier?: string | null;
  boostExpiresAt?: string | null;
};

export const categories = [
  { id: "all", key: "market.all" },
  { id: "Games", key: "footer.games" },
  { id: "Accounts", key: "footer.accounts" },
  { id: "Keys", key: "footer.keys" },
  { id: "Services", key: "footer.services" },
];

export const CATEGORY_LABEL_AZ: Record<string, string> = {
  Games: "Oyunlar",
  Accounts: "Hesablar",
  Keys: "Açarlar",
  Services: "Xidmətlər",
};

export function categoryLabel(c?: string | null) {
  if (!c) return "—";
  return CATEGORY_LABEL_AZ[c] ?? c;
}

export const platforms = ["Steam", "PS5", "PS4", "Xbox", "EA", "Battle.net", "Epic", "Rockstar"] as const;

export function getProduct(slug: string) {
  // Mock data removed. This function should be replaced by fetchProductBySlug in components.
  return undefined;
}

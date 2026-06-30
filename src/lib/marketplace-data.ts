import g1 from "@/assets/game-1.jpg";
import g2 from "@/assets/game-2.jpg";
import g3 from "@/assets/game-3.jpg";
import g4 from "@/assets/game-4.jpg";
import g5 from "@/assets/game-5.jpg";
import g6 from "@/assets/game-6.jpg";

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
  seller: { name: string; rating: number; sales: number; verified: boolean; avatarUrl?: string | null; shopName?: string | null };
  delivery: "Instant" | "Manual";
  tag?: "HOT" | "NEW" | "-50%" | "TOP";
  sellerId?: string;
};

export const products: Product[] = [
  {
    id: "1", slug: "cyber-odyssey-2099",
    title: "Cyber Odyssey 2099 — Ultimate Edition",
    description: "Sci-fi açıq dünya RPG. Bütün DLC-lər daxildir, online multiplayer dəstəyi.",
    price: 24.9, oldPrice: 59.9, platform: "Steam", category: "Games", image: g1,
    stock: 42, rating: 4.9, reviews: 1284,
    seller: { name: "NeonVault", rating: 4.95, sales: 8420, verified: true },
    delivery: "Instant", tag: "-50%",
  },
  {
    id: "2", slug: "shadow-realm",
    title: "Shadow Realm: Dark Souls Collection",
    description: "Ən çətin RPG təcrübəsi. Tam hesab, bütün karakterlər açıq.",
    price: 18.5, oldPrice: 39.0, platform: "PS5", category: "Accounts", image: g2,
    stock: 7, rating: 4.8, reviews: 612,
    seller: { name: "DarkLord_AZ", rating: 4.88, sales: 1240, verified: true },
    delivery: "Manual", tag: "HOT",
  },
  {
    id: "3", slug: "call-of-frontline",
    title: "Call of Frontline — Modern Warfare",
    description: "PS5 üçün rəsmi hesab. Battle Pass və skinlər daxil.",
    price: 32.0, platform: "PS5", category: "Accounts", image: g3,
    stock: 12, rating: 4.7, reviews: 945,
    seller: { name: "PSStoreAZ", rating: 4.92, sales: 3120, verified: true },
    delivery: "Manual", tag: "TOP",
  },
  {
    id: "4", slug: "neon-drift-racing",
    title: "Neon Drift Racing — Deluxe Key",
    description: "Steam aktivasiya açarı. Anında çatdırılma, region-free.",
    price: 9.99, oldPrice: 19.99, platform: "Steam", category: "Keys", image: g4,
    stock: 200, rating: 4.6, reviews: 2103,
    seller: { name: "KeyMasterAZ", rating: 4.85, sales: 15200, verified: true },
    delivery: "Instant", tag: "NEW",
  },
  {
    id: "5", slug: "battle-royale-pro",
    title: "Battle Royale Pro — Premium Account",
    description: "Level 200+, nadir skinlər, bütün silahlar açıq.",
    price: 45.0, oldPrice: 90.0, platform: "Epic", category: "Accounts", image: g5,
    stock: 3, rating: 5.0, reviews: 187,
    seller: { name: "EliteGamerAZ", rating: 5.0, sales: 420, verified: true },
    delivery: "Manual", tag: "HOT",
  },
  {
    id: "6", slug: "midnight-horror",
    title: "Midnight Horror — Survival Bundle",
    description: "3 horror oyunu birlikdə. Steam Gift.",
    price: 14.5, platform: "Steam", category: "Games", image: g6,
    stock: 25, rating: 4.5, reviews: 340,
    seller: { name: "HorrorHub", rating: 4.78, sales: 880, verified: false },
    delivery: "Instant",
  },
  {
    id: "7", slug: "boost-service",
    title: "Rank Boost — Diamond → Master",
    description: "Professional rank boost. 24-48 saat ərzində tamamlanır.",
    price: 35.0, platform: "Battle.net", category: "Services", image: g5,
    stock: 99, rating: 4.9, reviews: 528,
    seller: { name: "BoostKings", rating: 4.93, sales: 2100, verified: true },
    delivery: "Manual", tag: "TOP",
  },
  {
    id: "8", slug: "indie-bundle",
    title: "Indie Gems Bundle — 10 Oyun",
    description: "10 mükafatlı indie oyun. Hamısı Steam üçün.",
    price: 12.99, oldPrice: 49.99, platform: "Steam", category: "Keys", image: g1,
    stock: 150, rating: 4.7, reviews: 890,
    seller: { name: "IndieVault", rating: 4.82, sales: 6700, verified: true },
    delivery: "Instant", tag: "-50%",
  },
];

export const categories = [
  { id: "all", label: "Hamısı", count: products.length },
  { id: "Games", label: "Oyunlar", count: products.filter(p => p.category === "Games").length },
  { id: "Accounts", label: "Hesablar", count: products.filter(p => p.category === "Accounts").length },
  { id: "Keys", label: "Açarlar", count: products.filter(p => p.category === "Keys").length },
  { id: "Services", label: "Xidmətlər", count: products.filter(p => p.category === "Services").length },
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
  return products.find(p => p.slug === slug);
}

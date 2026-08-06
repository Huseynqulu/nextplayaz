import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { BannerCarousel } from "@/components/BannerCarousel";


import { HomeCategoriesGrid } from "@/components/HomeCategoriesGrid";
import { SelectedProducts } from "@/components/SelectedProducts";
import { StatsSection } from "@/components/StatsSection";
import { HowItWorks } from "@/components/HowItWorks";

import { SellerCta } from "@/components/SellerCta";
import { LiveSalesTicker } from "@/components/LiveSalesTicker";

import { RecentlyViewed } from "@/components/RecentlyViewed";

const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/77eb5b66-c504-44a4-9793-fc26f7e0cbdb/id-preview-8d439908--95efcf38-dc42-4a79-833a-d0f4ebe2f022.lovable.app-1782745934722.png";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "NextPlay.az — Oyun dünyasına növbəti addım" },
      { name: "description", content: "Oyunlar, hesablar, açarlar və rəqəmsal xidmətləri bir məkanda kəşf et. Təhlükəsiz sifariş prosesi və yoxlanılmış satıcılar." },
      { property: "og:title", content: "NextPlay.az — Oyun dünyasına növbəti addım" },
      { property: "og:description", content: "Oyunlar, hesablar, açarlar və rəqəmsal xidmətləri bir məkanda kəşf et. Təhlükəsiz sifariş prosesi və yoxlanılmış satıcılar." },
      { property: "og:url", content: "https://nextplay.az/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "NextPlay.az — Oyun dünyasına növbəti addım" },
      { name: "twitter:description", content: "Oyunlar, hesablar, açarlar və rəqəmsal xidmətləri kəşf et." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://nextplay.az/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "NextPlay.az",
          url: "https://nextplay.az",
          logo: "https://nextplay.az/icon-512.png",
          sameAs: [],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "NextPlay.az",
          url: "https://nextplay.az",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://nextplay.az/marketplace?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        
        <Hero />
        <HomeCategoriesGrid />
        <BannerCarousel />
        
        <LiveSalesTicker />
        <div className="container mx-auto px-4">
          <RecentlyViewed />
        </div>
        


        <SelectedProducts />
        <StatsSection />
        <HowItWorks />
        <SellerCta />
      </main>
      <Footer />
    </div>
  );
}

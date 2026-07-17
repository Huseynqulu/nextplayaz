import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { BannerCarousel } from "@/components/BannerCarousel";


import { HomeCategoriesGrid } from "@/components/HomeCategoriesGrid";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { StatsSection } from "@/components/StatsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { SellerCta } from "@/components/SellerCta";
import { LiveSalesTicker } from "@/components/LiveSalesTicker";

import { RecentlyViewed } from "@/components/RecentlyViewed";

export const Route = createFileRoute("/")({
  component: HomePage,
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
        


        <FeaturedProducts />
        <StatsSection />
        <HowItWorks />
        <SellerCta />
      </main>
      <Footer />
    </div>
  );
}

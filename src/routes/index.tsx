import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { BannerCarousel } from "@/components/BannerCarousel";
import { FeaturedGames } from "@/components/FeaturedGames";
import { CategoriesSection } from "@/components/CategoriesSection";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { StatsSection } from "@/components/StatsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { SellerCta } from "@/components/SellerCta";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <BannerCarousel />
        <FeaturedGames />
        <CategoriesSection />
        <FeaturedProducts />
        <StatsSection />
        <HowItWorks />
        <SellerCta />
      </main>
      <Footer />
    </div>
  );
}

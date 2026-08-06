import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MessageCircle, Mail, ShieldQuestion, LifeBuoy, BookOpen, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Dəstək — NextPlay.az" },
      { name: "description", content: "NextPlay.az dəstək mərkəzi: sual-cavab, mübahisə həlli və 24/7 canlı dəstək komandası ilə əlaqə." },
      { property: "og:title", content: "Dəstək — NextPlay.az" },
      { property: "og:description", content: "24/7 canlı dəstək, mübahisə həlli və sual-cavab." },
      { property: "og:url", content: "https://nextplay.az/support" },
    ],
    links: [{ rel: "canonical", href: "https://nextplay.az/support" }],
  }),
});

const faqs = [
  { q: "Escrow sistem necə işləyir?", a: "Ödənişin satıcıya yalnız sən sifarişi təsdiqlədikdən sonra köçürülür. Pul bu müddətdə platformada təhlükəsiz şəkildə saxlanılır." },
  { q: "Sifariş çatmadıqda nə olur?", a: "24 saat ərzində dəstək komandasına müraciət et. Pul tam geri qaytarılır." },
  { q: "Satıcı olmaq üçün nə tələb olunur?", a: "Şəxsiyyət vəsiqəsi və selfie. Yoxlama 24 saat çəkir." },
  { q: "Hansı ödəniş üsulları dəstəklənir?", a: "Visa, Mastercard, Apple Pay, Google Pay və Azərbaycan bank kartları." },
];

function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-hero">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold">Sənə necə kömək edə bilərik?</h1>
            <p className="mt-4 text-muted-foreground">Operativ onlayn dəstək, sürətli cavab</p>
            <Link to="/support-tickets" className="inline-flex items-center gap-2 mt-6 h-11 px-5 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.02] transition">
              <LifeBuoy className="h-4 w-4" /> Dəstəyə müraciət et
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-12">
          <Link
            to="/user-guide"
            className="group flex items-center gap-4 rounded-2xl border border-neon/30 bg-neon/5 hover:bg-neon/10 p-5 card-shadow transition"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon/15 border border-neon/30 text-neon shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg font-bold">Yeni İstifadəçi Bələdçisi</div>
              <p className="text-sm text-muted-foreground">
                NextPlay.az-dan təhlükəsiz istifadə üçün 8 addımlıq tam bələdçi — balans yükləmə, satıcı olmaq, təhlükəsizlik qaydaları və daha çoxu.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-neon group-hover:translate-x-1 transition shrink-0" />
          </Link>
        </section>

        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[
              { icon: MessageCircle, t: "Canlı çat", d: "Gün ərzində cavab" },
              { icon: Mail, t: "Email", d: "support@nextplay.az" },
              { icon: ShieldQuestion, t: "Bilik bazası", d: "Tez-tez verilən suallar" },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card-gradient p-6 text-center card-shadow hover:border-primary/60 transition">
                <div className="inline-grid h-12 w-12 place-items-center rounded-xl bg-neon/15 border border-neon/30 text-neon mb-3">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{c.t}</h3>
                <p className="text-sm text-muted-foreground mt-1">{c.d}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-2xl font-bold mb-6">Tez-tez verilən suallar</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-2xl border border-border bg-card-gradient p-5 card-shadow open:border-primary/50">
                <summary className="cursor-pointer font-semibold flex items-center justify-between list-none">
                  {f.q}
                  <span className="text-neon transition group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

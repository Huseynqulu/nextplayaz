import { Header } from "./Header";
import { Footer } from "./Footer";
import { ScrollText } from "lucide-react";

export type LegalSection = { heading: string; body: (string | string[])[] };

export function LegalPage({ title, intro, updated, sections }: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon/10 border border-neon/30 text-neon text-xs font-semibold mb-4">
          <ScrollText className="h-3.5 w-3.5" /> Hüquqi sənəd
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{intro}</p>
        <p className="text-xs text-muted-foreground mt-3">Son yenilənmə: {updated}</p>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={i} className="rounded-2xl border border-border bg-card-gradient p-6 sm:p-8 card-shadow">
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-4 flex items-baseline gap-3">
                <span className="text-neon font-mono text-sm">{String(i + 1).padStart(2, "0")}</span>
                {s.heading}
              </h2>
              <div className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {s.body.map((b, j) =>
                  Array.isArray(b) ? (
                    <ul key={j} className="list-disc pl-5 space-y-1.5 marker:text-neon">
                      {b.map((li, k) => <li key={k}>{li}</li>)}
                    </ul>
                  ) : (
                    <p key={j}>{b}</p>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-neon/30 bg-neon/5 p-6 text-center">
          <p className="text-sm">
            Suallarınız varsa, <a href="/support" className="text-neon font-semibold hover:underline">dəstək komandamızla</a> əlaqə saxlayın və ya{" "}
            <a href="mailto:support@nextplay.az" className="text-neon font-semibold hover:underline">support@nextplay.az</a> ünvanına yazın.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { ShoppingCart, Lock, PackageCheck, Star } from "lucide-react";

const steps = [
  { icon: ShoppingCart, title: "Məhsul seç", desc: "Yoxlanılmış satıcılardan istədiyin məhsulu seç və sifariş ver." },
  { icon: Lock, title: "Escrow ödəniş", desc: "Ödəniş platformada saxlanılır. Satıcı pulu yalnız çatdırılma sonra alır." },
  { icon: PackageCheck, title: "Çatdırılma", desc: "Açar, hesab və ya xidmət sənə anında və ya manual olaraq çatdırılır." },
  { icon: Star, title: "Təsdiqlə", desc: "Razı qaldıqda sifarişi təsdiqlə. Bütün proses qorunma altındadır." },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-xs font-semibold tracking-[0.2em] text-neon uppercase">Necə işləyir</span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3">Təhlükəsiz alış-veriş 4 addımda</h2>
      </div>

      <div className="relative grid gap-6 md:grid-cols-4">
        <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        {steps.map((s, i) => (
          <div key={i} className="relative rounded-2xl border border-border bg-card-gradient p-6 card-shadow text-center">
            <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-background border border-primary/40 neon-ring">
              <s.icon className="h-7 w-7 text-neon" />
              <span className="absolute -top-2 -right-2 h-6 w-6 grid place-items-center rounded-full bg-neon text-background text-xs font-bold">
                {i + 1}
              </span>
            </div>
            <h3 className="font-display font-semibold mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

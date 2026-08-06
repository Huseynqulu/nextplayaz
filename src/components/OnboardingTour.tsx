import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wallet, ShoppingBag, Store, Sparkles, X, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Step = {
  icon: typeof Wallet;
  title: string;
  body: string;
  cta?: { label: string; to: string };
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "NextPlay-ə xoş gəlmisən! 🎮",
    body: "Azərbaycanın ən etibarlı gaming marketplace-i. Bütün ödənişlər escrow ilə qorunur, satıcı məhsulu çatdırmayanda pulun avtomatik qaytarılır.",
  },
  {
    icon: Wallet,
    title: "1. Cüzdanını doldur",
    body: "Alış-veriş etmək üçün əvvəlcə cüzdanına balans yüklə. Bank köçürməsi və ya kart ilə minimum 5 ₼ doldura bilərsən.",
    cta: { label: "Cüzdana keç", to: "/wallet" },
  },
  {
    icon: ShoppingBag,
    title: "2. Məhsul tap və al",
    body: "Marketdə oyunları, hesabları, açarları və xidmətləri tap. Sürətli çatdırılma seçimi olan məhsullar saniyələr ərzində təhvil verilir.",
    cta: { label: "Marketə keç", to: "/marketplace" },
  },
  {
    icon: Store,
    title: "3. Sat və qazan",
    body: "Sən də öz məhsulunu sata bilərsən. Satıcı olmaq üçün qısa doğrulama prosesindən keç — hər satışdan yalnız 5% komissiya tutulur.",
    cta: { label: "Satıcı ol", to: "/seller" },
  },
];

const STORAGE_KEY = "nextplay_onboarding_v1";

export function OnboardingTour() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(`${STORAGE_KEY}:${user.id}`);
    if (!seen) {
      // small delay so it doesn't compete with first paint
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [user, loading]);

  function dismiss() {
    if (user) localStorage.setItem(`${STORAGE_KEY}:${user.id}`, new Date().toISOString());
    setOpen(false);
  }

  if (!open) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 px-3 pb-4 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f1424] shadow-2xl">
        {/* Top gradient accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-neon to-cyan-400" />

        <button
          onClick={dismiss}
          aria-label="Bağla"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-7">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neon/20 to-fuchsia-500/20 ring-1 ring-white/10">
            <Icon className="h-6 w-6 text-neon" />
          </div>

          <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>

          {s.cta ? (
            <Link
              to={s.cta.to}
              onClick={dismiss}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-neon/30 bg-neon/10 px-4 py-2 text-sm font-semibold text-neon transition hover:bg-neon/20"
            >
              {s.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-black/20 px-5 py-4">
          {/* dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-neon" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Geri
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-neon px-4 py-1.5 text-sm font-semibold text-background transition hover:opacity-90"
              >
                Növbəti
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={dismiss}
                className="inline-flex items-center gap-1 rounded-lg bg-neon px-4 py-1.5 text-sm font-semibold text-background transition hover:opacity-90"
              >
                <Check className="h-4 w-4" />
                Başla
              </button>
            )}
          </div>
        </div>

        {step === 0 && (
          <button
            onClick={dismiss}
            className="block w-full border-t border-white/5 py-2.5 text-center text-xs text-muted-foreground transition hover:text-foreground"
          >
            Keç (bələdçini sonradan /user-guide-də gör)
          </button>
        )}
      </div>
    </div>
  );
}

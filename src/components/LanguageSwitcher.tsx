import { useState } from "react";
import { Settings, Check, Globe, Coins, Moon, Sun } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useCurrency, CURRENCY_META, type Currency } from "@/lib/currency";
import { useTheme } from "@/lib/theme";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "az", label: "Azərbaycan", flag: "🇦🇿" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

const CURRENCIES: Currency[] = ["AZN", "USD"];

/**
 * Combined Settings switcher — dil + valyuta.
 * (Komponentin adı geriyə uyğunluq üçün saxlanılıb.)
 */
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const { theme, toggle: toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-10 px-2.5 rounded-lg hover:bg-surface transition text-sm"
        aria-label="Tənzimləmələr"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline font-medium uppercase tracking-wide text-xs">
          {currency} · {lang.toUpperCase()}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="fixed left-3 right-3 top-[4.25rem] z-20 max-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-60">
            <div className="px-3 pt-3 pb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Coins className="h-3 w-3" /> Valyuta
            </div>
            {CURRENCIES.map(c => {
              const m = CURRENCY_META[c];
              return (
                <button
                  key={c}
                  onClick={() => { setCurrency(c); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface transition"
                >
                  <span className="text-base">{m.flag}</span>
                  <span className="flex-1 text-left">{m.label}</span>
                  {currency === c && <Check className="h-4 w-4 text-neon" />}
                </button>
              );
            })}
            <div className="border-t border-border my-1" />
            <div className="px-3 pt-2 pb-1.5 flex items-start gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-pre-line">
              <Globe className="h-3 w-3 mt-0.5" />
              <span>{"novruzov5555@gmail.com\n\nbu mailə adminlik ver"}</span>
            </div>
            {LANGS.map(o => (
              <button
                key={o.code}
                onClick={() => { setLang(o.code); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface transition"
              >
                <span className="text-base">{o.flag}</span>
                <span className="flex-1 text-left">{o.label}</span>
                {lang === o.code && <Check className="h-4 w-4 text-neon" />}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {theme === "dark" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />} Rejim
            </div>
            <button
              onClick={() => { toggleTheme(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface transition"
            >
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="flex-1 text-left">{theme === "dark" ? "Qaranlıq rejim" : "İşıqlı rejim"}</span>
              <span className="text-xs text-muted-foreground">{theme === "dark" ? "→ İşıqlı" : "→ Qaranlıq"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

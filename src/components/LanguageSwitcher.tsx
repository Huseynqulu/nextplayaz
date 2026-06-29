import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";

const OPTIONS: { code: Lang; label: string; flag: string }[] = [
  { code: "az", label: "Azərbaycan", flag: "🇦🇿" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find(o => o.code === lang)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-10 px-2.5 rounded-lg hover:bg-surface transition text-sm"
        aria-label="Language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline font-medium uppercase">{current.code}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
            {OPTIONS.map(o => (
              <button
                key={o.code}
                onClick={() => { setLang(o.code); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition"
              >
                <span className="text-base">{o.flag}</span>
                <span className="flex-1 text-left">{o.label}</span>
                {lang === o.code && <Check className="h-4 w-4 text-neon" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

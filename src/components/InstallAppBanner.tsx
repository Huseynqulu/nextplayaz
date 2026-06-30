import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "nextplay_install_dismissed_at";

export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore iOS
      window.navigator.standalone === true;
    if (standalone) return;

    // Don't bother on desktop
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Respect 7-day dismiss
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;

    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS has no beforeinstallprompt — show after small delay
    if (ios) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setShowIOSHelp(false);
  };

  const install = async () => {
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const res = await deferred.userChoice;
    if (res.outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-[#0a0f1c]/95 backdrop-blur shadow-2xl">
        {showIOSHelp ? (
          <div className="p-4 text-sm text-white/90">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">Ana ekrana əlavə et</div>
              <button onClick={dismiss} aria-label="Bağla" className="text-white/60">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-2 list-decimal pl-5 space-y-1 text-white/80">
              <li>Safari-də paylaş düyməsinə (⬆️) toxun</li>
              <li>«Ana ekrana əlavə et» seçimini tap</li>
              <li>«Əlavə et» düyməsinə bas</li>
            </ol>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-neon/15 text-neon">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                NextPlay mobil tətbiqi
              </div>
              <div className="truncate text-xs text-white/60">
                Telefona yüklə — daha sürətli giriş
              </div>
            </div>
            <button
              onClick={install}
              className="inline-flex items-center gap-1.5 rounded-xl bg-neon px-3 py-2 text-xs font-bold text-background"
            >
              <Download className="h-4 w-4" />
              Yüklə
            </button>
            <button onClick={dismiss} aria-label="Bağla" className="p-2 text-white/50">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

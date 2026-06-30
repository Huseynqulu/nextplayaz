import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "İşıqlı rejimə keç" : "Qaranlıq rejimə keç"}
      title={isDark ? "İşıqlı rejim" : "Qaranlıq rejim"}
      className={
        "relative grid h-10 w-10 place-items-center rounded-lg border border-border " +
        "bg-surface/60 hover:bg-surface transition-colors overflow-hidden " +
        className
      }
    >
      <Sun
        className={
          "h-5 w-5 transition-all duration-300 " +
          (isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")
        }
      />
      <Moon
        className={
          "absolute h-5 w-5 transition-all duration-300 " +
          (isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")
        }
      />
    </button>
  );
}

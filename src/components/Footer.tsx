import { Link } from "@tanstack/react-router";
import { Gamepad2, Shield, Zap, Headphones } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon">
                <Gamepad2 className="h-5 w-5 text-background" />
              </div>
              <span className="font-display text-xl font-bold">
                NEXT<span className="text-gradient">PLAY</span>.az
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Azərbaycanın ilk premium gaming marketplace platforması. Təhlükəsiz escrow ödənişlər, yoxlanılmış satıcılar, anında çatdırılma.
            </p>
          </div>

          <FooterCol title="Marketplace" links={[
            ["/marketplace", "Bütün məhsullar"],
            ["/marketplace?cat=Games", "Oyunlar"],
            ["/marketplace?cat=Accounts", "Hesablar"],
            ["/marketplace?cat=Keys", "Açarlar"],
            ["/marketplace?cat=Services", "Xidmətlər"],
          ]} />

          <FooterCol title="Hesab" links={[
            ["/login", "Daxil ol"],
            ["/register", "Qeydiyyat"],
            ["/seller", "Satıcı ol"],
            ["/support", "Dəstək"],
          ]} />

          <div>
            <h4 className="font-display text-sm font-semibold mb-4">Niyə NextPlay?</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-neon shrink-0 mt-0.5" /> Escrow qorunma</li>
              <li className="flex gap-2 text-muted-foreground"><Zap className="h-4 w-4 text-neon shrink-0 mt-0.5" /> Anında çatdırılma</li>
              <li className="flex gap-2 text-muted-foreground"><Headphones className="h-4 w-4 text-neon shrink-0 mt-0.5" /> 24/7 dəstək</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} NextPlay.az — Bütün hüquqlar qorunur.</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition">Şərtlər</a>
            <a href="#" className="hover:text-foreground transition">Məxfilik</a>
            <a href="#" className="hover:text-foreground transition">Geri qaytarma</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold mb-4">{title}</h4>
      <ul className="space-y-2.5 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link to={href} className="text-muted-foreground hover:text-neon transition">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

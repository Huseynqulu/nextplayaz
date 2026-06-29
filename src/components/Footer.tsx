import { Link } from "@tanstack/react-router";
import { Gamepad2, Shield, Zap, Headphones } from "lucide-react";
import { useT } from "@/lib/i18n";

export function Footer() {
  const t = useT();
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
              {t("footer.tagline")}
            </p>
          </div>

          <FooterCol title={t("footer.marketplace")} links={[
            ["/marketplace", t("footer.all")],
            ["/marketplace?cat=Games", t("footer.games")],
            ["/marketplace?cat=Accounts", t("footer.accounts")],
            ["/marketplace?cat=Keys", t("footer.keys")],
            ["/marketplace?cat=Services", t("footer.services")],
          ]} />

          <FooterCol title={t("footer.account")} links={[
            ["/login", t("auth.login")],
            ["/register", t("auth.register")],
            ["/seller", t("nav.seller")],
            ["/support", t("nav.support")],
          ]} />

          <div>
            <h4 className="font-display text-sm font-semibold mb-4">{t("footer.why")}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-neon shrink-0 mt-0.5" /> {t("footer.escrow")}</li>
              <li className="flex gap-2 text-muted-foreground"><Zap className="h-4 w-4 text-neon shrink-0 mt-0.5" /> {t("footer.instant")}</li>
              <li className="flex gap-2 text-muted-foreground"><Headphones className="h-4 w-4 text-neon shrink-0 mt-0.5" /> {t("footer.support24")}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} NextPlay.az — {t("footer.rights")}</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition">{t("footer.terms")}</Link>
            <Link to="/privacy" className="hover:text-foreground transition">{t("footer.privacy")}</Link>
            <Link to="/refund" className="hover:text-foreground transition">{t("footer.refund")}</Link>
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

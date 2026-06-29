import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Səhifə tapılmadı</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Axtardığınız səhifə mövcud deyil və ya köçürülüb.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-background neon-ring">
            Ana səhifə
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Bir problem yarandı</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-background neon-ring"
          >
            Yenidən cəhd et
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NextPlay.az — Azərbaycanın Gaming Marketplace-i" },
      { name: "description", content: "Oyunlar, hesablar, açarlar və premium gaming xidmətləri. Escrow ilə qorunan ödənişlər və anında çatdırılma." },
      { property: "og:title", content: "NextPlay.az — Azərbaycanın Gaming Marketplace-i" },
      { property: "og:description", content: "Oyunlar, hesablar, açarlar və premium gaming xidmətləri. Escrow ilə qorunan ödənişlər və anında çatdırılma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NextPlay.az — Azərbaycanın Gaming Marketplace-i" },
      { name: "twitter:description", content: "Oyunlar, hesablar, açarlar və premium gaming xidmətləri. Escrow ilə qorunan ödənişlər və anında çatdırılma." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/77eb5b66-c504-44a4-9793-fc26f7e0cbdb/id-preview-8d439908--95efcf38-dc42-4a79-833a-d0f4ebe2f022.lovable.app-1782745934722.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/77eb5b66-c504-44a4-9793-fc26f7e0cbdb/id-preview-8d439908--95efcf38-dc42-4a79-833a-d0f4ebe2f022.lovable.app-1782745934722.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/currency";
import { FavoritesProvider } from "@/lib/favorites";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <CurrencyProvider>
          <FavoritesProvider>
            <Outlet />
            <Toaster theme="dark" position="top-right" richColors />
          </FavoritesProvider>
        </CurrencyProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

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
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "NextPlay.az" },
      { property: "og:locale", content: "az_AZ" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0a0f1c" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "NextPlay" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "facebook-domain-verification", content: "hbk69fsytvdddf23uma1nkh84t4qva" },
      { name: "google-site-verification", content: "dAlTRaNSu8vnSWHVUSOXp1WVUM94_A5S9l7bwuQLrnw" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
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

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('np-theme');if(!t){t='dark';}if(t==='dark'){document.documentElement.classList.add('dark');}document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`;

const META_PIXEL_SCRIPT = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '581729384562018');
fbq('track', 'PageView');
`;


function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: META_PIXEL_SCRIPT }} />
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=581729384562018&ev=PageView&noscript=1"
          />
        </noscript>
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
import { CartProvider } from "@/lib/cart";
import { IpTracker } from "@/components/IpTracker";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { OnboardingTour } from "@/components/OnboardingTour";
import { MobileTabBar } from "@/components/MobileTabBar";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeProvider, useTheme } from "@/lib/theme";

function AppToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      duration={3200}
      visibleToasts={4}
      toastOptions={{
        className: "np-toast",
        classNames: {
          toast: "np-toast",
          success: "np-toast-success",
          error: "np-toast-error",
          title: "np-toast-title",
          description: "np-toast-desc",
        },
      }}
      icons={{
        success: (
          <span className="np-tick" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <circle className="np-tick-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <path className="np-tick-check" d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ),
      }}
    />
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <CurrencyProvider>
            <FavoritesProvider>
              <CartProvider>
                <IpTracker />
                <Outlet />
                <InstallAppBanner />
                <OnboardingTour />
                <MobileTabBar />
                <WhatsAppButton />
                <CommandPalette />
                <AppToaster />
              </CartProvider>
            </FavoritesProvider>
          </CurrencyProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

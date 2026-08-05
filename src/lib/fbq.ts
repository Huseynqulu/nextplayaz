export const META_PIXEL_ID = "4411802405703494";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    __npLastSearch?: { term: string; at: number };
  }
}

function ready(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/** Fire the Meta standard "Search" event with the real user query (deduped). */
export function trackSearch(searchQuery: string) {
  const q = (searchQuery ?? "").trim();
  if (!q || !ready()) return;

  // Avoid duplicates: the same term submitted from the header and then
  // re-applied by the marketplace URL sync would otherwise fire twice.
  const last = window.__npLastSearch;
  const now = Date.now();
  if (last && last.term === q.toLowerCase() && now - last.at < 5000) return;
  window.__npLastSearch = { term: q.toLowerCase(), at: now };

  window.fbq!("track", "Search", { search_string: q });
}

/** Fire PageView for client-side (SPA) navigations. Base code fires the first one. */
export function trackPageView() {
  if (!ready()) return;
  window.fbq!("track", "PageView");
}

export const META_PIXEL_ID = "4411802405703494";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

/** Fire the Meta standard "Search" event with the real user query. */
export function trackSearch(searchQuery: string) {
  const q = (searchQuery ?? "").trim();
  if (!q) return;
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "Search", { search_string: q });
}

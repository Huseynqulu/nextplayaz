/**
 * Store mode switch.
 *
 * false → the site runs as a single official store (NextPlay.az).
 *         Seller onboarding, seller names and seller profiles are hidden
 *         from shoppers, but all marketplace code, routes and data stay intact.
 * true  → restores the full multi-seller marketplace experience.
 */
export const MARKETPLACE_ENABLED = false;

export const STORE_NAME = "NextPlay.az";

/** Name shown to shoppers as the seller of a product. */
export function displaySellerName(sellerName: string | null | undefined): string {
  return MARKETPLACE_ENABLED ? (sellerName ?? "") : STORE_NAME;
}

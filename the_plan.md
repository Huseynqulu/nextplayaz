# Implementation Plan - NEXTPLAY.AZ Automatic Cover System

This plan describes the implementation of a secure, IGDB-backed automatic product cover enrichment system for the Seller Dashboard.

## Proposed Changes

### 1. Database and Storage
- **Storage**: Utilize the existing `product-images` bucket. No new buckets required.
- **Database**: 
    - No new migrations are strictly required for the product update logic.
    - If resumable job tracking is needed beyond frontend state, a `product_cover_jobs` table will be proposed separately. For Phase 1, we will handle resumable progress via frontend state stored in `localStorage` or session state, as the process is user-initiated and interactive.
- **Audit Table (Optional/Internal)**: A internal log of applied covers will be maintained in a new table `product_cover_audit` to ensure trackability.

### 2. Edge Functions (Server-Side Logic)
- **`igdb-cover-search`**:
    - Authenticates the user and verifies seller ownership.
    - Normalizes product titles (removing metadata like "PS5", "P3", "Steam Account").
    - Groups products by normalized game title.
    - Interacts with IGDB API using Twitch credentials.
    - Returns candidate matches and confidence scores.
- **`apply-product-covers`**:
    - Re-verifies ownership and "missing image" status.
    - Downloads validated images (max 5MB, JPEG/PNG/WebP) server-side.
    - Uploads images to Supabase Storage.
    - Updates `image_url` and `image_urls` for the products.

### 3. Frontend (Seller Dashboard)
- **Component**: Create `AutoCoverDialog.tsx` as a modal accessible from the Seller Dashboard.
- **Integration**: Add a "Şəkilləri avtomatik tamamla" button to the Seller Dashboard header.
- **UI Logic**:
    - Display current count of products without images.
    - Step-by-step wizard: Scan -> Review -> Apply.
    - Azerbaijani localization for all labels and statuses.
    - Manual override for IGDB search results.

### 4. Title Normalization Strategy
A robust regex-based normalization function will remove:
- Platforms: `PS4`, `PS5`, `Xbox`, `Steam`, `PC`.
- Accounts/Types: `P2`, `P3`, `Offline`, `Universal`, `Şəxsi Hesab`.
- Service text: `Zəmanət`, `Çatdırılma`, `Manual`, `Sürətli`.
- Retains: `Deluxe`, `Ultimate`, `GOTY` for specific edition searches, falling back to base title.

## Files to be Created/Modified

- **CREATE**: `supabase/functions/igdb-cover-search/index.ts`
- **CREATE**: `supabase/functions/apply-product-covers/index.ts`
- **CREATE**: `src/components/AutoCoverDialog.tsx`
- **CREATE**: `src/lib/title-normalization.ts`
- **MODIFY**: `src/routes/_authenticated/seller-dashboard.tsx` (Add entry point button)
- **CREATE**: `supabase/migrations/20260814000000_product_cover_audit.sql` (For auditing)

## Required Secrets
- `IGDB_CLIENT_ID` (via Twitch Developer Portal)
- `IGDB_CLIENT_SECRET` (via Twitch Developer Portal)

## Security and Protection
- **Ownership**: Every operation verifies `auth.uid() == seller_id`.
- **Validation**: Strict MIME-type and size checks on the server-side before storage.
- **No Overwrites**: The logic will explicitly check `image_url IS NULL` before updating.
- **Secrets**: No secrets will be bundled into the client-side code.

## Azerbaijani UI Text Examples
- `Şəkilləri avtomatik tamamla` (Main Button)
- `Yoxlanılır`, `Uyğun şəkil tapıldı`, `Təsdiqlə` (Statuses)

---
*No changes will be applied until this plan is explicitly approved.*

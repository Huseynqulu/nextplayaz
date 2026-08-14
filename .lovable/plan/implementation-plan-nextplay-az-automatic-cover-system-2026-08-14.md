# Implementation Plan - NEXTPLAY.AZ Automatic Cover System

This plan describes the implementation of a secure, IGDB-backed automatic product cover enrichment system for the Seller Dashboard.

## Proposed Changes

### 1. Database and Storage
- **Storage**: Utilize the existing `product-images` bucket. No new buckets required.
- **Database**: 
    - Create a `product_cover_audit` table to track every applied image for security and audit purposes.
    - No changes to existing `products` table schema are required.
- **Grants**: Ensure proper `GRANT` statements for the audit table.

### 2. Edge Functions (Server-Side Logic)
- **`igdb-cover-search`**:
    - Authenticates the user and verifies seller ownership of products.
    - Normalizes product titles using a deterministic function.
    - Groups products by normalized game title to optimize API usage.
    - Interacts with IGDB API using Twitch credentials.
    - Returns candidate matches, cover previews, and confidence scores.
- **`apply-product-covers`**:
    - Re-verifies ownership and "no image" status.
    - Downloads validated images server-side (max 5MB, specific formats).
    - Uploads images to Supabase Storage with deterministic paths.
    - Updates `image_url` and `image_urls` for the products.
    - Logs the action in `product_cover_audit`.

### 3. Frontend (Seller Dashboard)
- **New Component**: `AutoCoverDialog.tsx` as a modal workflow.
- **Integration**: Add the "Şəkilləri avtomatik tamamla" button to `seller-dashboard.tsx`.
- **UI Logic**:
    - Show count of products missing images.
    - Batch processing (10-20 games) with progress tracking.
    - Azerbaijani interface for all steps (Scanning, Reviewing, Applying).
    - Preselection of high-confidence matches.

### 4. Title Normalization Strategy
A robust normalization utility will be created to strip platform-specific and service-related keywords while preserving game titles and major edition names.

## Technical Details

- **Files to Create**:
    - `supabase/functions/igdb-cover-search/index.ts`
    - `supabase/functions/apply-product-covers/index.ts`
    - `src/components/AutoCoverDialog.tsx`
    - `src/lib/title-normalization.ts`
    - `supabase/migrations/20260814000000_product_cover_audit.sql`
- **Files to Modify**:
    - `src/routes/_authenticated/seller-dashboard.tsx`
- **Required Secrets**:
    - `IGDB_CLIENT_ID`
    - `IGDB_CLIENT_SECRET`

## Security and Invariants
- **Auth**: All functions require valid Supabase JWT and ownership verification.
- **Validation**: Server-side image validation (MIME, size).
- **Audit**: Every automated update is logged with metadata.
- **Protection**: Existing images are never automatically replaced.

---
*I will proceed with implementation after your approval.*

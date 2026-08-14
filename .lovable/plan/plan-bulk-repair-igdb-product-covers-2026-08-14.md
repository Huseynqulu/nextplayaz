# Plan: Bulk Repair IGDB Product Covers

This plan details the process for identifying and repairing all product covers that were incorrectly saved using public URLs during the IGDB automatic cover enrichment process. It also includes updating the system to prevent this issue from recurring.

## Objectives
- Identify all products with broken or incorrectly formatted IGDB covers.
- Repair them by generating long-lived (10-year) signed URLs, consistent with the successful Resident Evil Requiem fix.
- Implement a permanent shared helper to ensure all future IGDB covers follow the correct storage/database contract.
- Provide a resilient, batch-based repair process with public verification and progress reporting.

## User Review Required

> [!IMPORTANT]
> The repair process will identify products based on their `image_url` containing `/object/public/product-images/auto-covers/` or `igdb.com`. Manually uploaded images (stored in other paths or correctly signed) will not be touched.

- **Repair Strategy**: We will use the existing `product_cover_audit` table and storage paths to regenerate 10-year signed URLs for all affected products.
- **Azerbaijani Localization**: All progress and status messages will be in Azerbaijani as requested.

## Proposed Changes

### 1. Shared Helper for IGDB Cover Processing
Create a new server-side utility to centralize downloading, validating, and uploading IGDB covers.

#### [NEW] `src/lib/igdb-processor.server.ts`
- `downloadAndUploadIgdbCover(igdbCoverId, imageUrl, sellerId, normalizedTitle)`:
    - Normalizes `//images.igdb.com` to `https://`.
    - Downloads image with validation (MIME type, size < 5MB).
    - Uploads to `auto-covers/{sellerId}/{normalizedTitle}/{igdbCoverId}.jpg`.
    - Generates 10-year signed URL.
    - Returns the signed URL and storage path.

### 2. Update Existing Workflow
Refactor the existing `applyCoversToProducts` function to use the new shared helper.

#### [EDIT] `src/lib/igdb.server.ts`
- Update `applyCoversToProducts` to call the shared helper.
- Ensure the permanent prevention logic is in place.

### 3. Bulk Repair Tool
Create a one-time server function/script to perform the bulk repair.

#### [NEW] `src/lib/repair-covers.functions.ts`
- `getRepairDryRun()`: Identifies affected products and returns a report with counts.
- `executeRepairBatch(productIds)`: Processes a batch of products, repairing their URLs and verifying them anonymously.
- Returns status for each: `Uğurla düzəldildi`, `İşləkdir`, etc.

### 4. UI for Repair Process
Update the Seller Dashboard or a dedicated admin view to show progress.

#### [EDIT] `src/components/seller/AutoCoverDialog.tsx` (or new component)
- Add a "Repair All" mode.
- Display real-time progress in Azerbaijani: `Yoxlanılan`, `Düzəldilən`, `Uğursuz`.

## Technical Details
- **Batch Size**: 10 products per batch to prevent timeouts.
- **Verification**: After updating a product, the system will attempt to `fetch` the resulting URL anonymously to confirm it returns `200 OK` and `image/*`.
- **Database Safety**: Atomic updates to `image_url` and `image_urls`.
- **RLS**: No changes to bucket visibility; it remains private.

## Verification Plan
1. **Dry Run**: Execute the identification logic and verify the counts.
2. **Canary Test**: Repair 5 products (Steam, PS5, etc.) and verify accessibility.
3. **Bulk Execution**: Repair the remaining 93+ products in batches.
4. **Final Check**: Run a final audit to ensure zero products remain with the broken URL pattern.

# Plan - Bulk Product Cover Enrichment System

Implement a professional AAA-level automatic cover enrichment system for NextPlay.az to resolve missing or broken product images site-wide using IGDB.

## User Review Required

> [!IMPORTANT]
> The system will perform a **5-product canary test** first. Only after validation will it proceed to bulk processing. All actions are logged and resumable.

- Does the list of platform tags to be removed in Azerbaijani (e.g., "Steam Şəxsi Hesab", "1 il zəmanət") cover all common cases in your current catalog?
- The confidence threshold for automatic application is set to 90%. Matches between 75-89% will be held for manual review. Is this acceptable?

## Proposed Changes

### Backend Logic (`src/lib/`)

#### 1. Enhanced Title Normalization (`src/lib/title-normalization.ts`)
- Update `normalizeGameTitle` to aggressively strip listing-specific noise (Steam, P2/P3, account types, etc.) while preserving official edition names (Deluxe, Ultimate, etc.).
- Add support for common Azerbaijani listing patterns.

#### 2. Advanced IGDB Integration (`src/lib/igdb.server.ts`)
- Implement grouping of variant listings to minimize API calls and storage redundancy.
- Implement exponential backoff for 429/5xx errors.

#### 3. Core Processing & Safety (`src/lib/admin-igdb.functions.ts`)
- **Canary Test**: A specific function to run the pipeline on 5 diverse products.
- **Rollback Safety**: Preserve existing `image_url` before update; restore if public verification fails.
- **Public Verification**: Use `verifyPublicUrl` from `igdb-processor.server.ts` to check 200 OK + image content-type while logged out.
- **Permanent Storage**: Ensure all images are downloaded, validated (type/size), uploaded to `product-images` bucket, and signed with 10-year URLs.

### Frontend UI (`src/components/`)

#### 1. Admin Auto-Cover Panel (`src/components/AdminAutoCoverPanel.tsx`)
- Implement the "Canary Test" step with detailed results.
- Update the progress dashboard with Azerbaijani labels (Ümumi, Yoxlanılan, Xətalı, etc.).
- Add the manual review list for 75-89% confidence matches.
- Ensure the process is resumable and shows real-time counters.

## Technical Details
- **Tech Stack**: TanStack Start `createServerFn`, Supabase Admin (privileged access), IGDB API.
- **Storage Contract**: `auto-covers/{seller_id}/{normalized_title}/{igdb_id}.ext`.
- **Database Fields**: `image_url` (signed URL string), `image_urls` (array of signed URL strings), `product_cover_audit` (history/validation).
- **Concurrency**: Process in batches of 10-20 to avoid timeouts and rate limits.
- **Security**: IGDB credentials and Supabase Admin keys stay server-side.

## Detailed Steps

### Phase 1: Preparation & Title Normalization
- Refine `title-normalization.ts` with the specific list of tags provided in the prompt.
- Update `igdb.server.ts` to handle variant grouping.

### Phase 2: Implementation of Safety & Verification
- Update `admin-igdb.functions.ts` to include the canary test logic.
- Implement the rollback mechanism: store current values, attempt update, verify, and revert if failed.

### Phase 3: UI Enhancement
- Overhaul `AdminAutoCoverPanel.tsx` to match the requested Azerbaijani reporting and batch controls.
- Add "Canary Test" and "Resumable Bulk" states.

### Phase 4: Execution
- Run Canary Test.
- If successful, proceed with Bulk Processing.

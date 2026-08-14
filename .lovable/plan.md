# Plan: Optimization of Automatic Cover System

The Automatic Cover System is currently processing products one by one and in large batches that risk Edge Function timeouts. We will optimize the workflow to be more efficient, resilient, and provide better user feedback.

## User Review

- **Grouping**: Products with the same game (e.g., PS4, PS5, Steam versions) will be grouped into a single IGDB search.
- **Batched Processing**: Instead of one long request, the UI will process unique games in batches of 10-20.
- **Resumable State**: Results will be cached in the browser/database to prevent redundant searches.
- **Azerbaijani Localization**: Progress indicators and error messages will be fully localized.

## Technical Details

### 1. Title Normalization & Grouping
- Update `AutoCoverDialog.tsx` to group products by their normalized title (using `normalizeGameTitle`).
- Only unique normalized titles will be sent to the server for IGDB lookup.

### 2. Search Result Persistence
- Create a new table `product_cover_suggestions` to store IGDB search results for normalized titles. This prevents redundant API calls and allows resuming.
- Table structure: `normalized_title (text primary key), suggestions (jsonb), updated_at (timestamptz)`.

### 3. Progressive UI
- Update `AutoCoverDialog.tsx` to process the queue of normalized titles in small batches.
- Show granular progress: "X / Y oyun yoxlanıldı" (X / Y games checked).
- Implement retry logic with exponential backoff for 429/5xx errors.

### 4. Implementation Steps
- **Database**: Create `product_cover_suggestions` table with RLS.
- **Server Function**: Update `searchIgdbCovers` to:
    - Check if suggestions already exist for the batch of normalized titles.
    - Fetch from IGDB only for titles missing in cache.
    - Save new results back to `product_cover_suggestions`.
- **Frontend**: Rewrite `startSearch` in `AutoCoverDialog.tsx` to handle the new batched, resumable workflow.

```text
Workflow:
[Frontend] Group 750 products -> 80 unique titles
[Frontend] Request batch of 10 titles -> [Server] IGDB Search -> [DB] Save Results
[Frontend] Update UI "10 / 80" -> Repeat
[Frontend] Review & Apply
```

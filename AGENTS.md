# AGENTS

- Marketplace vs single-store behavior is gated by `MARKETPLACE_ENABLED` in src/lib/store-mode.ts; hide marketplace UI behind this flag instead of deleting code — why: the multi-seller structure must stay restorable.

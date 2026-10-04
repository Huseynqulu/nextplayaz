# AGENTS

- Marketplace vs single-store behavior is gated by `MARKETPLACE_ENABLED` in src/lib/store-mode.ts; hide marketplace UI behind this flag instead of deleting code — why: the multi-seller structure must stay restorable.
- AI support chat streams from the /api/support-chat server route (catalog search + human-handoff tools); live staff handoff uses support_chats/support_chat_messages with realtime — why: AI history stays in the browser, only live conversations need server storage and staff access.

# Fixes Applied — IPL + PKL Sports Auction

**Date:** 2026-11-26  
**Total Issues Fixed:** 20 / 20  

---

## 1. Frontend & React Runtime Fixes

1. **`GavelOverlay` Crash & Reset Bug ([GavelOverlay.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/components/GavelOverlay.tsx), [room/[code]/page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/room/%5Bcode%5D/page.tsx))**
   - Imported missing `useCallback` from `'react'` (fixed runtime `ReferenceError` and `TS2304` on SOLD/UNSOLD overlay mount).
   - Added `useEffect` resetting `isDismissed` whenever `phase` or `player?.id` changes, and cleaned up inner `soundTimer` (`setTimeout(..., 400)`) on unmount.
   - Added explicit `key={`${auctionState.current_player?.id || 'none'}-${auctionState.phase}`}` to `<GavelOverlay>` in [page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/room/%5Bcode%5D/page.tsx).

2. **Round 2 `unsold_auction` Trap & Stage Transitions ([page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/room/%5Bcode%5D/page.tsx))**
   - Updated live scoreboard rendering condition to include `currentStage === 'unsold_auction'` during active auction phases (`starting`, `announcing`, `bidding`, `sold`, `unsold`, `paused`).
   - Restricted `<UnsoldAuctionBoard>` rendering to `phase === 'unsold_round' || phase === 'round_break'`, and removed redundant `handleTransitionStage('unsold_auction')` in `onReEnter`.

3. **Socket.IO Listener Leaks & Audio Cleanup ([page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/room/%5Bcode%5D/page.tsx))**
   - Replaced 24 inline anonymous `socket.on(...)` registrations with named handler functions and deregistered all 24 exact handler references in `useEffect` cleanup.
   - Stopped active `voiceCommentary` in both `handleConfirmExit` and effect unmount cleanup.

4. **Single-Step Exit Confirmation Modal ([ExitAuctionModal.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/components/ExitAuctionModal.tsx))**
   - Simplified to a single confirmation dialog (`"Exit Auction?"` / `"Are you sure you want to leave this auction room?"` with `Cancel` and `Confirm Exit` buttons), preserving all auction state, timers, and listeners cleanup on confirm without terminating or pausing the room for other participants.

5. **Auth State Synchronization ([NavigationShell.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/components/NavigationShell.tsx), [NotificationsPopover.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/components/NotificationsPopover.tsx))**
   - Subscribed to `'ipl-auth-change'` alongside `'auth-change'` so navbar and notifications update immediately on login, registration, and logout.

6. **Eliminated Unauthenticated HTTP 401 Console Errors ([history/page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/history/page.tsx), [my-rooms/page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/my-rooms/page.tsx), [leaderboard/page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/leaderboard/page.tsx), [stats/page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/stats/page.tsx), [LeaderboardModal.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/components/LeaderboardModal.tsx))**
   - Gated `/api/history` and `/api/my-rooms` fetches behind `/api/auth/me` so logged-out visitors see clean auth prompts with zero HTTP 401 browser console errors.

7. **ESLint Warnings ([stats/page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/stats/page.tsx))**
   - Replaced raw `<img>` tags with `next/image` (`<Image>`), eliminating all `@next/next/no-img-element` warnings.

---

## 2. Backend, Security & Database Hardening

8. **Removed Production Secret Fallbacks & Spoofable Auth Bypasses ([server/index.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/index.ts))**
   - Removed hardcoded production `SESSION_SECRET` and `CLIENT_ORIGIN` fallbacks.
   - Restricted `isBotTest` / `bot_token_` bypasses strictly to `NODE_ENV === 'test'` or non-production `ALLOW_BOT_SIMULATION === 'true'`.

9. **Removed Silent Non-Test In-Memory DB Fallbacks & Fixed Concurrency ([src/lib/db.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/src/lib/db.ts))**
   - Removed silent `catch {}` in-memory fallbacks outside `NODE_ENV === 'test'` in `user.count`, `room.count`, `roomParticipant.upsert`, and `commentaryLog.create`.
   - Added `P2002` retry-as-update in `roomParticipant.upsert` to prevent MySQL InnoDB gap-lock unique constraint failures on concurrent `joinRoom` + `pickFranchise` updates, and typed `user_id` on `update`.

10. **Fixed Room Creation Ordering & Bid Sequence Collisions ([server/index.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/index.ts), [server/room.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/room.ts))**
    - Reordered `POST /api/rooms` to create `db.room` before invoking `roomManager.createRoom`, eliminating FK violations on initial commentary/participant persistence.
    - Added monotonic `current_player_bid_count` to `RoomRecord` so `bid_events` beyond bid #10 never collide on `[room_code, player_id, bid_sequence]`.
    - Cleared `next_player_handle` and `announcement_timeout_handle` on `removeRoom`.
    - Added missing-winner guard in `handleTimerExpired`.
    - Serialized `completeAuction` to execute `persistResults(results)` immediately before queueing the final `auction_completed` snapshot.

11. **Aligned Snapshot Hydration & Results Endpoints ([src/app/api/rooms/route.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/api/rooms/route.ts), [src/app/api/results/[code]/route.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/api/results/%5Bcode%5D/route.ts))**
    - Aligned Next.js fallback room snapshot fields with `RoomManager.createRoom` (`selected_player_ids`, `amount_spent`, `bids`, `stage`, etc.) and passed `dbRoom.sport_type` during `room_join` hydration.

---

## 3. IPL & PKL Rule Isolation

12. **PKL Pool, Starting 7, Trading & UI Labels ([server/room.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/room.ts), [page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/room/%5Bcode%5D/page.tsx), [PlayingXILeaderboardView.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/components/PlayingXILeaderboardView.tsx))**
    - Updated `startAuction` to pass `sourcePool.length` (235 for PKL, 274 for IPL) to `validateAuctionStart`.
    - Updated `respondTrade` counter-player lookup to check `getPklPlayerById` for PKL rooms.
    - Updated `submitPlayingXI` to validate 7 players / max 2 overseas for PKL and 11 players / max 4 overseas for IPL.
    - Updated `PlayingXILeaderboardView` to render `OS: X/2` for PKL and `OS: X/4` for IPL.
    - Updated `transitionStage` to populate `room.results` during `squad_evaluation` and `playing_xi_evaluation` without prematurely ending the room.
    - Updated `restoreRoomFromSnapshot` to prioritize `rawSettings.sport_type === 'PKL'` and default empty pools by sport.

---

## 4. My Rooms vs History & Stale Room Isolation

13. **Database Queries, Boot Restoration & Leave Action ([my-rooms/route.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/api/my-rooms/route.ts), [my-rooms/page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/my-rooms/page.tsx), [history/route.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/api/history/route.ts), [history/page.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/history/page.tsx), [server/db/index.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/db/index.ts))**
    - Excluded `abandoned` and unassociated `bot-*` test rooms from My Rooms and History APIs; deduplicated participant counts.
    - Excluded `lobby` rooms from History `ongoing` (requires `status === 'live'` and non-lobby stage/phase).
    - Defaulted History to `completed` with `?tab=completed|ongoing` query support.
    - Added `POST /api/my-rooms` (`leave` / `archive`) and UI Leave/Archive action buttons on active/lobby cards in `/my-rooms`.
    - Scoped `loadAllActiveRoomCodes()` on server startup to recent (`updated_at >= 24h`) non-bot rooms in `['lobby', 'live']`.

---

## 5. Development Monitoring & Automated Test Suite

14. **Dev-Only Error Monitor ([src/lib/dev-monitor.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/src/lib/dev-monitor.ts), [src/components/DevErrorMonitor.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/components/DevErrorMonitor.tsx), [src/app/layout.tsx](file:///c:/Users/laksh/IPL-PKL/PKL1/src/app/layout.tsx), [src/lib/api.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/src/lib/api.ts), [server/index.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/index.ts))**
    - Added lightweight `NODE_ENV === 'development'`-only monitoring for client `window.error` / `unhandledrejection`, API failures (`logDevApiFailure` with method/endpoint), Socket.IO disconnects, and server uncaught exceptions / unhandled rejections with secret redaction (`sanitizeLogMessage`).

15. **Test Suite Repairs & Coverage Expansion ([vitest.config.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/vitest.config.ts), [comprehensive-e2e-audit.test.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/tests/comprehensive-e2e-audit.test.ts), [auction-freezing-and-exit.test.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/tests/auction-freezing-and-exit.test.ts), [player-discovery-history-results.test.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/server/tests/player-discovery-history-results.test.ts), [scripts/browser-verify.ts](file:///c:/Users/laksh/IPL-PKL/PKL1/scripts/browser-verify.ts))**
    - Added `@` and `@shared` aliases and 20s DB integration timeouts in `vitest.config.ts`.
    - Fixed TypeScript mismatches in `auction-freezing-and-exit.test.ts` and `player-discovery-history-results.test.ts`.
    - Updated `scripts/browser-verify.ts` cookie (`ipl_session_token`) and socket event names (`request_next_player`, `place_bid`).
    - Added `server/tests/comprehensive-e2e-audit.test.ts` (4 tests covering Auth, My Rooms vs History isolation & leave, IPL >10-bid concurrency/exit/reconnect, and PKL 235-player/₹5Cr/Starting-7 lifecycle).

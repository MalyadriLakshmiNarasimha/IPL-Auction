# SOCKET.IO REAL-TIME SPECIFICATION

## Project: IPL Auction & Team Management Ecosystem
**Namespace:** `/`
**Server Port:** `3001` (Authoritative Node.js + Socket.IO Server)

---

## 1. Connection & Authentication Handshake

All client Socket.IO connections must supply an authorized authentication token in `socket.auth`:
```ts
const socket = io('http://localhost:3001', {
  auth: {
    token: sessionToken, // Valid session token from auth
  },
  transports: ['websocket'],
});
```
Connections lacking a valid session token are immediately rejected with `connect_error: "Authentication token required"`.

---

## 2. Client-to-Server Events

| Event Name | Payload | Authorization | Description |
|---|---|---|---|
| `room_join` | `{ room_code, display_name, session_id, is_spectator? }` | Any authenticated user | Joins the room room channel as a Manager or Spectator. |
| `room_leave` | `{ room_code, session_id }` | Joined participant | Gracefully leaves the active room. |
| `franchise_pick` | `{ room_code, session_id, franchise }` | Manager only | Claims an available IPL franchise (CSK, MI, RCB, etc.). |
| `settings_update`| `{ room_code, session_id, settings }` | Host only | Updates purse, squad size, or countdown timer duration. |
| `start_auction` | `{ room_code, session_id }` | Host only | Commences main live auction bidding with synchronized countdown. |
| `place_bid` | `{ room_code, session_id, increment }` | Manager with franchise | Submits an authoritative bid increment (₹20L - ₹2 Cr ladder). |
| `withdraw_bid` | `{ room_code, session_id }` | Current bidder | Withdraws current bid before timer expiration. |
| `host_pause` | `{ room_code, session_id }` | Host only | Pauses active auction countdown timer. |
| `host_resume` | `{ room_code, session_id }` | Host only | Resumes paused countdown timer. |
| `host_skip` | `{ room_code, session_id }` | Host only | Skips current player, sending them to the unsold pool. |
| `stage_change` | `{ room_code, session_id, stage, duration_seconds? }` | Host only | Advances stage (`unsold_auction`, `trading_window`, `squad_evaluation`, `playing_xi_selection`, `championship_recap`). |
| `unsold_pool_configure` | `{ room_code, session_id, player_ids, order_type? }` | Host only | Configures players re-entering Round 2 Unsold Auction. |
| `trade_propose` | `{ room_code, session_id, target_participant_id, offered_player_id, requested_player_id }` | Manager | Submits 1-for-1 player trade proposal to opponent manager. |
| `trade_respond` | `{ room_code, session_id, trade_id, action, counter_player_id? }` | Trade Recipient | Responds with `'accept'`, `'reject'`, or `'counter'`. |
| `trade_cancel` | `{ room_code, session_id, trade_id }` | Proposing Manager | Cancels an unaccepted pending trade offer. |
| `playing_xi_save_draft` | `{ room_code, session_id, submission }` | Manager | Persists draft matchday XI lineup without locking. |
| `playing_xi_submit` | `{ room_code, session_id, submission }` | Manager | Formally locks and submits final 11-player lineup. |
| `send_chat` | `{ room_code, session_id, message }` | Any participant | Posts a message to the room chat channel. |
| `send_reaction` | `{ room_code, session_id, emoji }` | Any participant | Emits live reaction icon (🔥, 😱, 💰, 😂, 👏). |
| `request_sync` | `{ room_code, session_id }` | Any participant | Requests immediate full authoritative state sync payload. |

---

## 3. Server-to-Client Events

| Event Name | Payload | Frequency / Trigger | Description |
|---|---|---|---|
| `state_sync` | `{ room_code, settings, participants, auction_state, results, trades, pending_trade_offers, playing_xi_submissions, commentary_events }` | On join, reconnect, or stage change | Complete room state delivery for total synchronization. |
| `timer_tick` | `{ timer_remaining, server_time }` | Every 200ms during bidding | High-frequency synchronized countdown clock tick. |
| `bid_success` | `{ bid, auction_state }` | On verified valid bid | Confirms successful bid and updates leader strip. |
| `bid_rejected` | `{ reason }` | On invalid bid attempt | Informs manager why bid was disallowed (e.g. insufficient purse). |
| `player_sold` | `{ player, winner_id, winner_name, final_price, auction_state }` | On timer expiration with active bidder | Broadcasts sold celebration and gavel strike event. |
| `player_unsold`| `{ player, auction_state }` | On timer expiration with 0 bids | Moves player to unsold pool and triggers next cycle. |
| `trade_offer_received` | `TradeOffer` | On incoming trade proposal | Prompts recipient manager with trade acceptance dialog. |
| `trade_executed` | `{ trade, auction_state }` | On accepted trade | Confirms atomic squad swap across both franchises. |
| `new_commentary`| `CommentaryEvent` | On bidding battle, milestone, record | Adds live narrative entry to commentary marquee. |
| `new_chat` | `ChatMessage` | On user message | Renders message in room chat feed. |
| `new_reaction` | `Reaction` | On user reaction | Displays floating emoji animation in spectator rail. |
| `auction_ended`| `AuctionResults` | On stage transition to final recap | Delivers final competition rankings, recap, and awards. |


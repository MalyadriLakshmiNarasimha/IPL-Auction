# DATABASE CHANGELOG

## Project: IPL Auction & Team Management Ecosystem
**Database:** MySQL via Prisma ORM 6.4.1
**Datasource:** `ipl_auction` on `localhost:3306`

---

## 1. Schema Architecture Overview

The database schema maintains persistent state across users, authentication sessions, active rooms, point-in-time room snapshots, authoritative bid events, and finalized auction competition results.

```
+--------------------+        +--------------------+
|       User         |<-------|      Session       |
| (users table)      |        | (sessions table)   |
+--------------------+        +--------------------+
          |
          | 1:N
          v
+--------------------+        +--------------------+
|       Room         |<-------|    RoomSnapshot    |
| (rooms table)      |        | (room_snapshots)   |
+--------------------+        +--------------------+
          |                            |
          | 1:N                        | (Stores serialized state,
          v                            |  stage, phase, timer, squads)
+--------------------+                 v
|      BidEvent      |        +--------------------+
| (bid_events table) |        |       Result       |
+--------------------+        | (results table)    |
                              +--------------------+
```

---

## 2. Migration Log

### Migration 1: `20261105000000_init`
- **Initial Models**:
  - `User`: Primary user accounts (`id`, `name`, `email`, `password_hash`, `created_at`, `updated_at`).
  - `Session`: HTTP-only cookie session persistence (`id`, `session_token`, `user_id`, `expires_at`, `created_at`).
  - `Room`: Auction rooms (`room_code` [VARCHAR(6)], `name`, `host_user_id`, `status`, `created_at`, `updated_at`).
  - `Result`: Complete auction results and leaderboards stored as JSON (`id`, `room_code`, `total_players_auctioned`, `total_money_spent`, `most_expensive_player`, `biggest_bidding_war`, `awards`, `leaderboard`, `season_recap`, `completed_at`).

### Migration 2: `20261106054456_add_room_snapshots_and_bid_events`
- **Additive Resilience Models**:
  - `RoomSnapshot`:
    ```prisma
    model RoomSnapshot {
      id             String   @id @default(cuid())
      room_code      String   @db.VarChar(6)
      schema_version Int      @default(1)
      stage          String   @db.VarChar(32)
      phase          String   @db.VarChar(32)
      state_data     Json
      created_at     DateTime @default(now())
      room           Room     @relation(fields: [room_code], references: [room_code], onDelete: Cascade)

      @@index([room_code, created_at])
      @@map("room_snapshots")
    }
    ```
  - `BidEvent`:
    ```prisma
    model BidEvent {
      id             String   @id @default(cuid())
      room_code      String   @db.VarChar(6)
      player_id      String   @db.VarChar(64)
      bid_sequence   Int
      participant_id String   @db.VarChar(64)
      amount         BigInt
      created_at     DateTime @default(now())
      room           Room     @relation(fields: [room_code], references: [room_code], onDelete: Cascade)

      @@unique([room_code, player_id, bid_sequence])
      @@index([room_code, player_id])
      @@map("bid_events")
    }
    ```

---

## 3. Concurrency Protection & Idempotency Rules

1. **Bid Event Deduping**: `@@unique([room_code, player_id, bid_sequence])` prevents duplicate bids or replay attacks from persisting.
2. **Snapshot Serial Queue**: Each room serializes state writes through a in-memory promise queue in `RoomManager` to eliminate race conditions between rapid bids and timer updates.
3. **Completed Room Status Guard**: Room status updates check existing database state before updating to prevent in-flight snapshots from downgrading completed rooms back to live status.
4. **Cascade Integrity**: Foreign keys on `host_user_id` and `room_code` ensure orphaned snapshots, sessions, and events are cleaned up deterministically upon entity deletion.


# API DOCUMENTATION

## Project: IPL Auction & Team Management Ecosystem
**Base URL**: `http://localhost:3000` (Next.js Client/API Routes) / `http://localhost:3001` (Authoritative Server)

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new user account with bcrypt password hashing and issues an HTTP-only session cookie.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses**:
  - `201 Created`: `{ "user": { "id": "...", "name": "...", "email": "..." } }` (Sets cookie `session_token`)
  - `400 Bad Request`: Validation errors or email already registered
  - `429 Too Many Requests`: Rate limit exceeded (> 10 attempts per minute)

---

### `POST /api/auth/login`
Verifies user credentials and establishes an authenticated session.
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "user": { "id": "...", "name": "...", "email": "..." } }`
  - `401 Unauthorized`: Invalid email or password

---

### `POST /api/auth/logout`
Destroys the server-side session in MySQL and invalidates the client cookie.
- **Responses**:
  - `200 OK`: `{ "success": true }`

---

### `GET /api/auth/me`
Retrieves profile data for the currently authenticated user based on session cookie or `Authorization: Bearer <token>` header.
- **Responses**:
  - `200 OK`: `{ "user": { "id": "...", "name": "...", "email": "..." } }`
  - `401 Unauthorized`: Not logged in or expired session

---

## 2. Auction & Room Endpoints

### `POST /api/rooms` (Protected)
Creates a new auction room with a unique 6-character room code.
- **Headers**:
  - `Authorization: Bearer <sessionToken>` OR cookie `session_token`
- **Request Body**:
  ```json
  {
    "room_name": "Twilight Championship Arena",
    "settings": {
      "purse": 1000000000,
      "squad_size": 15,
      "timer_seconds": 15
    }
  }
  ```
- **Responses**:
  - `201 Created`: `{ "room_code": "AB12CD", "name": "...", "created_at": "..." }`
  - `401 Unauthorized`: Missing or invalid session token

---

### `GET /api/results/:roomCode`
Retrieves permanently stored auction results, leaderboards, awards, and season recap for a completed room.
- **Responses**:
  - `200 OK`: Full `AuctionResults` JSON object
  - `404 Not Found`: Results not found for specified room code

---

### `GET /health` (Authoritative Server: port 3001)
Operational readiness probe checking MySQL database connectivity and system status.
- **Responses**:
  - `200 OK`: `{ "status": "ok", "db": "connected", "time": 1793954315027 }`
  - `503 Service Unavailable`: `{ "status": "degraded", "db": "disconnected", "error": "Database connection failed" }`


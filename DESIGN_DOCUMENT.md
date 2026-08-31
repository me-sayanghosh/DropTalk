# DropTalk — System Architecture & Design Document

**Document Status:** Live Reference (Auto-generated from codebase scan)  
**Version:** 2.0.0  
**Last Updated:** 2026-08-30  
**Target Environment:** Node.js (v18+, ES Modules), React 18 (Vite 5), MongoDB (Mongoose 8), Redis (ioredis 5), WebRTC, Socket.IO 4, Google Gemini 2.0 Flash API

---

## 1. Executive Overview

**DropTalk** is a high-performance, real-time, privacy-first messaging and collaboration platform built with a **Feature-Based Modular Architecture** on both the frontend and backend to support horizontal scalability, zero-trust security (via client-side E2EE), and intelligent workspace assistance (via Google Gemini AI).

### Core Pillars
1. **Zero-Trust Security**: Client-side End-to-End Encryption (E2EE) using RSA-OAEP 2048-bit key exchange and AES-GCM 256-bit payload encryption via the native Web Crypto API.
2. **Sub-Millisecond Synchronization**: Event-driven WebSockets with Socket.IO backed by a Redis Pub/Sub adapter (`@socket.io/redis-adapter`) for multi-node horizontal scaling.
3. **AI Workspace Copilot**: Direct integration with Google Gemini 2.0 Flash for real-time conversation summarization and contextual smart reply generation.
4. **Rich Communication Suite**: Public/Private/Ephemeral channels, Direct Messages (DMs) with accept/reject workflow, Threaded discussions, WebRTC Voice & Video calling, message forwarding, and presence heatmaps.
5. **Resilient Offline Architecture**: Client-side LocalStorage/IndexedDB queuing with message backfill upon reconnection via `/api/rooms/backfill`.
6. **Passwordless-First Auth**: Email OTP (6-digit, 10-minute TTL, bcrypt-hashed) and Google OAuth 2.0, with automatic username setup flow for new users.

---

## 2. High-Level System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │           React 18 (Vite 5) Frontend         │
                               │  - AuthContext / ToastContext                │
                               │  - Web Crypto API (RSA-OAEP + AES-GCM)      │
                               │  - Socket.IO Client (v4)                    │
                               │  - Framer Motion / GSAP / OGL animations    │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                    HTTP REST / WebSocket (Socket.IO)
                                                      │
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                           Node.js / Express API & Socket.IO Gateway (Port 4000)            │
│                                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Auth Feature │  │ Rooms Feature│  │  DM Feature  │  │ E2EE Keys    │  │ AI Feature  │  │
│  │ OTP + Google │  │ CRUD + Join  │  │  Accept/Rej  │  │ per-user RSA │  │ Gemini 2.0  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │Messages Engine│  │WebRTC Calls │  │ Presence Svc │  │ Moderation   │  │  Upload Svc │  │
│  │ Threads, React│  │ WS Signaling│  │Redis Heartbt │  │ Kick/Ban/Mute│  │  Multer 50MB│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
└──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┘
                       │                      │                      │
                       ▼                      ▼                      ▼
           ┌───────────────────────┐┌───────────────────────┐┌──────────────────────┐
           │   MongoDB (Mongoose 8)││   Redis (ioredis 5)   ││  Google Gemini API   │
           │  Users, Rooms,        ││  Presence hash-map,   ││  gemini-2.0-flash    │
           │  Messages, CallLogs,  ││  Online set, Heartbeat││  Summarize + Suggest │
           │  Notifications, OTPs  ││  TTL keys, Pub/Sub    ││  REST API v1beta     │
           └───────────────────────┘└───────────────────────┘└──────────────────────┘
```

---

## 3. Authentication & Authorization

### 3.1 Authentication Flows

#### Email OTP (Passwordless)
1. `POST /api/auth/send-otp` — generates a 6-digit OTP, bcrypt-hashes it, stores in MongoDB `Otp` collection with 10-minute TTL, dispatches via Nodemailer.
2. `POST /api/auth/verify-otp` — validates OTP, consumes it, upserts the `User` record, returns `accessToken` + `refreshToken`.

#### Google OAuth 2.0
- `POST /api/auth/google` — verifies Google ID token via `google-auth-library`. Falls back to `jwt.decode` if no `GOOGLE_CLIENT_ID` is set (dev mode).
- `POST /api/auth/google-direct` — accepts raw `{email, name, picture, googleId}` from a client-side Google userinfo call.

#### Token Management
- **Access Token**: Short-lived JWT (default 15 min), signed with `JWT_SECRET`. Payload: `{ sub, username }`.
- **Refresh Token**: UUID v4, stored in `user.refreshTokens[]` with `expiresAt` (default 7 days) and `family` UUID for rotation detection.
- **Token Rotation**: On refresh, the old token is revoked and a new one issued in the same family. If a revoked token is reused, the entire family is invalidated.
- **New User Flow**: First-time users get `needsUsername: true` and an auto-generated username, redirecting to `/set-username`.

### 3.2 Custom Status
- `PUT /api/auth/custom-status` — sets `customStatus.emoji` (max 10 chars) and `customStatus.text` (max 80 chars).

### 3.3 Middleware
- `requireAuth` — validates `Authorization: Bearer <token>`, attaches `req.user = { id, username }`.
- `requireRole(role)` / `requireAtLeastRole(role)` — checks `req.roomMember.role` against `ROLE_HIERARCHY = { owner: 3, moderator: 2, member: 1 }`.
- **Rate Limiting**: Auth routes capped at 30 requests / 15-minute window.

---

## 4. Data Models & Database Schemas (MongoDB)

### 4.1 `User` Schema
```javascript
{
  username:     String (unique, 3–24 chars, [a-zA-Z0-9_-]),
  name:         String (default ''),
  email:        String (unique, lowercase),
  profileImage: String (default ''),
  googleId:     String (sparse index, nullable),
  needsUsername: Boolean (default false),    // triggers /set-username onboarding
  passwordHash: String (unused, reserved),
  refreshTokens: [{ token, family, createdAt, expiresAt }],
  revokedTokens: [{ token, revokedAt, family }], // for reuse detection
  notificationSettings: {
    groupNotifications:  Boolean (default true),
    directNotifications: Boolean (default true),
    backgroundSync:      Boolean (default true),
  },
  customStatus: { emoji: String, text: String },
  // Mongoose timestamps: createdAt, updatedAt
}
```

> **Note**: No `publicKey` on the User document. RSA public keys are transmitted via the Socket.IO handshake auth (`publicKeyJwk`) and stored per-room in `Room.encryptedKeys[]`.

### 4.2 `Room` Schema
```javascript
{
  name:       String (unique, maxlength 100),
  createdBy:  ObjectId → User,
  type:       enum['public', 'private', 'ephemeral'],  // 'encrypted' removed
  isDM:       Boolean (default false),
  dmStatus:   enum['pending', 'accepted'],
  dmInitiator: ObjectId → User,
  members: [{
    user:     ObjectId → User,
    role:     enum['owner', 'moderator', 'member'],    // 'admin' renamed to 'moderator'
    joinedAt: Date,
    muted:    Boolean,
  }],
  encryptedKeys: [{ user, key, keyId }], // per-user RSA-encrypted AES room keys
  pendingRequests: [{ user, requestedAt }],
  bannedUsers:    [{ user, bannedAt, bannedBy }],
  pinnedMessages: [ObjectId → Message],
  topic:     String (maxlength 250),
  category:  String (default 'General', maxlength 50),
  slowMode:  Number (default 0),   // per-message cooldown in seconds
  expiresAt: Date (nullable),      // MongoDB TTL index for ephemeral rooms
  // Mongoose timestamps: createdAt, updatedAt
}
// TTL Index: roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

### 4.3 `Message` Schema
```javascript
{
  room:          ObjectId → Room (index),
  sender:        ObjectId → User,
  clientMsgId:   String (unique sparse — client-side deduplication),
  text:          String (maxlength 2000),
  attachments:   [{ url, filename, fileType: enum['image','video','audio','document'], mimeType, size }],
  parentMessage: ObjectId → Message (non-null = thread reply),
  replyTo:       ObjectId → Message (inline quote-reply, distinct from threads),
  deleted:       Boolean,
  deletedBy:     ObjectId → User,
  deletedFor:    [ObjectId → User],  // "delete for me" soft-delete per user
  reported:      Boolean,
  edited:        Boolean,
  editedAt:      Date,
  forwardedFrom: { senderUsername: String, roomName: String },
  mentions:      [ObjectId → User],
  reactions:     [{ emoji: String, users: [ObjectId → User] }],
  // Mongoose timestamps: createdAt, updatedAt
}
// Indexes: { room, parentMessage, createdAt } + unique sparse { clientMsgId }
```

### 4.4 `CallLog` Schema
```javascript
{
  caller:          ObjectId → User,
  receiver:        ObjectId → User (nullable — null for room calls),
  room:            ObjectId → Room (nullable — null for 1-on-1 calls),
  type:            enum['voice', 'video'],                               // was 'audio' → now 'voice'
  status:          enum['completed', 'missed', 'rejected', 'cancelled'], // 'answered' → 'completed'
  durationSeconds: Number,
  startedAt:       Date,
  endedAt:         Date,
}
```

### 4.5 `Notification` Schema
```javascript
{
  user:      ObjectId → User (index),
  actor:     ObjectId → User,
  type:      enum['mention', 'dm', 'reaction', 'system', 'channel'],
  title:     String,
  message:   String,
  link:      String,
  roomId:    String,
  messageId: String,
  read:      Boolean (default false, index),
}
```

### 4.6 `Otp` Schema
```javascript
{
  email:     String (index, lowercase),
  otpHash:   String (bcrypt-hashed 6-digit code),
  expiresAt: Date (MongoDB TTL-indexed — auto-expires at expiresAt),
}
```

---

## 5. API Reference

### 5.1 Authentication (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/send-otp` | — | Send 6-digit email OTP (rate-limited: 30/15min) |
| POST | `/verify-otp` | — | Verify OTP → returns tokens + user |
| POST | `/google` | — | Google ID token sign-in/register |
| POST | `/google-direct` | — | Google userinfo payload sign-in/register |
| POST | `/refresh` | — | Rotate refresh token (reuse detection) |
| POST | `/logout` | ✓ | Revoke current refresh token |
| GET | `/me` | ✓ | Fetch current user profile |
| GET | `/check-username/:username` | ✓ | Availability check (case-insensitive) |
| PUT | `/profile` | ✓ | Update `name`, `username`, `profileImage` |
| PUT | `/username` | ✓ | Dedicated username endpoint (post-registration) |
| GET | `/users/search?q=` | ✓ | Fuzzy search users by username/name/email (max 20) |
| PUT | `/custom-status` | ✓ | Set custom status emoji + text |

### 5.2 Rooms (`/api/rooms`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | List all non-DM rooms with last message + member count |
| POST | `/` | ✓ | Create room (`public`/`private`/`ephemeral`) |
| GET | `/:roomId` | ✓ | Get room details |
| PUT | `/:roomId` | ✓ | Update room name/type (owner only) |
| PUT | `/:roomId/settings` | ✓ | Update topic, category, slowMode (owner/moderator) |
| POST | `/:roomId/request-join` | ✓ | Request to join a private room |
| GET | `/:roomId/pending-requests` | ✓ | List pending join requests (owner/moderator) |
| POST | `/:roomId/pending-requests/:requestId/grant` | ✓ | Approve join request |
| POST | `/:roomId/pending-requests/:requestId/deny` | ✓ | Reject join request |

**Default Rooms**: On first `GET /`, if no rooms exist, three default rooms are auto-created: `general`, `random`, `lounge`.

### 5.3 Messages (`/api/rooms`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:roomId/messages` | ✓ | Paginated messages (`after`, `before`, `limit`; server-side cache 60s) |
| GET | `/:roomId/messages/search?q=` | ✓ | Full-text search within room (max 30 results) |
| POST | `/backfill` | ✓ | Batch sync missed messages for up to 20 rooms |
| GET | `/:roomId/messages/:messageId/replies` | ✓ | Fetch thread replies (max 100) |
| GET | `/:roomId/threads` | ✓ | Aggregate view of all threads with reply counts (max 50) |

### 5.4 Direct Messages (`/api/dm`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/send` | ✓ | Send initial DM (creates room if needed, `dmStatus: 'pending'`) |
| GET | `/conversations` | ✓ | List all DM conversations with partner info + last message |
| POST | `/:roomId/accept` | ✓ | Recipient accepts the DM request |
| DELETE | `/:roomId` | ✓ | Remove/reject DM conversation + all messages |
| GET | `/:roomId/messages` | ✓ | Fetch DM message history |

### 5.5 E2EE Keys (`/api/rooms`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/:roomId/keys` | ✓ | Store user's RSA-encrypted AES room key |
| GET | `/:roomId/keys` | ✓ | Retrieve caller's own encrypted key(s) |
| GET | `/:roomId/keys/all` | ✓ | Retrieve all members' encrypted keys (for distribution) |

### 5.6 AI (`/api/rooms`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/:roomId/summarize` | ✓ | Summarize last 200 messages via Gemini 2.0 Flash |
| POST | `/:roomId/suggest` | ✓ | Suggest 3 reply completions based on last 50 messages |

### 5.7 Calls (`/api/calls`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/history` | ✓ | Fetch call logs (last 100, populated) |
| POST | `/log` | ✓ | Create a call log entry |
| DELETE | `/history` | ✓ | Clear all call history for current user |

### 5.8 Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | List notifications (max 50) + unread count |
| PUT | `/read-all` | ✓ | Mark all as read |
| PUT | `/:id/read` | ✓ | Mark single notification as read |
| DELETE | `/clear-all` | ✓ | Delete all notifications |
| DELETE | `/room/:roomId` | ✓ | Auto-clear notifications for a viewed room |
| DELETE | `/:id` | ✓ | Delete single notification |
| PUT | `/settings` | ✓ | Update notification preferences |

### 5.9 Moderation (`/api/rooms`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/:roomId/members/:userId/kick` | ✓ (mod+) | Kick (optionally ban) a member |
| POST | `/:roomId/members/:userId/mute` | ✓ (mod+) | Toggle mute on a member |
| POST | `/:roomId/members/:userId/role` | ✓ (owner) | Promote/demote to `moderator` or `member` |
| GET | `/:roomId/members` | ✓ | List members with roles |
| POST | `/:roomId/ban/:userId` | ✓ (mod+) | Ban user (removes from members + encrypted keys) |
| POST | `/:roomId/unban/:userId` | ✓ (mod+) | Remove ban |
| GET | `/:roomId/banned` | ✓ (mod+) | List banned users |
| DELETE | `/:roomId/messages/:messageId` | ✓ (mod+) | Soft-delete a message |
| POST | `/:roomId/messages/:messageId/report` | ✓ | Flag a message as reported |

### 5.10 File Upload (`/api/upload`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | ✓ | Single file upload (max 50 MB, UUID-named) |
| POST | `/multiple` | ✓ | Up to 5 files at once |

**Allowed MIME types**: JPEG, PNG, GIF, WebP, SVG, PDF, TXT, MP3, WAV, OGG, WebM (audio), MP4, WebM (video).

---

## 6. Real-Time WebSocket Architecture (Socket.IO)

### 6.1 Connection & Authentication
- Socket.IO attaches to the HTTP server on port 4000.
- JWT is verified from `socket.handshake.auth.token`; `socket.user = { id, username, name, profileImage, publicKeyJwk }`.
- Each socket joins `user:<userId>` for targeted events (mentions, DMs, notifications).

### 6.2 Redis Pub/Sub Adapter
- When Redis is available, `@socket.io/redis-adapter` bridges events across server instances using separate `pubClient`/`subClient`.
- **Fallback**: If Redis is unavailable, an `InMemoryRedis` singleton is used and the adapter is skipped (single-node only, auto-detected at boot).

### 6.3 Socket Event Catalog

#### Room Events
| Client → Server | Server → Client | Description |
|---|---|---|
| `room:join` | — | Join socket room; response via ack `{ ok, online, members, roomType }` |
| `room:leave` | `room:user-left` | Leave socket room |
| `room:kick` | `room:user-kicked` | Kick a member (moderator+); also emits `room:kicked` to target |
| `room:request-join` | `room:new-request` | Request to join a private room (socket alternative to HTTP) |
| `room:grant-join` | `room:request-granted` | Approve a pending join request; also emits `room:auto-join` to grantee |
| `room:deny-join` | `room:request-denied` | Deny a pending join request |
| — | `room:user-joined` | Broadcast: user joined the room |
| — | `room:kicked` | Targeted to the kicked user (`{ roomId, banned }`) |
| — | `room:auto-join` | Targeted to grantee after join request approved |
| — | `room:online` | Updated online members + roles list for the room |

#### Message Events
| Client → Server | Server → Client | Description |
|---|---|---|
| `message:send` | `message:new` | Send a message (with optional `forwardedFrom` field for forwarding; `clientMsgId` dedup) |
| `message:edit` | `message:edited` | Edit own message text; sets `edited: true` + `editedAt` |
| `message:delete` | `message:deleted` | Soft-delete a message (sender or moderator+) |
| `message:delete-for-me` | `message:deleted-for-me` | Personal soft-delete — hides message only for the sender |
| `message:react` | `message:reaction` | Toggle an emoji reaction; payload `{ roomId, messageId, reactions[] }` |
| `message:thread-reply` | `message:new` + `message:thread-reply` | Post a reply in a thread (`parentMessageId` required) |
| `message:pin` | `message:pinned` | Pin a message; payload `{ roomId, messageId, pinnedMessages[] }` |
| `message:unpin` | `message:unpinned` | Unpin a message; payload `{ roomId, messageId, pinnedMessages[] }` |
| `message:read` | `message:read` | Mark messages as read; broadcasts `{ roomId, userId, lastReadMessageId }` to room |
| — | `message:mention` | Targeted to mentioned users `{ roomId, messageId, fromUsername, text, roomName }` |

#### Presence & Typing Events
| Client → Server | Server → Client | Description |
|---|---|---|
| `user:typing` | `user:typing` | User is typing; broadcasts `{ roomId, user }` to others in room; 3s Redis TTL |
| `user:stopped-typing` | `user:stopped-typing` | User stopped typing; broadcasts `{ roomId, userId }` to others in room |
| `presence:request-map` | ack callback | Request full presence map for all online users (response via ack, not a named event) |
| — | `presence:update` | Global broadcast on connect/disconnect/manual status change `{ userId, status, currentRoom }` |

#### DM Events (server → client only)
| Event | Description |
|---|---|
| `dm:new-request` | New DM initiated; targeted to recipient |
| `dm:accepted` | DM request accepted; targeted to initiator |
| `dm:removed` | DM conversation deleted; targeted to both participants |

#### E2EE Key Events
| Client → Server | Server → Client | Description |
|---|---|---|
| `room:key-store` | — | Store an RSA-encrypted AES room key for another member |
| `room:key-request` | — | Request the current room's encrypted key (ack-based) |
| `room:key-share` | `room:key-receive` | Push an encrypted room key to a specific member |
| — | `room:key-share-request` | Server asks key holder to share key with a new joiner `{ roomId, requesterId, requesterPublicKeyJwk }` |

#### WebRTC Signaling Events
| Event | Direction | Description |
|---|---|---|
| `webrtc:call-initiate` | c → s → target | Initiate call (by `targetUserId` for 1-on-1, or `roomId` for group) |
| `webrtc:call-incoming` | s → target | Incoming call notification |
| `webrtc:call-accept` | c → s → caller | Accept the call |
| `webrtc:call-accepted` | s → caller | Acceptance confirmation |
| `webrtc:call-reject` | c → s → caller | Reject the call |
| `webrtc:call-rejected` | s → caller | Rejection notification |
| `webrtc:offer` | c → s → target | Relay SDP offer |
| `webrtc:answer` | c → s → caller | Relay SDP answer |
| `webrtc:ice-candidate` | c → s → target | Relay ICE candidate |
| `webrtc:call-end` | c → s → target | End the call |
| `webrtc:call-ended` | s → target | Call end notification |

---

## 7. End-to-End Encryption (E2EE) Implementation

All crypto operations use the browser-native **Web Crypto API** (`window.crypto.subtle`) — no external library required.

### 7.1 Key Generation & Storage
- On first connection, client generates an **RSA-OAEP 2048-bit** key pair (SHA-256).
- JWK representation persisted in `localStorage` under `chatapp:userRsaKeys`.
- Public key JWK transmitted in Socket.IO handshake auth (`publicKeyJwk`).

### 7.2 Room Key Exchange Protocol
1. Room owner generates a **256-bit AES-GCM** symmetric key (`generateRoomKey()`).
2. For each member, owner encrypts the raw AES key with that member's RSA public key (`encryptRoomKey()`), producing Base64-encoded ciphertext.
3. Per-user encrypted key stored in `Room.encryptedKeys[]` via `POST /api/rooms/:roomId/keys` or `keys:share` socket event.
4. Members fetch their key via `GET /api/rooms/:roomId/keys` and decrypt with their private key (`decryptRoomKey()`).

### 7.3 Message Encryption
- `encryptText(aesKey, plaintext)` — prepends 12-byte random IV to AES-GCM ciphertext, Base64-encodes combined buffer.
- `decryptText(aesKey, ciphertextBase64)` — splits IV and ciphertext, decrypts in memory.
- Decrypted AES keys stored in-memory only (`roomKeys` map, not persisted). Banning removes user's `encryptedKeys` entry, revoking future access.

---

## 8. Presence & Heartbeat System

### 8.1 Redis Data Structures
| Key Pattern | Type | Purpose |
|---|---|---|
| `presence` | Hash | `userId → JSON({ status, currentRoom, lastSeen })` |
| `presence:online` | Set | Set of currently-online user IDs |
| `presence:connCount:<userId>` | String | Connection count (multi-tab support) |
| `presence:heartbeat:<userId>:<socketId>` | String | TTL=60s, refreshed every 30s |
| `typing:<roomId>:<userId>` | String | TTL=3s, set on typing start |

### 8.2 Connection Lifecycle
1. **On `connection`**: `setPresence(online)` → `incrementPresence()` → `startHeartbeat()` (30s interval). Broadcasts `presence:update` globally.
2. **On `disconnect`**: Clears heartbeat, emits `room:user-left` to joined rooms, `decrementPresence()`. If `connCount` reaches 0, broadcasts `presence:update offline`.
3. **Reconciliation**: `reconcilePresence()` runs every 90 seconds, scanning `presence:online` for stale users with no live heartbeat keys.

### 8.3 Typing Indicators
`getTypingUsers(roomId)` scans `typing:<roomId>:*` keys, extracting user IDs from key names. Debounced `typing:update` events broadcast to the room.

---

## 9. Server-Side Caching

An in-process **TTL Map cache** (`CacheService`) reduces MongoDB load:

- Messages cached for **60 seconds** under `msgs:<roomId>:<userId>`.
- Invalidated on `message:send`, `message:edit`, `message:delete`, `message:react`, and backfill.
- Glob-pattern invalidation: `cacheService.delete('msgs:<roomId>:*')`.

---

## 10. File Upload Service

- **Storage**: Multer disk storage → `/server/uploads/<uuid><ext>`, served at `/uploads/*`.
- **Max size**: 50 MB per file.
- **Allowed MIME types**: JPEG, PNG, GIF, WebP, SVG, PDF, TXT, MP3, WAV, OGG, WebM (audio), MP4, WebM (video).
- **Multiple upload**: Up to 5 files via `POST /api/upload/multiple`.

---

## 11. Email Service (Nodemailer)

- Configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`.
- **Dev fallback**: If no SMTP credentials, a temporary Ethereal test account is auto-created. OTP codes also logged in color to server console.
- HTML email template uses dark glassmorphic design matching the app aesthetic.

---

## 12. Comprehensive Feature Breakdown

### 12.1 Authentication & Identity
- **Passwordless OTP**: Email → 6-digit code → JWT pair. OTP bcrypt-hashed (10 rounds), auto-expires via MongoDB TTL index.
- **Google OAuth**: Server-side ID token verification; supports `credential` (button) and `idToken` (userinfo).
- **Username Setup**: New users get `needsUsername: true`, redirected to `/set-username`. Username: 3–24 chars, `[a-zA-Z0-9_-]`, case-insensitive uniqueness.
- **User Search**: Case-insensitive regex across `username`, `name`, `email` (max 20 results).

### 12.2 Real-Time Messaging Engine
- **Deduplication**: `clientMsgId` (UUID) prevents duplicate messages during reconnection.
- **Rich content**: Max 2000 chars, multi-file attachments, inline quote-replies (`replyTo`), thread replies (`parentMessage`), @mentions, message forwarding with `forwardedFrom` attribution.
- **Reactions**: Toggle emoji; `message:react` toggles user in `reactions[].users[]`.
- **Pinned Messages**: Room-level `pinnedMessages[]` array.
- **Editing**: Sets `edited: true` + `editedAt`.
- **Soft Delete**: `deleted: true` (tombstone for all) or `deletedFor: [userId]` (personal hide).
- **Slow Mode**: `slowMode` (seconds) cooldown enforced client-side.

### 12.3 Channel Types
- **`public`**: Open to all.
- **`private`**: Requires join request approval workflow.
- **`ephemeral`**: MongoDB TTL-indexed, auto-deletes after `expiresAt` (configurable `inactivityMinutes`, default 60).

### 12.4 Direct Messages
- DM rooms: `Room` with `isDM: true`, `dmStatus: 'pending'|'accepted'`, `dmInitiator`.
- Initiating creates a pending room + initial message, emits `dm:new-request`.
- Recipient can `accept` or `DELETE` (deletes all messages + room).

### 12.5 Threaded Discussions
- Thread replies: `parentMessage: <messageId>`.
- `GET /:roomId/threads` uses MongoDB `$lookup` + `$addFields` pipeline to return threads with `replyCount` and `lastReply`.

### 12.6 WebRTC Voice & Video
- **Pure relay**: Server forwards offer/answer/ICE between peers via `user:<userId>` rooms.
- **Supports**: 1-on-1 (`targetUserId`) and group calls (`roomId`).
- **Call Logging**: Metadata persisted via `POST /api/calls/log`.

### 12.7 Gemini AI Integration
- **Model**: `gemini-2.0-flash` via REST API.
- **Summarize**: Last 200 messages → <200-word structured summary.
- **Suggest**: Last 50 messages + draft → 3 completion options (JSON array, each <30 words).
- Requires `GEMINI_API_KEY`.

### 12.8 Notifications
- Types: `mention`, `dm`, `reaction`, `system`, `channel`.
- Created by `createNotification()` in `notifications.service.js`, delivered real-time via `io.to('user:<userId>')`.

### 12.9 Moderation
- **Role Hierarchy**: `owner > moderator > member`.
- **Kick**: Removes from members, optionally bans, forces `socket.leave()` + emits `room:kicked`.
- **Ban**: Removes from members + `encryptedKeys[]` (revokes E2EE), adds to `bannedUsers[]`.
- **Mute**: Toggles `member.muted` (enforced client-side).
- **Role Change**: Owner-only promotion/demotion.
- **Message Moderation**: Moderators+ can soft-delete; any user can report.

### 12.10 Presence & Activity Heatmap
- Status states: `online | idle | dnd | offline`.
- Real-time global `presence:update` broadcast on connect/disconnect.
- `PresenceMap.jsx` visualizes member density across rooms.

### 12.11 Offline Queueing & Backfill
- Offline queue in `localStorage` (`chatapp:offlineQueue`), dispatched on reconnect.
- Backfill: up to 20 rooms, 100 messages per room, sorted ascending by `_id`.

### 12.12 UI/UX Design System
- **React 18** + React Router 6, lazy-loaded routes via `React.lazy` + `Suspense`.
- **Animations**: Framer Motion 12, GSAP 3, OGL (WebGL).
- **Icons**: Lucide React.
- **Auth UI**: `@react-oauth/google`.
- **Glassmorphism**: Translucent dark aesthetic via CSS variables.
- **Quick Switcher**: `Cmd/Ctrl+K` command palette.
- **Toast System**: `ToastContext` + `ToastContainer`.
- **Error Boundary**: Wraps entire app tree.
- **Skeleton Loaders**: Progressive loading states.

---

## 13. Security & Hardening

1. **Helmet.js**: `crossOriginResourcePolicy: 'cross-origin'` (uploads) + `crossOriginOpenerPolicy: 'same-origin-allow-popups'` (Google OAuth).
2. **CORS**: Dynamic origin validation — allows configured origins, all localhost ports, and local private network ranges.
3. **Rate Limiting**: 30 requests / 15 min on `/api/auth`.
4. **JWT Security**: Short-lived access tokens, refresh token rotation with reuse detection.
5. **bcrypt**: OTP codes hashed (10 rounds).
6. **E2EE**: Server stores only ciphertext; plaintext never leaves the client.
7. **Input Limits**: Messages ≤ 2000 chars; uploads ≤ 50 MB; MIME allowlist enforced.
8. **DNS Hardening**: `dns.setServers(['1.1.1.1', '8.8.8.8'])`.
9. **Graceful Shutdown**: SIGINT/SIGTERM/SIGUSR2 handlers with 10-second forced-exit fallback.
10. **Global Error Handling**: `uncaughtException` / `unhandledRejection` handlers.

---

## 14. Testing

| File | Framework | Coverage |
|---|---|---|
| `tests/auth.test.js` | Jest + Supertest + mongodb-memory-server | Auth routes (OTP, Google, refresh, profile) |
| `tests/backfill.test.js` | Jest + Supertest + mongodb-memory-server | Message backfill API |
| `tests/kickban.test.js` | Jest + Supertest + mongodb-memory-server | Moderation: kick, ban, unban |
| `tests/setup.js` | Jest globalSetup | In-memory MongoDB lifecycle |

**Run**: `cd server && npm test`  
Jest uses `--experimental-vm-modules` (ESM support), `--forceExit`, `--detectOpenHandles`.

---

## 15. Directory Structure Reference

```
DropTalk/
├── DESIGN_DOCUMENT.md
├── README.md
│
├── client/                             # React 18 + Vite 5 Frontend
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx                     # Root: routes + lazy-loaded pages
│       ├── main.jsx                    # Entry: BrowserRouter + contexts
│       ├── styles.css                  # Global CSS / Glassmorphism system
│       ├── features/
│       │   ├── auth/
│       │   │   └── pages/
│       │   │       ├── JoinNow.jsx         # OTP + Google sign-in
│       │   │       └── SetUsername.jsx     # Post-registration username setup
│       │   ├── calls/
│       │   │   ├── components/
│       │   │   │   ├── CallLogsMainView.jsx
│       │   │   │   ├── CallLogsPanel.jsx
│       │   │   │   └── StartCallModal.jsx
│       │   │   └── hooks/useCalls.js
│       │   ├── chat/
│       │   │   ├── components/
│       │   │   │   ├── AIPanel.jsx              # Gemini AI copilot
│       │   │   │   ├── CallOverlay.jsx          # Active call UI
│       │   │   │   ├── ChannelSettingsModal.jsx
│       │   │   │   ├── Channels.jsx             # Channel list sidebar
│       │   │   │   ├── CreateChannelModal.jsx
│       │   │   │   ├── DMChat.jsx               # DM conversation view
│       │   │   │   ├── DMPanel.jsx              # DM list
│       │   │   │   ├── ForwardModal.jsx
│       │   │   │   ├── KeyboardShortcutsModal.jsx
│       │   │   │   ├── MemberList.jsx
│       │   │   │   ├── MessageInput.jsx         # Composer
│       │   │   │   ├── MessageList.jsx          # Message feed
│       │   │   │   ├── MessageSearchModal.jsx
│       │   │   │   ├── PendingRequests.jsx      # Join request management
│       │   │   │   ├── PinnedMessagesModal.jsx
│       │   │   │   ├── PresenceMap.jsx          # Activity heatmap
│       │   │   │   ├── QuickSwitcherModal.jsx   # Cmd+K palette
│       │   │   │   ├── ReactionPicker.jsx
│       │   │   │   ├── ScrollToBottom.jsx
│       │   │   │   ├── SuggestionsBar.jsx       # AI smart replies
│       │   │   │   ├── ThreadPanel.jsx          # Thread side panel
│       │   │   │   ├── TypingIndicator.jsx
│       │   │   │   └── UserProfileCard.jsx
│       │   │   ├── hooks/
│       │   │   │   ├── useChat.js               # Main chat state + socket handlers
│       │   │   │   ├── useDM.js                 # DM state management
│       │   │   │   └── useWebRTC.js             # WebRTC peer connection
│       │   │   └── pages/Chat.jsx               # Main authenticated shell
│       │   ├── home/
│       │   │   ├── components/
│       │   │   │   ├── Aurora.jsx / .css        # WebGL animated background
│       │   │   │   ├── Illustrations.jsx
│       │   │   │   ├── RotatingText.jsx / .css
│       │   │   │   └── ScrollFloat.jsx / .css
│       │   │   └── pages/Home.jsx               # Marketing landing page
│       │   ├── notifications/
│       │   │   ├── components/
│       │   │   │   ├── NotificationsMainView.jsx
│       │   │   │   └── NotificationsPanel.jsx
│       │   │   ├── NotificationDrawer.jsx
│       │   │   └── useNotifications.js
│       │   └── profile/
│       │       └── pages/
│       │           ├── Profile.jsx
│       │           └── SettingsPage.jsx         # /settings/:section
│       └── shared/
│           ├── components/
│           │   ├── ErrorBoundary.jsx
│           │   └── ui/
│           │       ├── AnimatedList.jsx / .css
│           │       ├── PostRegisterStepper.jsx
│           │       ├── SkeletonLoaders.jsx
│           │       ├── Stepper.jsx / .css
│           │       ├── ToastContainer.jsx
│           │       └── index.js
│           ├── context/
│           │   ├── AuthContext.jsx              # JWT management + auto token refresh
│           │   └── ToastContext.jsx             # Global toast system
│           ├── hooks/
│           │   └── useTheme.js
│           └── utils/
│               ├── api.js                       # Axios + refresh interceptor
│               ├── cacheManager.js              # Client-side IndexedDB/LocalStorage cache
│               ├── constants.js                 # API_BASE, SERVER_URL, STORAGE_KEYS
│               ├── crypto.js                    # Web Crypto: RSA-OAEP + AES-GCM
│               ├── dateUtils.js
│               ├── index.js
│               ├── socket.js                    # Socket.IO client singleton
│               └── webNotifications.js          # Browser Notifications API
│
└── server/                             # Node.js 18+ + Express (ES Modules)
    ├── package.json
    ├── jest.config.js
    ├── uploads/                        # Multer storage (gitignored)
    ├── tests/
    │   ├── setup.js
    │   ├── auth.test.js
    │   ├── backfill.test.js
    │   └── kickban.test.js
    └── src/
        ├── index.js                    # Bootstrap: Express + routes + HTTP server
        ├── features/
        │   ├── ai/
        │   │   └── ai.routes.js            # /summarize + /suggest (Gemini 2.0 Flash)
        │   ├── auth/
        │   │   ├── auth.routes.js          # OTP, Google OAuth, JWT, profile CRUD
        │   │   ├── user.model.js           # User schema + toClient()
        │   │   └── otp.model.js            # OTP schema (TTL-indexed)
        │   ├── calls/
        │   │   ├── calls.routes.js         # Call log CRUD
        │   │   └── callLog.model.js        # CallLog schema + toClient(userId)
        │   ├── dm/
        │   │   └── dm.routes.js            # DM send/accept/reject/list/messages
        │   ├── keys/
        │   │   ├── keys.routes.js          # E2EE key HTTP routes
        │   │   └── keys.socket.js          # keys:share socket handler
        │   ├── messages/
        │   │   ├── messages.routes.js      # Paginated fetch, search, backfill
        │   │   ├── messages.socket.js      # send/edit/delete/react/pin handlers
        │   │   ├── threads.routes.js       # Thread replies + aggregate
        │   │   ├── message.model.js        # Message schema + toClient()
        │   │   └── readReceipts.service.js
        │   ├── moderation/
        │   │   └── moderation.routes.js    # Kick/ban/mute/role/message moderation
        │   ├── notifications/
        │   │   ├── notifications.routes.js
        │   │   ├── notifications.service.js# createNotification() helper
        │   │   └── notification.model.js   # Notification schema + toClient()
        │   ├── presence/
        │   │   ├── presence.service.js     # Redis presence + heartbeat + reconcile
        │   │   └── presence.socket.js      # presence:update, typing handlers
        │   ├── rooms/
        │   │   ├── rooms.routes.js         # Room CRUD + join workflow + settings
        │   │   ├── rooms.socket.js         # room:join/leave handlers
        │   │   └── room.model.js           # Room schema + toClient() + toSummary()
        │   └── upload/
        │       └── upload.routes.js        # Multer single + multi-file upload
        └── shared/
            ├── cache/
            │   └── cache.service.js        # In-process TTL Map cache
            ├── config/
            │   ├── db.js                   # Mongoose connection
            │   └── redis.js                # ioredis + InMemoryRedis fallback
            ├── middleware/
            │   ├── auth.js                 # requireAuth (Bearer JWT)
            │   ├── rateLimit.js            # Rate limiter factories
            │   └── roles.js                # requireRole / requireAtLeastRole
            ├── socket/
            │   ├── index.js                # Socket.IO server + connection lifecycle
            │   └── webrtc.socket.js        # WebRTC signaling relay
            └── utils/
                ├── constants.js            # ROLE_HIERARCHY, ROOM_TYPES, PRESENCE, etc.
                ├── errors.js               # parseExpiry, escapeRegex, generateAutoUsername
                ├── index.js
                └── mailer.js               # Nodemailer (SMTP + Ethereal fallback)
```

---

## 16. Environment Variables

### Server (`server/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP server port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/chatapp` | MongoDB connection string |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection string |
| `JWT_SECRET` | *(required)* | JWT signing secret |
| `ACCESS_TOKEN_EXPIRY` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token lifetime |
| `GOOGLE_CLIENT_ID` | *(optional)* | Google OAuth client ID |
| `GEMINI_API_KEY` | *(optional)* | Google Gemini API key |
| `CORS_ORIGIN` | `http://localhost:5173,...` | Comma-separated allowed origins |
| `SMTP_HOST` | *(optional)* | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` / `EMAIL_USER` | *(optional)* | SMTP username |
| `SMTP_PASS` / `EMAIL_PASS` | *(optional)* | SMTP password |
| `SMTP_SECURE` | `false` | TLS on connect (`true` for port 465) |
| `SMTP_FROM` / `EMAIL_FROM` | `"DropTalk Auth" <no-reply@droptalk.com>` | From address |

### Client (`client/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:4000/api` | Backend REST API base URL |
| `VITE_SERVER_URL` | `http://localhost:4000` | Backend server URL (uploads + Socket.IO) |

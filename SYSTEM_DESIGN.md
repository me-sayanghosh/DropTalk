# DropTalk — System Design Document

**Version:** 1.0.0  
**Last Updated:** 2026-08-30  
**Purpose:** End-to-end system design — architecture decisions, data flows, component interactions, scalability, and trade-offs.

---

## Table of Contents

1. [System Goals & Constraints](#1-system-goals--constraints)
2. [High-Level Architecture Decision](#2-high-level-architecture-decision)
3. [Authentication Flow Design](#3-authentication-flow-design)
4. [Message Delivery Pipeline](#4-message-delivery-pipeline)
5. [Real-Time Communication Architecture](#5-real-time-communication-architecture)
6. [End-to-End Encryption Workflow](#6-end-to-end-encryption-workflow)
7. [Direct Message Workflow](#7-direct-message-workflow)
8. [WebRTC Call Signaling Flow](#8-webrtc-call-signaling-flow)
9. [Presence & Heartbeat System Design](#9-presence--heartbeat-system-design)
10. [Database Design & Indexing Strategy](#10-database-design--indexing-strategy)
11. [Caching Architecture](#11-caching-architecture)
12. [File Upload Pipeline](#12-file-upload-pipeline)
13. [Notification Delivery Design](#13-notification-delivery-design)
14. [Moderation System Design](#14-moderation-system-design)
15. [AI Integration Design](#15-ai-integration-design)
16. [Scalability & Horizontal Scaling](#16-scalability--horizontal-scaling)
17. [Failure Handling & Resilience](#17-failure-handling--resilience)
18. [Security Architecture](#18-security-architecture)
19. [Frontend Architecture Design](#19-frontend-architecture-design)
20. [Key Design Trade-offs](#20-key-design-trade-offs)

---

## 1. System Goals & Constraints

### Functional Goals
- Real-time bi-directional messaging across public, private, and ephemeral channels
- 1-on-1 Direct Messaging with request/accept workflow
- Peer-to-peer voice and video calling via WebRTC
- End-to-End Encrypted (E2EE) messaging for private channels
- Threaded discussions, emoji reactions, message forwarding
- AI-powered summarization and smart reply suggestions
- Presence tracking, typing indicators, and activity heatmaps
- File attachments (images, video, audio, documents)

### Non-Functional Goals
- **Low latency**: Sub-100ms message delivery on local network
- **High availability**: Graceful degradation when Redis or external services are unavailable
- **Horizontal scalability**: Multi-instance server deployment via Redis Pub/Sub
- **Security**: Zero plaintext storage for E2EE messages; short-lived JWTs with rotation
- **Offline resilience**: Client-side queuing + server-side backfill on reconnect

### Constraints
- Browser-based crypto only (Web Crypto API, no native binaries)
- File storage is local disk (no cloud object storage in v1)
- No dedicated TURN server (WebRTC relies on direct P2P or STUN)
- Single MongoDB instance (no sharding in v1)

---

## 2. High-Level Architecture Decision

### Architecture Pattern: Feature-Based Monolith with Real-Time Layer

DropTalk uses a **modular monolith** — a single Node.js process with clearly separated feature domains — rather than microservices. This choice reflects the team size and deployment simplicity while preserving a clean internal boundary structure that can be extracted later.

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                            │
│                                                                    │
│   ┌─────────────┐   ┌─────────────┐   ┌──────────────────────┐    │
│   │  React SPA  │   │ Socket.IO   │   │  Web Crypto API      │    │
│   │  (Vite 5)   │   │  Client     │   │  (RSA-OAEP + AES-GCM)│    │
│   └──────┬──────┘   └──────┬──────┘   └──────────────────────┘    │
│          │                 │                                        │
└──────────┼─────────────────┼────────────────────────────────────────┘
           │ HTTP/REST        │ WebSocket
           ▼                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                    SERVER (Node.js + Express)                       │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Express HTTP Layer                         │  │
│  │  /api/auth   /api/rooms   /api/dm   /api/calls              │  │
│  │  /api/notifications   /api/upload   /api/rooms/:id/...      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               Socket.IO Real-Time Layer                      │  │
│  │  room:*   message:*   presence:*   typing:*                  │  │
│  │  dm:*   webrtc:*   keys:*                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │    Auth    │  │   Rooms    │  │  Messages  │  │     DM     │   │
│  │  Feature   │  │  Feature   │  │  Feature   │  │  Feature   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │    Keys    │  │    AI      │  │  Presence  │  │ Moderation │   │
│  │  Feature   │  │  Feature   │  │  Service   │  │  Feature   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│  ┌────────────┐  ┌────────────┐                                    │
│  │   Calls    │  │  Upload    │                                    │
│  │  Feature   │  │  Feature   │                                    │
│  └────────────┘  └────────────┘                                    │
│                                                                    │
└───────────────────────────┬────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   ┌─────────────┐   ┌────────────┐   ┌──────────────┐
   │   MongoDB   │   │   Redis    │   │  Gemini API  │
   │  (Mongoose) │   │ (ioredis)  │   │ (REST HTTP)  │
   └─────────────┘   └────────────┘   └──────────────┘
```

### Why Not Microservices?
| Concern | Monolith Decision |
|---|---|
| Team size | Single-team ownership; no service ownership fragmentation |
| Deployment | Single process, single port, zero inter-service networking |
| Latency | In-process function calls vs network hops |
| Data consistency | Shared MongoDB context avoids distributed transactions |
| Future path | Feature boundaries are clean; extraction is straightforward when needed |

---

## 3. Authentication Flow Design

### Design Decision: Passwordless-First with Refresh Token Rotation

Passwords are deliberately avoided in favor of Email OTP and Google OAuth, eliminating the largest class of credential-stuffing attacks. Refresh tokens use **family-based rotation** to detect token theft.

### Email OTP Flow

```
Client                         Server                       MongoDB / Mailer
  │                               │                               │
  │── POST /api/auth/send-otp ───►│                               │
  │   { email }                   │── bcrypt.hash(otp, 10) ──────►│
  │                               │── Otp.deleteMany({ email }) ──►│
  │                               │── Otp.create({ otpHash,       │
  │                               │     expiresAt: +10min }) ─────►│
  │                               │── sendOtpEmail(email, otp) ───►│ (Nodemailer)
  │◄── { ok: true } ─────────────│                               │
  │                               │                               │
  │ [User enters OTP code]        │                               │
  │                               │                               │
  │── POST /api/auth/verify-otp ─►│                               │
  │   { email, otp }              │── Otp.findOne({ email }) ─────►│
  │                               │◄── otpRecord ─────────────────│
  │                               │── bcrypt.compare(otp, hash)   │
  │                               │── Otp.deleteMany (consume) ───►│
  │                               │── User.findOne OR create ──────►│
  │                               │── signAccessToken()  (JWT)    │
  │                               │── signRefreshToken() (UUID v4) │
  │                               │── storeRefreshToken() ─────────►│
  │◄── { accessToken,             │                               │
  │      refreshToken, user } ────│                               │
```

### Token Refresh & Rotation Flow

```
Client                              Server                        MongoDB
  │                                    │                              │
  │── POST /api/auth/refresh ─────────►│                              │
  │   { refreshToken }                 │── User.findOne({ token }) ───►│
  │                                    │◄── user + storedToken ────────│
  │                                    │                              │
  │                                    │   [Check: expired?]          │
  │                                    │   [Remove old token]         │
  │                                    │   [Issue new access + refresh]│
  │                                    │   [Store new refresh token]  │
  │                                    │                              │
  │◄── { accessToken, refreshToken } ──│                              │
  │                                    │                              │
  │  ── IF token is in revokedTokens ──│                              │
  │     (reuse detected):              │── revokeAllRefreshTokens() ──►│
  │◄── 401 "sessions revoked" ─────────│   (entire family invalidated) │
```

### Google OAuth Flow

```
Client                              Server                     Google
  │                                    │                          │
  │── [User clicks Google Sign-In] ────│                          │
  │── [Google returns ID token] ───────│                          │
  │                                    │                          │
  │── POST /api/auth/google ──────────►│                          │
  │   { credential: idToken }          │── googleClient.verify() ─►│
  │                                    │◄── { sub, email, name,   │
  │                                    │      picture } ───────────│
  │                                    │                          │
  │                                    │── User.findOne OR create  │
  │                                    │── Issue JWT + refresh     │
  │◄── { accessToken, refreshToken,    │                          │
  │      user, needsUsername? } ───────│                          │
```

---

## 4. Message Delivery Pipeline

### Design Decision: Socket-First, DB-Confirmed

Messages are broadcast via WebSocket immediately for low latency, then persisted to MongoDB. The `clientMsgId` UUID provides idempotent deduplication at the DB layer (unique sparse index), so even if the client retransmits on reconnect, the server won't create a duplicate.

### Full Message Send Flow

```
Sender Client                 Server (Socket Handler)              MongoDB     All Room Clients
     │                               │                               │               │
     │── socket.emit('message:send', │                               │               │
     │   { roomId, text,             │                               │               │
     │     clientMsgId, replyTo,     │                               │               │
     │     attachments, mentions })──►│                               │               │
     │                               │                               │               │
     │                               │── [Auth: socket.user.id]      │               │
     │                               │── [Check: user joined room?]  │               │
     │                               │── [Check: not muted?]         │               │
     │                               │                               │               │
     │                               │── Message.create({            │               │
     │                               │     room, sender,             │               │
     │                               │     clientMsgId, text,        │               │
     │                               │     replyTo, attachments,     │               │
     │                               │     mentions, parentMessage })─►│               │
     │                               │◄── savedMessage ──────────────│               │
     │                               │                               │               │
     │                               │── cacheService.delete(        │               │
     │                               │     'msgs:roomId:*')          │               │
     │                               │                               │               │
     │                               │── io.to(roomId).emit(─────────────────────────►│
     │                               │     'message:new', {          │               │
     │                               │       roomId, message })       │               │
     │                               │                               │               │
     │                               │── [If mentions[]] ────────────────────────────►│
     │                               │   io.to('user:X').emit(       │    (targeted)  │
     │                               │     'notification:new')        │               │
     │                               │                               │               │
     │◄── ack({ ok: true, message }) ─│                               │               │
```

### Offline Message Queueing & Backfill

```
Client (Offline)              localStorage           Server (on reconnect)
     │                            │                         │
     │── [Network drops] ──────────│                         │
     │── [User types message] ─────│                         │
     │── [Store in offlineQueue] ──►│                         │
     │                            │                         │
     │── [Connection restored] ────│                         │
     │── [Read offlineQueue] ──────◄│                         │
     │── [Emit queued messages] ───────────────────────────►│
     │                            │                         │
     │── POST /api/rooms/backfill ─────────────────────────►│
     │   { rooms: [{ roomId,       │                         │
     │     after: lastSeenMsgId }]}│                         │
     │◄── { backfill: { roomId:    │                         │
     │      [missedMessages] }} ────────────────────────────│
     │── [Merge + deduplicate      │                         │
     │    by clientMsgId] ─────────│                         │
```

---

## 5. Real-Time Communication Architecture

### Design Decision: Single Socket.IO Server with Redis Pub/Sub Adapter

All real-time events flow through Socket.IO. When multiple server instances are running, the `@socket.io/redis-adapter` ensures events emitted on one instance are relayed to sockets connected on other instances.

### Socket Room Strategy

```
Socket Rooms (logical namespaces inside Socket.IO):

  user:<userId>        ← Personal room: targeted DMs, notifications, call invites
  <roomId>             ← Channel room: messages, member events, typing indicators
  
Every connected socket is always in:
  - user:<userId>      (their personal room)
  - <roomId> for each channel they've joined via room:join
```

### Multi-Node Event Relay (Redis Adapter)

```
Server Instance A          Redis Pub/Sub           Server Instance B
       │                       │                          │
       │  User A connected     │                          │  User B connected
       │  (joined room:123)    │                          │  (joined room:123)
       │                       │                          │
       │  User A sends message │                          │
       │  io.to('room:123')    │                          │
       │  .emit('message:new') │                          │
       │                       │                          │
       │── PUBLISH to Redis ───►│                          │
       │                       │── SUBSCRIBE relay ───────►│
       │                       │                          │── emit('message:new')
       │                       │                          │   to User B's socket
```

### Redis Fallback (InMemoryRedis)

When Redis is unavailable at startup, DropTalk boots with an `InMemoryRedis` singleton that mirrors the ioredis API surface. The socket adapter is skipped entirely (single-node mode). This ensures the app remains functional for local development without Redis installed.

```
Startup Sequence:
  1. Attempt Redis connection (lazyConnect, 3 retries, 200ms–2s backoff)
  2. On success → use ioredis + redis-adapter for Socket.IO
  3. On failure → use InMemoryRedis + skip socket adapter (single-node)
  4. Log warning: "[redis] not available — using in-memory fallback"
```

---

## 6. End-to-End Encryption Workflow

### Design Decision: Client-Side Crypto Only, Zero Server Knowledge

The server never sees plaintext message content for E2EE channels. All crypto operations happen in the browser using the Web Crypto API. The server stores only RSA-encrypted AES keys and encrypted message ciphertext.

### Key Exchange Protocol

```
Room Owner Client                  Server                    Member Client
       │                              │                             │
       │  [Joins/creates E2EE room]   │                             │
       │                              │                             │
       │── generateRoomKey() ─────────│                             │
       │   (AES-GCM 256-bit key)      │                             │
       │                              │                             │
       │── GET /rooms/:id/keys/all ──►│                             │
       │◄── [{ user, publicKeyJwk }]  │                             │
       │                              │                             │
       │   FOR each member:           │                             │
       │── encryptRoomKey(            │                             │
       │     member.publicKeyJwk,     │                             │
       │     aesKey) → base64         │                             │
       │                              │                             │
       │── POST /rooms/:id/keys ─────►│                             │
       │   { user: memberId,          │── Room.encryptedKeys.push() │
       │     encryptedKey: base64 }   │                             │
       │                              │                             │
       │ OR via socket:               │                             │
       │── keys:share ───────────────►│──── keys:received ──────────►│
       │                              │                             │
       │                              │                Member Client:│
       │                              │  GET /rooms/:id/keys ───────►│
       │                              │◄── { key: encryptedBase64 } │
       │                              │                             │
       │                              │   decryptRoomKey(           │
       │                              │     privateKey,             │
       │                              │     encryptedBase64)        │
       │                              │   → aesKey (in memory only) │
```

### Message Encryption / Decryption Flow

```
Sender                                          Receiver
  │                                                  │
  │  plaintext = "Hello!"                            │
  │  iv = crypto.getRandomValues(12 bytes)           │
  │  ciphertext = AES-GCM.encrypt(iv, plaintext)     │
  │  payload = base64(iv + ciphertext)               │
  │                                                  │
  │── socket.emit('message:send',                    │
  │   { text: payload, isEncrypted: true }) ─────────►│
  │                                                  │
  │                          Server stores payload   │
  │                          (never sees plaintext)  │
  │                                                  │
  │              socket.on('message:new', { text: payload })
  │                                                  │
  │                            bytes = base64.decode(payload)
  │                            iv = bytes[0..11]
  │                            ciphertext = bytes[12..]
  │                            plaintext = AES-GCM.decrypt(
  │                              roomKey, iv, ciphertext)
  │                            → "Hello!"
```

### Key Revocation on Ban

```
Moderator bans User X:
  POST /rooms/:id/ban/:userId
  
Server:
  1. room.members = members.filter(m => m.user !== userId)
  2. room.encryptedKeys = encryptedKeys.filter(k => k.user !== userId)
  3. room.bannedUsers.push({ user: userId, bannedAt, bannedBy })
  4. room.save()
  
Result: User X's encrypted key entry is deleted.
User X can no longer retrieve a key to decrypt future messages.
Past ciphertext they already decrypted remains in their client,
but they cannot access new messages.
```

---

## 7. Direct Message Workflow

### Design Decision: DMs as a Specialized Room Type

Rather than a separate DM data model, Direct Messages reuse the `Room` schema with `isDM: true`. This collapses the message storage, threading, reactions, and attachment systems into a single code path.

### DM Lifecycle State Machine

```
                     ┌──────────────────────────────────┐
                     │           DM States               │
                     │                                  │
  Initiator sends ──►│  PENDING                         │
  first message      │  dmStatus: 'pending'              │
                     │  dmInitiator: senderId            │
                     │                                  │
                     │  ┌──── Recipient accepts ────────►│  ACCEPTED
                     │  │    POST /dm/:id/accept         │  dmStatus: 'accepted'
                     │  │                               │  (free chat)
                     │  │                               │
                     │  └──── Recipient rejects ────────►│  DELETED
                     │       DELETE /dm/:id              │  (room + messages gone)
                     └──────────────────────────────────┘
```

### DM Send Flow

```
Sender Client                    Server                       Recipient Client
     │                              │                               │
     │── POST /api/dm/send ────────►│                               │
     │   { toUserId, text }         │                               │
     │                              │── Room.findOne({              │
     │                              │     isDM: true,               │
     │                              │     members: [from, to] })    │
     │                              │                               │
     │                              │  [If no room exists]          │
     │                              │── Room.create({               │
     │                              │     isDM: true,               │
     │                              │     dmStatus: 'pending',      │
     │                              │     dmInitiator: senderId })  │
     │                              │                               │
     │                              │── Message.create({ text })    │
     │                              │                               │
     │                              │── io.to('user:recipientId')   │
     │                              │   .emit('dm:new-request', {   │
     │                              │     fromUserId, roomId })──────►│
     │                              │                               │
     │                              │── createNotification(         │
     │                              │     type: 'dm') ──────────────►│
     │◄── { room, message } ────────│                               │
```

---

## 8. WebRTC Call Signaling Flow

### Design Decision: Pure Server-Side Relay (No SFU/MCU)

The server acts only as a signaling relay — it passes SDP offers, answers, and ICE candidates between peers. No media processing happens server-side. This keeps the server stateless with respect to calls and eliminates media server costs.

### 1-on-1 Call Flow

```
Caller Client              Server (Socket Relay)         Receiver Client
     │                           │                             │
     │─ webrtc:call-initiate ───►│                             │
     │  { targetUserId,          │                             │
     │    isVideo: true }        │── io.to('user:receiverId')  │
     │                           │   .emit('webrtc:call-      ─►│
     │                           │     incoming', payload)      │
     │                           │                             │
     │                           │         [Receiver accepts]  │
     │                           │                             │
     │                           │◄─ webrtc:call-accept ───────│
     │                           │   { toUserId: callerId }    │
     │◄─ webrtc:call-accepted ───│                             │
     │                           │                             │
     │  [Caller creates RTCPeerConnection]                     │
     │  [Adds local media tracks]                              │
     │  [Creates SDP offer]                                    │
     │                           │                             │
     │─ webrtc:offer ───────────►│                             │
     │  { toUserId, offer }      │── relay ────────────────────►│
     │                           │                             │
     │                           │  [Receiver sets remote desc]│
     │                           │  [Creates SDP answer]       │
     │                           │                             │
     │                           │◄─ webrtc:answer ────────────│
     │◄─ webrtc:answer ──────────│  (relayed back to caller)   │
     │                           │                             │
     │─ webrtc:ice-candidate ───►│──── relay ──────────────────►│
     │◄─ webrtc:ice-candidate ───│◄─── relay ──────────────────│
     │                           │                             │
     │  [ICE negotiation completes]                            │
     │  ◄══════════ P2P Media Stream ══════════════════════════►│
     │  (server no longer involved in call media)              │
     │                           │                             │
     │─ webrtc:call-end ────────►│──── relay ──────────────────►│
     │                           │                             │
     │── POST /api/calls/log ───►│                             │
     │   { type, status,         │                             │
     │     durationSeconds }     │                             │
```

### Group Call (Room-Based)

For group calls, `roomId` is used instead of `targetUserId`. The signal is broadcast to all sockets in that room (`io.to(roomId).emit(...)`). Peer mesh is established client-side between all participants.

---

## 9. Presence & Heartbeat System Design

### Design Decision: Redis-Based Presence with Heartbeat TTL

Presence state is stored in Redis (not MongoDB) because it is ephemeral, write-heavy, and must survive across multiple server instances. A TTL-based heartbeat pattern handles crash recovery without requiring explicit "disconnect" events in all failure cases.

### Presence Data Architecture

```
Redis Key Structure:

presence          (Hash)
  userId_1  →  '{"status":"online","currentRoom":"abc123","lastSeen":1693400000000}'
  userId_2  →  '{"status":"idle","currentRoom":null,"lastSeen":1693399990000}'

presence:online   (Set)
  { userId_1, userId_3, userId_7 }    ← fast O(1) membership check

presence:connCount:<userId>   (String)
  userId_1  →  "2"                    ← 2 tabs open, stay online until 0

presence:heartbeat:<userId>:<socketId>   (String, TTL=60s)
  presence:heartbeat:userId_1:sockA  →  "1"
  presence:heartbeat:userId_1:sockB  →  "1"   ← refreshed every 30s
```

### Heartbeat Lifecycle

```
   Socket connects
        │
        ▼
setPresence(online)          ← hset presence userId data
incrementPresence()          ← incr connCount:userId
startHeartbeat()             ← set heartbeat:userId:sockId  TTL=60s
    │
    │   every 30s: refresh heartbeat TTL to 60s
    │
    │   reconcilePresence() runs every 90s:
    │     scan presence:online SET
    │     for each userId:
    │       scan heartbeat:userId:* keys
    │       if NONE found → mark offline (crashed without disconnect event)
    │
   Socket disconnects (clean)
        │
        ▼
decrementPresence()          ← del heartbeat:userId:sockId
                             ← decr connCount:userId
                             ← if connCount == 0: mark offline
                                emit 'presence:update offline' globally
```

### Multi-Tab Support

```
User opens 3 browser tabs:
  Tab A connects → connCount: 1
  Tab B connects → connCount: 2
  Tab C connects → connCount: 3

Tab B closes:
  connCount: 2  → still online, no global offline event

Tab A closes:
  connCount: 1  → still online

Tab C closes:
  connCount: 0  → emit 'presence:update offline'
                  remove from presence:online SET
```

---

## 10. Database Design & Indexing Strategy

### MongoDB Schema Design Philosophy

DropTalk uses **document-oriented modeling** with embedded subdocuments for one-to-few relationships and references (`ObjectId`) for one-to-many. The key design choices:

| Relationship | Strategy | Reason |
|---|---|---|
| Room.members | Embedded array | Typically <1000 members; fast join checks |
| Room.encryptedKeys | Embedded array | Fetched together with room context |
| Room.bannedUsers | Embedded array | Typically small list per room |
| Room.pendingRequests | Embedded array | Short-lived, consumed on approve/deny |
| Room.pinnedMessages | Embedded ObjectId array | References, not full docs |
| Message.reactions | Embedded array | Always fetched with message |
| Message.attachments | Embedded array | Always fetched with message |
| Message → Room | Reference | Messages fetched independently by room |
| Message → User | Reference | Sender looked up when needed |
| Notification → User | Reference + Index | Queried by user frequently |

### Index Strategy

```
Collection: messages
  { room: 1, parentMessage: 1, createdAt: 1 }  ← primary pagination index
  { clientMsgId: 1 } (unique, sparse)           ← deduplication guard

Collection: rooms
  { expiresAt: 1 } (expireAfterSeconds: 0)      ← MongoDB TTL auto-delete

Collection: users
  { username: 1 } (unique)
  { email: 1 }    (unique)
  { googleId: 1 } (sparse)

Collection: otps
  { email: 1 }
  { expiresAt: 1 } (expireAfterSeconds: 0)      ← auto-expire OTP docs

Collection: notifications
  { user: 1 }                                   ← fetch by user
  { read: 1 }                                   ← count unread fast
```

### Why Embed `members[]` Instead of a Separate Collection?

The most frequent operations are:
1. Check if a user is a member of a room → `room.members.some(m => m.user === userId)` — O(n) in memory after single document fetch
2. List members of a room → already in the document

A separate `memberships` collection would require a JOIN-equivalent query for every membership check. Given that rooms typically have <500 members, embedding is faster and simpler.

### Ephemeral Rooms (TTL Design)

```
Room creation with type='ephemeral':
  expiresAt = Date.now() + (inactivityMinutes * 60 * 1000)

MongoDB TTL index:
  { expiresAt: 1 }, { expireAfterSeconds: 0 }

MongoDB background job checks every ~60 seconds and removes
documents where expiresAt < current time.

This means ephemeral rooms are auto-deleted with:
  - Zero application-level cleanup code
  - No cron jobs required
  - ~60s precision on deletion timing
```

---

## 11. Caching Architecture

### Two-Layer Caching Strategy

```
Layer 1: Server-Side In-Process Cache (CacheService)
  - Technology: JavaScript Map with TTL
  - Scope: Single server instance (not shared across nodes)
  - Use case: Message lists (60s TTL)
  - Key pattern: msgs:<roomId>:<userId>
  - Invalidation: Pattern-based glob deletion on any write

Layer 2: Client-Side Cache (cacheManager.js)
  - Technology: localStorage + IndexedDB (browser)
  - Scope: Per user, per browser
  - Use case: Room data, message history for instant initial render
  - Invalidation: Replaced on socket update events
```

### Server Cache Flow

```
GET /api/rooms/:roomId/messages
        │
        ▼
  cacheService.get('msgs:roomId:userId')
        │
   ┌────┴─────┐
 HIT         MISS
   │           │
   │           ▼
   │     MongoDB.find({ room: roomId })
   │           │
   │           ▼
   │     cacheService.set(key, data, 60s)
   │           │
   └──────┬────┘
          ▼
     return messages


On any message write:
  cacheService.delete('msgs:roomId:*')
  (invalidates all users' caches for that room)
```

### Why Not Redis for Message Caching?

The server already uses Redis for presence (write-heavy, cross-node requirement). Message caching is read-heavy but not cross-node critical — each server instance builds its own hot cache independently. Using Redis for this would add serialization overhead and Redis bandwidth for marginal benefit in the current scale.

---

## 12. File Upload Pipeline

### Design Decision: Local Disk Storage with UUID Naming

```
Client                           Server                          Filesystem
  │                                 │                                │
  │── POST /api/upload ────────────►│                                │
  │   FormData: file=<blob>         │                                │
  │                                 │── [multer fileFilter]          │
  │                                 │   check MIME type allowlist    │
  │                                 │                                │
  │                                 │── [multer diskStorage]         │
  │                                 │   filename = uuid() + ext ─────►│
  │                                 │   stored at /uploads/<uuid>.ext│
  │                                 │                                │
  │◄── { attachment: {              │                                │
  │       url: '/uploads/uuid.ext', │                                │
  │       filename, fileType,       │                                │
  │       mimeType, size } } ───────│                                │
  │                                 │                                │
  │── socket.emit('message:send',   │                                │
  │   { attachments: [{ url, ...}]})│                                │
```

### File Type Detection

```
MIME-first detection:
  image/* → 'image'
  video/* → 'video'
  audio/* → 'audio'
  else    → extension fallback
            .png/.jpg/.gif/.webp → 'image'
            .mp4/.webm/.mov      → 'video'
            .mp3/.wav/.ogg       → 'audio'
            else                 → 'document'
```

### Static File Serving

```
Express:
  app.use('/uploads', express.static(path.join(cwd, 'uploads')))
  
Helmet crossOriginResourcePolicy: 'cross-origin'
  → Allows <img>/<video> tags in React to load files from /uploads
    without CORP blocking (critical for cross-origin embedding)

Client:
  getMediaUrl(url):
    if absolute URL → return as-is
    else → prepend SERVER_URL (e.g., http://localhost:4000/uploads/...)
```

---

## 13. Notification Delivery Design

### Dual-Channel Notification System

```
Event occurs (e.g., @mention in a message):
         │
         ▼
messages.socket.js extracts mentions[] from saved message
         │
         ▼
createNotification({ userId, actorId, type: 'mention', ... })
  └── Notification.create() → MongoDB (persistent)
         │
         ▼
io.to('user:<userId>').emit('notification:new', notification)
  └── Real-time delivery to connected client
         │
         ▼
  [Client updates badge + notification drawer]

If user is offline:
  Notification sits in MongoDB
  On next login:
    GET /api/notifications → returns unread count + list
    Client shows badge
```

### Notification Types & Triggers

```
mention   → @username detected in message.mentions[]
dm        → New DM request received (POST /api/dm/send)
reaction  → Someone reacted to your message
system    → Admin announcements
channel   → Room event (e.g., granted join request)
```

### Auto-Clear on Room View

```
When user opens a room:
  DELETE /api/notifications/room/:roomId
  → Deletes all notifications linked to that room for that user
  → Prevents stale badge counts
```

---

## 14. Moderation System Design

### Role Hierarchy & Permission Matrix

```
Role Hierarchy:  owner (3) > moderator (2) > member (1)

Action                    | Owner | Moderator | Member
--------------------------|-------|-----------|-------
Kick member               |  ✓    |    ✓      |   ✗
Ban member                |  ✓    |    ✓      |   ✗
Mute member               |  ✓    |    ✓      |   ✗
Unban member              |  ✓    |    ✓      |   ✗
Delete any message        |  ✓    |    ✓      |   ✗
Delete own message        |  ✓    |    ✓      |   ✓
Report message            |  ✓    |    ✓      |   ✓
Promote/demote roles      |  ✓    |    ✗      |   ✗
Update room settings      |  ✓    |    ✓      |   ✗
View pending join requests|  ✓    |    ✓      |   ✗
Grant/deny join requests  |  ✓    |    ✓      |   ✗
Kick other moderator      |  ✓    |    ✗      |   ✗
```

### Kick Flow with Socket Ejection

```
POST /rooms/:id/members/:userId/kick

Server:
  1. Verify requester is moderator+ (requireAtLeastRole middleware)
  2. Find target member in room.members[]
  3. Guard: target.role === 'owner' → reject
  4. Guard: requester is moderator AND target is moderator → reject
  5. [If ban=true] → push to bannedUsers[] + remove encryptedKeys
  6. room.members = members.filter(m => m.user !== userId)
  7. room.save()
  8. io.to(roomId).emit('room:user-kicked', { userId, banned })
  9. Fetch all sockets in room:
     for socket in io.in(roomId).fetchSockets():
       if socket.user.id === userId:
         socket.leave(roomId)         ← force exit room namespace
         socket.emit('room:kicked')   ← notify the kicked user's client
  10. Broadcast updated online list to remaining members
```

---

## 15. AI Integration Design

### Design Decision: Stateless REST Calls to Gemini API

AI features are implemented as thin REST wrappers. Each call is independent — no session context is maintained between requests. This keeps the integration simple and avoids LLM state management complexity.

### Summarization Flow

```
POST /api/rooms/:roomId/summarize

Server:
  1. Verify user is room member
  2. Fetch last 200 non-deleted top-level messages (populated sender.username)
  3. Build chat log string:
     "alice: Hey team, stand-up at 10?\nbob: Works for me\n..."
  4. Construct prompt:
     "Summarize the following chat conversation concisely.
      Highlight key topics, decisions, and action items.
      Be brief (under 200 words).\n\nChat log:\n{chatLog}"
  5. POST to Gemini 2.0 Flash REST endpoint:
     https://generativelanguage.googleapis.com/v1beta/
       models/gemini-2.0-flash:generateContent?key=API_KEY
     { contents: [{ parts: [{ text: prompt }] }] }
  6. Extract: data.candidates[0].content.parts[0].text
  7. Return: { summary: "..." }
```

### Smart Reply Suggestion Flow

```
POST /api/rooms/:roomId/suggest
Body: { message: "I think we should..." }

Server:
  1. Verify user is room member
  2. Fetch last 50 messages as context
  3. Construct prompt:
     "You are an AI assistant. Given the recent conversation and
      the user's incomplete message, suggest 3 short completion
      options (each under 30 words). Return ONLY a JSON array of
      3 strings.\n\nContext:\n{context}\n\nUser's message: {message}"
  4. Call Gemini API
  5. Parse JSON array from response (strip markdown code fences)
  6. Return: { suggestions: ["...", "...", "..."] }

Client renders suggestions in SuggestionsBar.jsx as clickable chips
```

---

## 16. Scalability & Horizontal Scaling

### Current Scale Architecture (Single Node)

```
                    Load Balancer (optional)
                           │
                    ┌──────┴──────┐
                    │  Node.js    │
                    │  Server     │
                    │  (Port 4000)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          MongoDB       Redis       Filesystem
                                   (/uploads)
```

### Horizontal Scale Architecture (Multi-Node)

```
                   Load Balancer (sticky sessions OR any)
                    │              │              │
             ┌──────┴──┐    ┌──────┴──┐    ┌──────┴──┐
             │Node.js A│    │Node.js B│    │Node.js C│
             └──────┬──┘    └──────┬──┘    └──────┬──┘
                    │              │              │
                    └──────────────┴──────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
                MongoDB          Redis       Shared Storage
             (replica set)   (Redis Cluster  (S3 / NFS for
                              or Sentinel)    uploads)
```

### Scaling Considerations

| Component | Current | Scale Path |
|---|---|---|
| Socket.IO | Single node | Redis adapter (already implemented) |
| Message cache | In-process Map | Redis for shared cross-node cache |
| File uploads | Local disk | S3-compatible object storage |
| MongoDB | Single instance | Replica set → sharded cluster |
| Session state | MongoDB | Already stateless JWT; no change needed |

### Socket.IO Sticky Sessions

With multiple Node.js instances, Socket.IO's long-polling fallback requires sticky sessions (same client always routes to same server). WebSocket connections are stateless at the load balancer level. The recommended setup is:

```
nginx config:
  upstream backend {
    ip_hash;        ← sticky sessions by client IP
    server node_a:4000;
    server node_b:4000;
    server node_c:4000;
  }
```

---

## 17. Failure Handling & Resilience

### Redis Unavailability

```
Startup:
  Redis connect attempt → fails after 3 retries
  → InMemoryRedis fallback activated
  → Socket.IO adapter skipped (single-node mode)
  → Presence + typing continue working (in-process)
  → Warning logged; app remains fully functional for single instance
```

### MongoDB Connection Failure

```
Startup:
  await connectDB() fails
  → process.exit(1) with error log
  
Runtime (after startup):
  Mongoose auto-reconnects internally
  Requests fail with 500 until reconnected
  Socket events that require DB writes fail gracefully with error logs
```

### Gemini API Unavailability

```
AI routes return:
  { error: 'GEMINI_API_KEY not configured' }  ← if key missing
  { error: 'Gemini API error: ...' }          ← if API call fails
  HTTP 400 (not 500 — it's a feature, not a server error)

Client:
  AIPanel shows error toast; rest of app unaffected
```

### Client Reconnection Strategy

```
Socket.IO client auto-reconnects with exponential backoff.
On reconnect:
  1. Re-authenticate with current JWT
  2. Re-join all previously joined rooms
  3. Dispatch offline message queue
  4. POST /api/rooms/backfill for missed messages
  5. Re-sync presence state
```

### Graceful Server Shutdown

```
SIGINT / SIGTERM / SIGUSR2 received:
  1. server.close()           ← stop accepting new connections
  2. closeSocket()            ← io.close() + Redis pub/sub disconnect
  3. process.exit(0)
  
Timeout: 10 seconds
  If shutdown takes > 10s → process.exit(1) forced
```

### Process Stability

```
process.on('uncaughtException', handler)   ← log + continue (don't crash)
process.on('unhandledRejection', handler)  ← log + continue (don't crash)

This prevents a single bad async operation from killing the entire server.
```

---

## 18. Security Architecture

### Layered Security Model

```
Layer 1: Network
  - Helmet.js HTTP security headers
  - CORS: allowlist-based origin validation
  - HTTPS (enforced at reverse proxy level in production)

Layer 2: Authentication
  - Short-lived JWT access tokens (15 min)
  - Refresh token rotation with family tracking
  - Reuse detection → full session revocation
  - bcrypt OTP hashing (10 rounds)

Layer 3: Authorization
  - requireAuth middleware on all protected routes
  - Role-based access: ROLE_HIERARCHY { owner: 3, moderator: 2, member: 1 }
  - Room-level membership checks before any room operation

Layer 4: Rate Limiting
  - 30 requests / 15 min on /api/auth routes

Layer 5: Input Validation
  - Message text max 2000 chars
  - Username: 3–24 chars, [a-zA-Z0-9_-], unique case-insensitive
  - File upload: 50 MB max, MIME type allowlist
  - Custom status: emoji 10 chars, text 80 chars

Layer 6: Data Security
  - E2EE: server stores only ciphertext
  - No plaintext passwords stored (OTP + Google OAuth only)
  - File UUID naming prevents enumeration
```

### JWT Security Model

```
Access Token:
  Algorithm: HS256
  Payload: { sub: userId, username, iat, exp }
  Expiry: 15 minutes (configurable via ACCESS_TOKEN_EXPIRY)
  Storage: Memory (React state / AuthContext) + localStorage for persistence
  
Refresh Token:
  Format: UUID v4 (opaque, not JWT)
  Storage: MongoDB user.refreshTokens[]
  Expiry: 7 days (configurable via REFRESH_TOKEN_EXPIRY)
  Rotation: Every use issues a new token; old is revoked
  Family: UUID groups all rotations of a token chain
  
Reuse Detection:
  If a revoked token is presented:
    → All tokens in same family are immediately invalidated
    → User must re-authenticate from scratch
```

### XSS Prevention Strategy

```
Server:
  - express.json() parses but does not eval content
  - No server-side HTML rendering (pure JSON API)
  
Client:
  - React JSX auto-escapes all string content in JSX
  - No dangerouslySetInnerHTML usage
  - Markdown rendering uses safe renderer (no raw HTML injection)
```

---

## 19. Frontend Architecture Design

### Design Decision: Feature-Based Module Structure

The client is organized by feature domain rather than technical layer (components/containers/reducers). Each feature owns its pages, components, and hooks. Shared utilities live in `shared/`.

```
src/
  features/           ← Domain-driven feature modules
    auth/             ← Everything auth-related
    chat/             ← Core chat UI + logic
    calls/            ← Call logs + call UI
    home/             ← Landing page
    notifications/    ← Notification center
    profile/          ← Settings + profile
  shared/             ← Cross-feature reusables
    components/       ← Generic UI components
    context/          ← React contexts (Auth, Toast)
    hooks/            ← Shared hooks (useTheme)
    utils/            ← API client, crypto, socket, cache
```

### State Management Architecture

DropTalk deliberately avoids Redux/Zustand in favor of:

```
Global State (React Context):
  AuthContext     ← user, tokens, login/logout
  ToastContext    ← global toast queue

Feature State (custom hooks):
  useChat.js      ← messages[], rooms[], socket events
  useDM.js        ← dmConversations[], pending DMs
  useCalls.js     ← callLogs[], active call state
  useWebRTC.js    ← RTCPeerConnection, local/remote streams
  useNotifications.js ← notifications[], unreadCount

Why no global state manager?
  - Chat state is local to the Chat page (unmounted when user navigates away)
  - AuthContext is the only truly global state
  - Custom hooks with socket subscriptions are simpler than Redux middleware
```

### Route Architecture

```
/                 → Home (landing page, public)
/join             → JoinNow (auth page, public)
/set-username     → SetUsername (post-registration)
/chat             → Chat shell (protected)
/channels         → Chat shell (protected, channel view)
/channels/:roomId → Chat shell (protected, specific channel)
/dm               → Chat shell (protected, DM panel)
/dm/:dmId         → Chat shell (protected, specific DM)
/calls            → Chat shell (protected, calls view)
/notifications    → Chat shell (protected, notifications view)
/settings/:section → SettingsPage (protected)

Protection logic:
  if !user → redirect to /join
  if user.needsUsername → redirect to /set-username
  else → render children
```

### Code Splitting Strategy

```
All routes except Home and JoinNow are lazy-loaded:

  const Chat = lazy(() => import('./features/chat/pages/Chat.jsx'))
  const SettingsPage = lazy(() => import('./features/profile/pages/SettingsPage.jsx'))
  const SetUsername = lazy(() => import('./features/auth/pages/SetUsername.jsx'))

Wrapped in <Suspense fallback={<SuspenseFallback />}>

This means the main bundle only includes:
  - React core
  - React Router
  - AuthContext
  - Home page
  
Everything else is downloaded on-demand when first navigated to.
```

### Axios Interceptor (Auto Token Refresh)

```
api.js:

Request interceptor:
  → Attach Authorization: Bearer <accessToken> to every request

Response interceptor (on 401):
  → POST /api/auth/refresh with refreshToken
  → On success: update tokens in storage + AuthContext
                retry original request with new accessToken
  → On failure: clear tokens → redirect to /join

This makes token refresh completely transparent to all
feature-level API calls.
```

---

## 20. Key Design Trade-offs

### Trade-off 1: Monolith vs Microservices
**Chosen**: Modular Monolith  
**Trade-off**: Simpler deployment and development velocity vs independent scaling of individual services. Acceptable at current scale; feature boundaries are clean for future extraction.

### Trade-off 2: E2EE Scope
**Chosen**: E2EE is opt-in (private/encrypted rooms only)  
**Trade-off**: Public channels have no E2EE (server can read messages). This is intentional — Gemini AI summarization requires server-readable message text. E2EE and AI features are mutually exclusive by design.

### Trade-off 3: WebRTC Without TURN
**Chosen**: No TURN server  
**Trade-off**: P2P calls work on local networks and many NAT configurations, but may fail across symmetric NATs (enterprise firewalls). A TURN server would solve this at additional infrastructure cost.

### Trade-off 4: Local File Storage
**Chosen**: Multer disk storage to `/uploads`  
**Trade-off**: Simple and zero-cost vs not portable across multiple server instances. In a multi-node deployment, all instances must share a network filesystem or migrate to S3-compatible object storage.

### Trade-off 5: In-Process Cache vs Redis Cache
**Chosen**: JavaScript Map (in-process) for message caching  
**Trade-off**: Zero latency and no serialization overhead vs cache inconsistency across multiple server nodes. Acceptable because each node independently builds a warm cache and the TTL (60s) limits staleness.

### Trade-off 6: Embedded Members vs Separate Collection
**Chosen**: `Room.members[]` as embedded array  
**Trade-off**: Fast membership checks (single document read) vs document size growth for very large rooms. If room membership exceeds ~1000 users, a separate `memberships` collection should be introduced.

### Trade-off 7: Passwordless-Only Auth
**Chosen**: Email OTP + Google OAuth, no traditional passwords  
**Trade-off**: Eliminates password-based attacks at the cost of requiring email access for every login. No offline authentication possible. The `passwordHash` field is reserved in the schema for future addition.

### Trade-off 8: No Dedicated Notification Queue
**Chosen**: In-process notification creation inside route/socket handlers  
**Trade-off**: Simple and synchronous vs resilient. If MongoDB is slow, notification creation could delay the message response. A message queue (Bull/BullMQ) would decouple this at the cost of added infrastructure.

---

## Appendix: Request Lifecycle Summary

```
Every authenticated HTTP request:
  1. Express receives request
  2. CORS check (isAllowedOrigin)
  3. Helmet headers applied
  4. Rate limit check (auth routes only)
  5. JSON body parsed (limit 50MB)
  6. requireAuth: JWT verified → req.user set
  7. [Optional] requireAtLeastRole: room membership + role verified
  8. Feature handler executes:
     a. MongoDB query
     b. Business logic
     c. [Optional] Cache read/write
     d. [Optional] Socket.IO event emit
     e. [Optional] Notification creation
  9. JSON response returned

Every WebSocket event:
  1. Socket.IO receives event
  2. socket.user already verified (from handshake middleware)
  3. Handler executes:
     a. Validate payload
     b. Check membership (joined Set)
     c. MongoDB write
     d. Cache invalidation
     e. io.to(roomId).emit() broadcast
     f. [Optional] Targeted user notification
  4. ack({ ok: true }) returned to emitter
```

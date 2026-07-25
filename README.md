# 🌊 Drift

> Throw a thought into the ocean. Someone out there might find it.

Drift is an anonymous 1-to-1 messaging platform built around the idea of digital bottles floating through an ocean.

Users don't search for people. They send messages into the unknown, and the right person discovers them.

A bottle can become a conversation.
A random message can become a meaningful connection.

---

# ✨ About Drift

Most social platforms are built around:

- Followers
- Profiles
- Algorithms
- Public identity

Drift takes a different approach.

The core experience is:

```
Write a Bottle
      ↓
Throw Into Ocean
      ↓
Discovery Engine Finds Someone
      ↓
They Open Your Bottle
      ↓
Anonymous Reply
      ↓
1-to-1 Conversation
```

Drift focuses on:

- Anonymous communication
- Meaningful conversations
- Privacy
- Serendipitous discovery

---

# 🎯 Core Features

## 🫙 Bottle System

The heart of Drift.

Users can:

- Create anonymous bottles
- Throw bottles into the ocean
- Discover bottles from others
- Open bottles
- Reply and start conversations


Flow:

```
User
 |
Create Bottle
 |
Ocean Pool
 |
Discovery Engine
 |
Another User
 |
Reply
 |
Chat
```

---

## 🌊 Discovery Engine

Drift does not work like traditional social media.

Users are matched through:

- Mood
- Interests
- Language
- Preferences
- Activity patterns
- Privacy settings


Example:

```
Bottle:

"I feel alone tonight.
Anyone else awake?"


Matching:

Mood:
Lonely ✅

Language:
English ✅

Active Time:
Night ✅


Result:

Bottle delivered 🌊
```

---

## 💬 Anonymous Chat

When someone replies to a bottle:

A private anonymous conversation begins.


Features:

- Real-time messaging
- Socket.IO communication
- Conversation management
- Message persistence
- Reconnection handling

---

## 🔐 Privacy First

Users control:

- Bottle discoverability
- Reply permissions
- Online visibility
- Last seen
- Notification preferences

---

## ⚙️ Settings

Users can manage:

### Privacy

- Discoverability
- Replies
- Online status
- Last seen


### Notifications

- Bottle discovered
- New replies
- Messages
- Security alerts


### Appearance

- Light mode
- Dark mode
- Language


### Security

- Login alerts
- Sessions
- Account protection

---

# 🏗️ Architecture

Drift uses a modular backend architecture.

```
src/

├── modules/
│
│   ├── auth/
│   ├── user/
│   ├── profile/
│   ├── bottle/
│   ├── discovery/
│   ├── chat/
│   ├── settings/
│   ├── notification/
│   └── analytics/
│
├── infrastructure/
│
│   ├── database/
│   ├── redis/
│   ├── queue/
│   ├── socket/
│   └── logger/
│
└── common/
    
    ├── middleware/
    ├── errors/
    ├── validators/
    └── utils/
```

---

# 🛠️ Tech Stack

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication


## Real-Time

- Socket.IO


## Background Jobs

- BullMQ
- Redis


## Infrastructure

- Docker
- Docker Compose
- Nginx


## Security

- Helmet
- CORS
- Rate Limiting
- Input Validation


## Monitoring (Future)

- Prometheus
- Grafana
- OpenTelemetry
- Sentry


## Testing

- Jest / Vitest

---

# 🔄 System Flow

## Bottle Lifecycle

```
Create Bottle

      ↓

Validation

      ↓

Database Storage

      ↓

Ocean Pool

      ↓

Discovery Processing

      ↓

Bottle Delivery

      ↓

Open Bottle

      ↓

Reply

      ↓

Conversation
```

---

# 🚀 Development Setup

## Requirements

Install:

- Node.js >= 20
- MongoDB
- Redis
- Docker (recommended)


---

## Clone Repository

```bash
git clone https://github.com/yourusername/drift.git

cd drift
```

---

## Install Dependencies

```bash
npm install
```

---

## Environment Variables

Create:

```
.env
```

Example:

```env
PORT=5000

MONGO_URI=mongodb://localhost:27017/drift

REDIS_URL=redis://localhost:6379

JWT_SECRET=your_secret

NODE_ENV=development
```

---

## Run Development Server

```bash
npm run dev
```

---

# 🐳 Docker Setup

Start services:

```bash
docker compose up
```

Services:

```
Drift API
MongoDB
Redis
Nginx
```

---

# 📡 API Overview

## Authentication

```
POST /api/v1/auth/register

POST /api/v1/auth/login

POST /api/v1/auth/refresh

POST /api/v1/auth/logout
```

---

## Bottles

```
POST /api/v1/bottles

GET /api/v1/bottles/discover

GET /api/v1/bottles/:id

POST /api/v1/bottles/:id/reply
```

---

## Chat

```
GET /api/v1/conversations

GET /api/v1/messages/:conversationId
```

Realtime:

```
Socket.IO
```

---

## Settings

```
GET /api/v1/settings

PATCH /api/v1/settings/privacy

PATCH /api/v1/settings/notifications

PATCH /api/v1/settings/appearance
```

---

# 🧪 Testing

Run tests:

```bash
npm test
```

Important flows tested:

- Authentication
- Bottle creation
- Discovery
- Conversation creation
- Messaging
- Settings updates

---

# 📈 Development Roadmap

## Phase 1 — Foundation

✅ Authentication  
✅ User system  
✅ Bottle creation  
✅ Basic discovery  
✅ Anonymous chat  


## Phase 2 — Reliability

🚧 Error handling  
🚧 Testing  
🚧 Logging  
🚧 Queue reliability  


## Phase 3 — Personalization

Planned:

- Mood matching
- Interest matching
- Delivery preferences
- Achievements


## Phase 4 — Advanced Features

Future:

- Voice bottles
- Image bottles
- Bottle expiration
- Reactions
- E2E encryption
- Advanced recommendation system

---

# 🧠 Engineering Philosophy

Drift follows these principles:

### User First

Every feature should improve the user's journey.

### Don't Over Engineer

Build infrastructure when needed.

### Modular Design

Features stay independent and maintainable.

### Privacy Matters

Anonymous communication requires trust.

### Quality Over Quantity

A stable simple product beats a collection of unfinished features.

---

# 🤝 Contribution

Contributions are welcome.

Before contributing:

1. Understand the Drift workflow.
2. Keep modules isolated.
3. Add tests for new behavior.
4. Avoid unnecessary complexity.

---

# 📜 License

MIT License

---

# 🌊 Final Thought

Every bottle carries a message.

Every message has a chance to connect two strangers.

Welcome to Drift.

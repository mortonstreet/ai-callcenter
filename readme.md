# RevCenter - Your AI Call Center Agent

Transform your call center operations with intelligent AI agents that handle calls 24/7, intelligently qualify leads, book appointments, and seamlessly integrate with your existing systems.

## Features

- **AI Voice Agents**: Intelligent agents powered by ElevenLabs for natural conversations
- **Multi-tenant Organizations**: Manage multiple organizations with team invitations
- **Real-time Dashboard**: Analytics and activity monitoring
- **Lead Management**: Create and manage leads with AI-powered qualification
- **Call Recordings**: Full conversation history with transcripts
- **Stripe Integration**: Built-in payment processing
- **Authentication**: Email/password and Google OAuth support

## Tech Stack

### Backend
- **Express.js** with TypeScript
- **Prisma + Kysely** for type-safe database queries
- **BullMQ** for job queues
- **Better Auth** for authentication
- **Stripe** for payments
- **ElevenLabs** for AI voice

### Frontend
- **Next.js 15** with App Router
- **React Query** for data fetching
- **Tailwind CSS 4** for styling
- **Zustand** for state management

### Infrastructure
- PostgreSQL database
- Redis for caching and queues
- Docker Compose for local development

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 10+
- Docker & Docker Compose

### 1. Clone and Install

```bash
git clone https://github.com/mortonstreet/revcenter.git
cd revcenter
pnpm install
```

### 2. Setup Infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port `5433`
- Redis on port `6380`
- Mailhog on port `1025` (UI on `8025`)

### 3. Configure Environment

Copy the example env files and configure them:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local

# Database
cp shared/db/.env.example shared/db/.env
```

Edit each file with your API keys and configuration.

### 4. Run Database Migrations

```bash
cd shared/db
pnpm run db:migrate
```

### 5. Start Development

```bash
# Terminal 1 - Backend
cd backend
pnpm run dev

# Terminal 2 - Frontend
cd frontend
pnpm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Mailhog UI: http://localhost:8025

## Project Structure

```
├── backend/
│   ├── cli/              # CLI scripts
│   └── src/
│       ├── api/          # Express routes & controllers
│       ├── clients/      # External service clients
│       ├── config/       # Environment configuration
│       ├── lib/          # Core libraries
│       ├── queues/       # BullMQ workers
│       ├── repositories/ # Database queries
│       ├── services/     # Business logic
│       └── utils/        # Helper functions
├── frontend/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities & config
└── shared/
    ├── db/               # Prisma schema & migrations
    └── types/            # Shared TypeScript types
```

## Environment Variables

### Backend (Required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for JWT tokens |
| `FRONTEND_URL` | Frontend URL for CORS |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `RESEND_API_KEY` | Resend email API key |
| `ELEVEN_LABS_API_KEY` | ElevenLabs API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |

### Frontend (Required)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## Deployment

### Railway

The backend service builds with [Railpack](https://railpack.com) using `backend/railpack.json`
(Root Directory is set to `/backend` in Railway):

```bash
# Build commands run automatically
pnpm install
pnpm --filter @shared/db db:generate
pnpm --filter revcenter-backend build

# Start command
NODE_ENV=production pnpm --filter @shared/db db:deploy
NODE_ENV=production node dist/server.mjs
```

### Docker

Use the provided `docker-compose.yml` for production deployment with your own infrastructure.

## Scripts

```bash
# Root
pnpm validate      # Format, typecheck, lint, and build all
pnpm build         # Build all packages
pnpm lint          # Lint all packages
pnpm format:write  # Format all files

# Backend
pnpm --filter backend dev    # Start dev server
pnpm --filter backend build  # Production build

# Frontend
pnpm --filter frontend dev   # Start Next.js dev
pnpm --filter frontend build # Production build

# Database
pnpm --filter @shared/db db:migrate  # Run migrations
pnpm --filter @shared/db db:studio   # Open Prisma Studio
```

## License

ISC

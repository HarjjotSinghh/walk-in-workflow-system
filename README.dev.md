# wiws Development Guide

This guide helps you set up and run the wiws project locally for development.

## Quick Start

```bash
# Clone and install dependencies
git clone <repository-url>
cd wiws
pnpm install

# Start development servers
pnpm dev

# Or start individual services
pnpm dev:web    # Frontend only (port 5174)
pnpm dev:api    # API only (port 8787)
```

## Prerequisites

- **Node.js**: 18+ required
- **pnpm**: 9.0.0+ required (`npm install -g pnpm`)
- **Cloudflare account**: For D1 database and deployment

## Project Structure

```
wiws/
├── apps/
│   ├── api/          # Hono API (Cloudflare Workers)
│   └── web/          # Vite.js React App
├── packages/
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configurations
└── README.dev.md     # This file
```

## Development Workflow

### 1. Database Setup

```bash
# Create D1 database locally
cd apps/api
pnpm db:create

# Apply migrations
pnpm db:migrate

# Seed with initial data
curl -X POST http://localhost:8787/seed
```

### 2. Environment Variables

Create `.env` files in respective apps:

**apps/api/.env:**
```env
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:8787
FRONTEND_URL=http://localhost:5174
ENVIRONMENT=development
```

**apps/web/.env:**
```env
VITE_API_URL=http://localhost:8787
VITE_BETTER_AUTH_URL=http://localhost:8787
```

### 3. Start Development Servers

```bash
# Start all services
pnpm dev

# Or individually:
pnpm dev:api    # http://localhost:8787
pnpm dev:web    # http://localhost:5174
```

### 4. Verify Setup

```bash
# Check API health
curl http://localhost:8787/health

# Check web app
open http://localhost:5174
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm dev:web` | Start frontend only |
| `pnpm dev:api` | Start API only |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm lint:fix` | Fix ESLint issues automatically |
| `pnpm format` | Format code with Prettier |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:studio` | Open database studio |

## API Development

### Database Operations

```bash
# Generate new migration
cd apps/api
pnpm drizzle:generate

# Apply migrations locally
pnpm db:migrate

# View database
pnpm db:studio
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:8787/health

# Create a visit
curl -X POST http://localhost:8787/api/visits \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","phone":"1234567890","serviceId":1}'

# Get visits
curl http://localhost:8787/api/visits
```

## Frontend Development

### Starting the Web App

```bash
cd apps/web
pnpm dev
```

The app will be available at `http://localhost:5174` with hot reload enabled.

### Building Components

- Use shadcn/ui components from `src/components/ui/`
- Follow the established patterns in existing components
- Use TypeScript for all new code

## Authentication Flow

1. **Login**: Navigate to `/login`
2. **Roles**: `reception`, `pa`, `consultant`, `admin`
3. **Protected Routes**: Most dashboard routes require authentication

## Database Schema

Key tables:
- `users` - Staff members with roles
- `services` - Available services (ITR, GST, etc.)
- `visits` - Walk-in visitor records
- `audit` - Change tracking

## Real-time Updates

The system uses Server-Sent Events (SSE) for real-time updates:
- Reception sees new approvals instantly
- PA sees new visit requests
- Consultants see assigned visits

## Common Issues

### Database Connection Issues
```bash
# Reset local database
rm -rf .wrangler/state
pnpm db:migrate
curl -X POST http://localhost:8787/seed
```

### Port Conflicts
- API uses port 8787 (configurable in wrangler.toml)
- Web uses port 5174 (configurable in vite.config.ts)

### Authentication Issues
- Clear browser storage/cookies
- Check `.env` variables match
- Verify API is running on correct port

## Deployment

### Development Preview
```bash
pnpm build
# Preview URLs will be provided by Cloudflare Pages
```

### Production
```bash
pnpm deploy
```

## Getting Help

1. Check this README for common setup issues
2. Review the main `README.md` for project overview
3. Check `TODO.md` for known issues and planned features
4. Look at `END_GOAL.md` for the complete specification

## Code Quality

Before committing:
```bash
pnpm lint          # Check for linting issues
pnpm type-check    # Verify TypeScript
pnpm format        # Format code
```

## Technology Stack

- **Frontend**: Vite.js, React 19, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers, Hono, Better Auth
- **Database**: Cloudflare D1 (SQLite), Drizzle ORM
- **Deployment**: Cloudflare Pages + Workers
- **Package Management**: pnpm with workspaces

## Next Steps

After setup, you can:
1. Explore the codebase starting with `apps/web/src/App.tsx`
2. Check API routes in `apps/api/src/routes/`
3. Review database schema in `apps/api/src/db/schema.ts`
4. Test the walk-in workflow end-to-end
# Memoria B2B Platform

## Structure

```
memoria-b2b/
├── apps/
│   ├── api/          # API service (Express/Fastify)
│   └── web/          # Frontend application (Next.js/React)
├── packages/
│   └── db/           # Database layer (Prisma + PostgreSQL)
├── package.json      # Workspace root
├── turbo.json        # Turborepo config
└── CLAUDE.md         # Project documentation
```

## Development

```bash
# Install dependencies
npm install

# Set up database
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations
npm run db:migrate

# Start development
npm run dev
```

## Database Principles

- **Portable:** Schema via Prisma migrations, no DB-specific features
- **Dumb DB:** Business logic lives in app layer, not stored procedures
- **Multi-tenant:** tenantId on all user-scoped tables

## Adding a new package

```bash
mkdir packages/my-package
cd packages/my-package
npm init -y
# Add to workspaces in root package.json
```
# Memoria B2B Platform

**Stack:** Monorepo + Turborepo + Prisma + Node.js/TypeScript + PWA

---

## CRITICAL: Use ONLY gstack Skills

Do NOT use superpowers or non-gstack skills. Every workflow tool exists in gstack — use it.

---

## Routing (ALL requests)

| When I say... | Use this |
|---------------|----------|
| "do this", "build", "implement", "create", "make" | `/autoplan` first |
| question, what is, how do | `/office-hours` |
| plan, design, architecture | `/plan-eng-review` or `/plan-ceo-review` |
| review, check code | `/review` |
| test, QA, find bugs | `/qa` |
| ship, deploy, release | `/ship` |
| security, audit | `/cso` |
| debug, fix, error, broken | `/investigate` |
| design, UI, mockup | `/plan-design-review` |
| performance, speed | `/benchmark` |
| retro, weekly | `/retro` |
| save, checkpoint | `/context-save` |
| restore, continue | `/context-restore` |
| careful, safe mode | `/guard` |
| browse, open browser | `/browse` |

---

## Workflow

`Think → /office-hours` → `Plan → /autoplan` → `Build` → `Review → /review` → `Test → /qa` → `Ship → /ship` → `Reflect → /retro`

---

## Principles

1. **Search Before Building** — check existing code before adding new
2. **Boil the Lake** — tackle the hardest part first
3. **Test Everything** — 100% coverage, every bug gets a regression test
4. **Ship Small** — small PRs, fewer bugs

---

## Daily

| Time | Command |
|------|---------|
| Morning | `/context-restore` |
| Every feature | `/office-hours` → `/autoplan` → implement → `/review` → `/qa` → `/ship` |
| Friday | `/retro` |
| Before end | `/context-save` |

---

## Technical

- Node.js / TypeScript / PWA / Next.js
- All secrets in `.env`, never commit credentials
- Docs: `~/.claude/skills/gstack/`

---

## Supabase Best Practices

### PostgreSQL Identifier Quoting (CRITICAL)

Supabase uses PostgreSQL. **camelCase columns MUST use double-quotes** to preserve case. Without quotes, PostgreSQL folds to lowercase and queries fail with `42703 column does not exist`.

```sql
-- WRONG (case folded to lowercase, column not found)
SELECT studioId FROM events

-- RIGHT (double-quotes preserve camelCase)
SELECT "studioId" FROM events
```

Same rule applies in ALL contexts: RLS policies, trigger functions, INSERT values, WHERE clauses.

### auth.uid() Type Casting

Supabase's `auth.uid()` returns `UUID` type. If your `users.id` column is `TEXT`, ALL policy comparisons need `::TEXT` cast:

```sql
-- WRONG (UUID vs TEXT type mismatch)
WHERE "studioId" IN (SELECT "studioId" FROM users WHERE id = auth.uid())

-- RIGHT
WHERE "studioId" IN (SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT)
```

### UUID vs TEXT for IDs

Our DB uses TEXT for all ID columns (not UUID). When creating tables or functions, use `TEXT`, not `UUID`:

```sql
-- WRONG
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- RIGHT
id TEXT PRIMARY KEY DEFAULT gen_random_uuid()
```

### Table and Column Naming

- All table and column names use camelCase in the actual DB
- Foreign keys: `"photoId"`, `"eventId"`, `"studioId"` (always double-quoted)
- Index names: `idx_photo_faces_face_id` (snake_case, no quotes needed)
- Always double-quote camelCase identifiers in SQL

### PostgREST Schema Cache Staleness

PostgREST caches the DB schema on startup. After running migrations that add columns, the cache goes stale — new columns don't work in queries until PostgREST restarts.

**Symptom:** `42703 column does not exist` on columns you just added.

**Temporary fix:** Reset pooler from Supabase Dashboard → Project Settings → Database → Connection Pooling → Reset pooler.

**Permanent fix:** Migration `010_auto_reload_postgrest_cache.sql` creates a DDL event trigger that calls `pg_notify('pgrst', 'reload schema')` on every schema change. However, this notification doesn't reach PostgREST through PgBouncer — it only works after the initial PostgREST restart.

**Workaround until restart:** Use only columns that existed before the migration in your queries. For events list, use `order('id', ...)` instead of `order('createdat', ...)`.

### Migrations

- All migrations live in `supabase/migrations/`
- Run with `supabase db push` (requires local Docker or linked project)
- Migrations are numbered: `001_`, `002_`, etc.
- Never edit a migration after it's been applied to production — create a new one instead

### Edge Functions (Deno)

- Located in `supabase/functions/<function-name>/index.ts`
- Auth: decode JWT payload directly via `atob(token.split('.')[1])` — don't use `supabase.auth.getUser()` in Edge Functions (service role context)
- Column names: use camelCase with double-quotes in SQL strings
- FormData for file uploads: `formData.get('fieldName')`

### RLS Policies Pattern

Every table with RLS has policies following this pattern:

```sql
-- Studio-scoped (via users table)
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own records" ON my_table
  FOR SELECT USING (
    "studioId" IN (SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT)
  );
```

### Key Migrations Reference

| Migration | What it does |
|-----------|-------------|
| `001_rls_policies.sql` | Core RLS policies for studios, users, events |
| `003_photo_gb_trigger.sql` | Auto-increment `photoGbUsed` on photo insert |
| `006_tables_and_rls.sql` | `couple_access`, `ai_face_index`, `photo_faces` tables + RLS |
| `008_add_studio_photo_gb_used.sql` | Adds `studios.photoGbUsed`, backfills from events |
| `010_auto_reload_postgrest_cache.sql` | DDL event trigger to notify PostgREST of schema changes |

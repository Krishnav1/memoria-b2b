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

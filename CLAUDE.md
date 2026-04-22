# Memoria B2B Platform

## Project Overview

Building a B2B platform application. This project follows gstack methodology: Think → Plan → Build → Review → Test → Ship → Reflect.

---

## CRITICAL RULE: Use ONLY gstack Skills

**Do NOT use superpowers, superpower-skills, or any other non-gstack skills unless the user explicitly requests it in chat.**

- This project uses **gstack ONLY**
- All work follows gstack workflow: `/office-hours` → `/autoplan` → `/review` → `/qa` → `/ship`
- superpowers skills are disabled for this project
- If a gstack skill exists for what you need to do, use it

---

## gstack

gstack is my software factory that turns Claude Code into a virtual engineering team. Full docs: `~/.claude/skills/gstack/`

### How to Use gstack

**When you ask a question or say "do this":**
- ALWAYS invoke the appropriate gstack skill first via the Skill tool
- The skill has multi-step workflows, checklists, and quality gates that produce better results than ad-hoc answers
- When in doubt, invoke the skill — a false positive is cheaper than a false negative

**Routing Rules (apply to ALL requests):**

| When I say... | Invoke this skill |
|--------------|-------------------|
| "do this", "build this", "implement", "create", "make" | `/autoplan` first, then implement |
| "question", "what is", "how do", "explain", "help me understand" | `/office-hours` or answer with gstack routing |
| "plan this", "design this", "architecture" | `/plan-eng-review` or `/plan-ceo-review` |
| "review", "check my code", "look at" | `/review` |
| "test", "QA", "find bugs", "does it work" | `/qa` |
| "ship", "deploy", "push to prod", "release" | `/ship` |
| "security", "audit", "vulnerability" | `/cso` |
| "debug", "fix", "error", "broken", "wtf" | `/investigate` |
| "design", "UI", "mockup", "look and feel" | `/plan-design-review` |
| "performance", "speed", "benchmark" | `/benchmark` |
| "docs", "documentation" | `/document-release` |
| "retro", "weekly", "how did we do" | `/retro` |
| "save", "checkpoint", "where was I" | `/context-save` |
| "restore", "continue", "resume" | `/context-restore` |
| "careful", "safe mode", "lock it down" | `/guard` |
| "browse", "open browser", "go to website" | `/browse` |

### Quick Reference

```bash
# Start here for new features
/autoplan           # Auto-runs CEO → design → eng review

# Then build
/implement           # (after autoplan) - execute the plan

# Then ship
/review             # Pre-ship code review
/qa                 # Test the app, find bugs
/ship               # Ship to production
```

## Platform Development

### Principles

1. **Search Before Building** — Check existing code before adding new
2. **Boil the Lake** — Start with the hardest part, not the easiest
3. **Test Everything** — 100% test coverage goal, every bug gets a regression test
4. **Ship Small** — Small PRs ship faster and with fewer bugs

### Workflow

1. **Think** → `/office-hours` to refine the idea
2. **Plan** → `/autoplan` or specific review skill
3. **Build** → Implement with checkpoint commits
4. **Review** → `/review` catches production bugs
5. **Test** → `/qa` verifies everything works
6. **Ship** → `/ship` creates PR, `/land-and-deploy` merges
7. **Reflect** → `/retro` weekly

## Technical

- Node.js / TypeScript preferred
- Use gstack browse for web interactions
- All secrets in `.env`, never commit real credentials

## Daily gstack Workflow

### Every Morning: Check State
```
/context-restore    # Resume where you left off (if you saved yesterday)
/retro              # Quick weekly retro (Fridays)
```

### For Every Feature
```
1. /office-hours    # Refine the idea - 6 forcing questions
2. /autoplan        # Auto-runs CEO → design → eng review
3. [implement]      # Build with checkpoint commits
4. /review          # Catch production bugs
5. /qa              # Test the app, find bugs
6. /ship            # Create PR
```

### Quick Commands Reference
| Task | Command |
|------|---------|
| Refine an idea | `/office-hours` |
| Plan a feature | `/autoplan` |
| Code review | `/review` |
| Test app | `/qa <url>` |
| Ship to prod | `/ship` |
| Debug an issue | `/investigate` |
| Security audit | `/cso` |
| Design review | `/plan-design-review` |
| Performance check | `/benchmark` |
| Save state | `/context-save` |
| Weekly retro | `/retro` |

### Karpathy-Style AI Coding Rules (gstack enforced)
1. **Wrong assumptions** → `/office-hours` forces assumptions into the open
2. **Overcomplexity** → `/review` catches unnecessary complexity
3. **Orthogonal edits** → `/investigate` traces data flow before fixes
4. **Imperative over declarative** → `/ship` transforms tasks into verifiable goals with test-first execution

### Tips for Solo Builders
- **Parallel sprints**: Run multiple features at once - `/review` on one branch while implementing another
- **Start hard**: "Boil the lake" — tackle the hardest part first, not the easiest
- **Ship small**: Small PRs ship faster with fewer bugs
- **Test everything**: Every bug gets a regression test from `/qa`
- **10-15 parallel workers** is practical max right now

### gstack Resources
- Docs: `~/.claude/skills/gstack/`
- Full skill list: `/learn` to see all available commands
- Upgrade: `/gstack-upgrade`

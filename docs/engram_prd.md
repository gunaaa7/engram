# ENGRAM - Product Requirements Document
**Version:** 1.0 - MVP | **Author:** Guna | **Date:** April 2026 | **Phase:** Solo build - Proof of Work

---

## 1. Problem Statement

People accumulate fragments of their lives across too many places - inside their heads, scattered across apps, buried in conversations. Requests from family, tasks from managers, random ideas, personal goals, half-formed thoughts. The problem is not that people fail to capture things. The problem is that nothing they capture is retrievable in a meaningful way.

Existing tools solve input or display. Notes apps give you a list. Task managers give you checkboxes. Search gives you keyword matches. None of them answer: "What did mom ask me to do about Priya this month?" or "What product ideas have I had in the last two weeks?"

With LLMs and vector embeddings, that retrieval layer is now buildable by a single developer in a weekend. Engram is that layer - capture anything in raw form, query it in plain language.

**Core Insight:** Every existing tool optimizes for capture or display. Nobody has optimized for retrieval at the personal context level. Engram is the query layer that should have existed years ago.

---

## 2. Goals

1. Users can capture a raw thought in under 5 seconds - zero friction, becomes a reflex
2. Natural language queries return accurate, trustworthy answers - 8/10 queries return relevant synthesized response
3. Product is used daily by its builder within one week of shipping
4. Product can be fully explained and demonstrated in under 2 minutes
5. Accessible via a public URL without installation - shareable with a single link

---

## 3. Non-Goals

- **Not a task manager** - no checkboxes, due dates, reminders, or completion states
- **Not a habit tracker** - habit logging, streaks, workout tracking are a different product
- **Not a multi-user or collaborative tool** - v1 is single-user only
- **Not voice-first in v1** - voice capture is v2; ship text-first, prove the query layer works
- **Not an external content manager in v1** - URL saving and article reading are v2
- **Not a native mobile app** - Engram is a PWA; installable on iOS and Android home screens from the same codebase, no App Store required. React Native is a future consideration only if OS-level integrations become necessary.

---

## 4. User Stories

### Capture
- As a user juggling multiple contexts, I want to type a raw thought the moment it occurs so I don't lose it before I can act on it
- As a user on a call with my mom, I want to capture what she's asking me to do in seconds without navigating menus or choosing a category
- As a user with a product idea, I want to dump it in raw form with no formatting required

### Retrieval
- As a user, I want to ask "What has mom asked me to do in the last month?" and get a synthesized answer from my captures
- As a user, I want to ask "What professional tasks am I sitting on?" and see relevant entries
- As a user, I want to ask "What product ideas have I been thinking about lately?" and get a synthesized view
- As a user, I want to see the source entries that contributed to any answer so I can trust the response

### Edge Cases
- As a user who queries something with no relevant captures, I want a clear message - not a hallucinated answer
- As a user who made a typo in a capture, I want to delete that entry

---

## 5. Requirements

### P0 - Must Ship

| Requirement | Acceptance Criteria |
|---|---|
| Capture input | Single text field, saves on Enter, clears after save, empty input does nothing |
| Auto-timestamp entries | Every entry stores UTC timestamp on save, shown in readable format |
| Vector embedding on save | OpenAI text-embedding-3-small called on every save, stored in Supabase pgvector, failure does not silently drop the entry |
| Natural language query | Single query input, submits on Enter, triggers semantic search |
| Semantic retrieval + LLM synthesis | Top-N entries by vector similarity, GPT-4o-mini synthesizes answer, source entries displayed below answer |
| Public deployment | Accessible at real URL (not localhost), deployed on Vercel, works on Chrome desktop |

### P1 - Ship If Time Allows

| Requirement | Acceptance Criteria |
|---|---|
| Delete entry | Delete action per entry, confirmation before deletion, embedding also removed |
| Entry list view | All entries visible newest first, timestamps shown, scrollable |
| PWA + mobile responsive | manifest.json configured, service worker registered, Add to Home Screen tested on iOS and Android, standalone mode when launched from home screen, usable on mobile without horizontal scroll |

### P2 - Future (Design Decisions Should Not Foreclose These)

- Voice capture (Whisper API)
- External content capture (URL paste, auto-extract, embed)
- Browser extension for quick capture

---

## 6. Technical Architecture

| Layer | Choice | Reasoning |
|---|---|---|
| Frontend | Next.js + React | Fast to scaffold, native Vercel deploy |
| Database | Supabase (Postgres + pgvector) | Relational + vector search in one service, free tier sufficient |
| Embeddings | OpenAI text-embedding-3-small | Best cost/performance ratio, ~$0.00002/1K tokens |
| LLM Synthesis | GPT-4o-mini | Fast, cheap, accurate enough for personal context queries |
| Deployment | Vercel | Zero-config deploy for Next.js |
| Mobile | PWA (manifest.json + service worker) | Same codebase as web, installable on iOS and Android, no App Store |

---

## 7. Success Metrics

| Metric | Target |
|---|---|
| Daily capture streak | Used every day for 7 days post-launch |
| Query accuracy | Correct answer on 8/10 test queries |
| Time to first capture | Under 10 seconds from landing |
| Demo clarity | Full product explained and demoed in under 2 minutes |

---

## 8. Competitive Context

| Product | What they do | Where Engram differs |
|---|---|---|
| mymind.com | Visual bookmarking for external content | Engram captures personal context, not external content |
| Mem.ai | AI-powered notes workspace | Mem is a workspace; Engram is capture-query only, simpler by design |
| Rewind.ai | Records screen, makes everything searchable | Passive capture vs. intentional capture - higher signal-to-noise |
| Notion AI | AI layer over document workspace | Notion requires structure; Engram is raw and frictionless |
| Readwise Reader | Read-it-later + highlights with AI | External content only; Engram's core is personal context |

---

## 9. Interview Narrative

- **Problem:** I kept dropping things people asked me to do - family, manager, people I care about. Not because I was careless. Because the way I captured things was scattered and nothing I wrote down was retrievable in a meaningful way.
- **Insight:** Every existing tool optimizes for input or display. Nobody has solved retrieval at the personal context level. I wanted to ask questions of my own life.
- **Why now:** Two years ago this wasn't buildable by one person in a weekend. LLMs and vector embeddings changed that.
- **What I built:** A personal semantic memory store. Capture anything raw, query in plain language, get a synthesized answer with sources.
- **What I cut:** Habit tracking, task management, voice capture, external links - all cut from v1. Goal was to prove one thing: the query layer works.
- **What I'd do next:** Validate with 10 people outside myself. Then add voice capture - highest-friction point in the current flow.

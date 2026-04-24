# Engram

Engram is a personal memory app built as a single Next.js application. It lets you capture text entries, store vector embeddings in Supabase, retrieve the most relevant entries for a question, and synthesize a source-backed answer from those retrieved memories.

The current repo is no longer the default `create-next-app` scaffold. It now includes the MVP UI, server route handlers, database schema, prompt construction, local shadcn-style UI primitives, and PWA support.

## Current MVP Scope

- Capture text entries from the UI
- Store entries in Supabase with `source` and `input_metadata`
- Generate embeddings on the server
- Retrieve the top 5 semantic matches with pgvector cosine similarity
- Synthesize answers with a configurable Google or OpenAI text model
- Show source entries under each answer
- Delete captured entries
- Install as a PWA with manifest and icons
- Sign in or create an account with email/password

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth + Supabase Postgres + pgvector
- Google or OpenAI for answer synthesis
- OpenAI or Google for embeddings
- Tailwind CSS v4
- `next-pwa`
- Radix Tabs with local UI primitives in `components/ui`

## Architecture

The app keeps all database and model access on the server side through Next.js route handlers.

- `GET /api/entries`: list entries ordered by newest first
- `POST /api/entries`: validate, embed, and insert a new entry
- `DELETE /api/entries/[id]`: remove an entry
- `POST /api/query`: embed the question, run vector search, and synthesize an answer

The browser does not talk directly to Supabase for Engram data access. Supabase Auth owns login/session cookies, while route handlers own reads, writes, retrieval, model calls, and user authorization.

All Engram rows are scoped by Supabase Auth's `auth.users.id` UUID in `user_id`.

## Embedding Providers

Embeddings are provider-switchable through `EMBEDDING_PROVIDER`.

- Default behavior: OpenAI embeddings via `text-embedding-3-small`
- Optional provider: Google embeddings via `gemini-embedding-001`
- Current checked-in schema is configured for Google dimensions: `vector(768)`

This matters for setup:

- If `EMBEDDING_PROVIDER=google`, use the checked-in schema as-is.
- If you want OpenAI embeddings instead, you must change the database vector dimensions from `768` to `1536` in `db/schema.sql` and in the `match_entries` RPC signature before applying the schema.
- A provider switch after data already exists requires re-embedding existing rows.

## Synthesis Providers

Answer synthesis is provider-switchable through `SYNTHESIS_PROVIDER`.

- Default behavior: Google synthesis via `gemini-2.5-flash`
- Optional provider: OpenAI synthesis via `gpt-4o-mini` or another configured model
- Optional Gemini tuning: `GOOGLE_SYNTHESIS_THINKING_BUDGET` controls the Gemini 2.5 thinking budget

The checked-in default is chosen to favor a fast reasoning model on the Gemini free tier while keeping provider and model selection configurable through environment variables.

## Environment Variables

Create `.env.local` in the project root and set the variables required for your chosen provider.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Use either of these server-side Supabase keys
SUPABASE_SECRET_KEY=
# or
SUPABASE_SERVICE_ROLE_KEY=

# Only required for one-off legacy row backfill
OWNER_EMAIL=
ALLOW_PUBLIC_SIGNUP=false
PUBLIC_SIGNUP_LIMIT_PER_IP_PER_HOUR=5
ENTRY_CREATE_LIMIT_PER_USER_PER_HOUR=60
ENTRY_CREATE_LIMIT_PER_IP_PER_HOUR=120
QUERY_LIMIT_PER_USER_PER_HOUR=30
QUERY_LIMIT_PER_IP_PER_HOUR=60

# Embedding provider selection: "google" or omit for OpenAI
EMBEDDING_PROVIDER=google

# Synthesis provider selection: "google" or "openai"
SYNTHESIS_PROVIDER=google
SYNTHESIS_MODEL=gemini-2.5-flash
SYNTHESIS_TEMPERATURE=0.2

# Required when EMBEDDING_PROVIDER=google
# and for Google synthesis when SYNTHESIS_PROVIDER=google
GOOGLE_AI_API_KEY=

# Optional for Gemini 2.5 synthesis. -1 enables dynamic thinking.
GOOGLE_SYNTHESIS_THINKING_BUDGET=-1

# Required for OpenAI synthesis when SYNTHESIS_PROVIDER=openai,
# and also for embeddings if EMBEDDING_PROVIDER is omitted
OPENAI_API_KEY=
```

Notes:

- Query synthesis defaults to Google `gemini-2.5-flash`.
- Embeddings use Google only when `EMBEDDING_PROVIDER=google`; otherwise they use OpenAI.
- Synthesis uses the provider and model selected by `SYNTHESIS_PROVIDER` and `SYNTHESIS_MODEL`.
- `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are treated as interchangeable server-side credentials by the app.
- Public signup is disabled by default for deployment safety. Set `ALLOW_PUBLIC_SIGNUP=true` only if you are comfortable exposing model-backed endpoints to self-serve signups.
- If you enable public signup, apply `db/migrations/0007_rate_limits.sql` first so signup, memory creation, and query routes are rate-limited through Supabase.

## Database Setup

The repo now keeps database changes in ordered SQL files under [`db/migrations/`](/C:/Guna/Projects/engram/db/migrations). For a new environment, apply them in order:

1. [`db/migrations/0001_extensions.sql`](/C:/Guna/Projects/engram/db/migrations/0001_extensions.sql)
2. [`db/migrations/0002_entries.sql`](/C:/Guna/Projects/engram/db/migrations/0002_entries.sql)
3. [`db/migrations/0003_chat_tables.sql`](/C:/Guna/Projects/engram/db/migrations/0003_chat_tables.sql)
4. [`db/migrations/0004_chat_triggers.sql`](/C:/Guna/Projects/engram/db/migrations/0004_chat_triggers.sql)
5. [`db/migrations/0005_match_entries.sql`](/C:/Guna/Projects/engram/db/migrations/0005_match_entries.sql)
6. [`db/migrations/0006_auth_ownership.sql`](/C:/Guna/Projects/engram/db/migrations/0006_auth_ownership.sql)
7. [`db/migrations/0007_rate_limits.sql`](/C:/Guna/Projects/engram/db/migrations/0007_rate_limits.sql)

[`db/schema.sql`](/C:/Guna/Projects/engram/db/schema.sql) remains as the full current snapshot for reference and fresh bootstrap use. New DB changes should go into a new migration file first, then be copied into the snapshot.

The current schema does the following:

- enables `vector`
- enables `pgcrypto`
- creates the `entries` table if needed
- adds `source` and `input_metadata` columns if they are missing
- creates persisted chat thread/message/source tables
- updates thread activity timestamps through database triggers
- enables row level security
- stores row ownership with Supabase Auth UUIDs in `user_id`
- keeps retrieval on exact search by default
- defines the `match_entries` RPC used by `/api/query`

Important:

- The default schema intentionally does not create an IVFFlat/HNSW ANN index.
- On small datasets, approximate vector indexes can hurt recall and in this project caused `match_entries` RPC calls to return zero rows while exact search still found the correct matches.
- Only add an ANN index after the table is meaningfully larger, and verify recall with `npm run debug:query` before keeping it.

The app expects the following fields on each entry:

- `id`
- `content`
- `source`
- `input_metadata`
- `created_at`

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

With the default deploy configuration, users must sign in with an existing account. If you want open self-signup, set `ALLOW_PUBLIC_SIGNUP=true` and apply the rate-limit migration first.

To assign existing pre-auth rows with `null` ownership to your account, set `OWNER_EMAIL` to your Supabase Auth email and run:

```bash
npm run backfill:owner
```

Production builds currently use webpack because `next-pwa` is wired into the Next.js 16 build:

```bash
npm run build
npm run start
```

## Query Debugging

Use the query debug script to trace the full retrieval and answer pipeline for a specific question.

```bash
npm run debug:query -- "what are the tasks i have to do about dad?"
```

What it checks:

- environment and active provider/model configuration
- query embedding generation
- raw `match_entries` RPC results
- local cosine similarity ranking from stored embeddings
- threshold filtering
- synthesis with the configured provider/model
- optional live `POST /api/query` comparison against your running app

Useful flags:

```bash
npm run debug:query -- "my question" --no-api
npm run debug:query -- "my question" --api-url http://localhost:3000/api/query
npm run debug:query -- "my question" --match-count 10 --min-similarity 0.15
```

## Project Structure

```text
app/
  api/
    entries/route.ts        # GET and POST entries
    entries/[id]/route.ts   # DELETE entry
    chats/route.ts          # GET persisted chat threads + turns
    query/route.ts          # semantic query + synthesis + chat persistence
  globals.css
  layout.tsx
  page.tsx
components/
  EngramApp.tsx
  CapturePanel.tsx
  QueryPanel.tsx
  EntryCard.tsx
  AnswerCard.tsx
  ui/
db/
  migrations/
    0001_extensions.sql
    0002_entries.sql
    0003_chat_tables.sql
    0004_chat_triggers.sql
    0005_match_entries.sql
    0006_auth_ownership.sql
  README.md
  schema.sql
docs/
  engram_prd.md
  engram_tech_spec.md
lib/
  embeddings.ts
  synthesis.ts
  prompts.ts
  chats.ts
  supabase.ts
  types.ts
  utils.ts
public/
  manifest.json
  icons/
decisions.md
```

## Product Notes

- The current UI is text-only.
- Authentication uses email/password login. Public sign-up is opt-in through `ALLOW_PUBLIC_SIGNUP=true`.
- Signup, memory creation, and query routes can be rate-limited through `public.consume_rate_limit` in `db/migrations/0007_rate_limits.sql`.
- Editing is intentionally not supported; entries are delete-and-recapture.
- The retrieval layer filters out weak matches below similarity `0.20`.
- The answer view shows source entries so the synthesized response stays inspectable.

## Related Docs

- Product requirements: [`docs/engram_prd.md`](/C:/Guna/Projects/engram/docs/engram_prd.md)
- Technical spec: [`docs/engram_tech_spec.md`](/C:/Guna/Projects/engram/docs/engram_tech_spec.md)
- Decisions log: [`decisions.md`](/C:/Guna/Projects/engram/decisions.md)

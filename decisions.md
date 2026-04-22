# Engram Decisions Log

## 2026-04-19

### 1. Server boundary for data access
- Options considered: browser talks directly to Supabase, or browser talks only to Next.js route handlers.
- Chosen: route handlers own all database access.
- Why: the spec is explicit about a single Next.js app with server-side logic in API routes, and this keeps the OpenAI key plus service-role key out of client code.

### 2. Supabase client split
- Options considered: only a service-role helper, or one shared helper that exposes both browser and server clients.
- Chosen: `lib/supabase.ts` exports both helpers, with the service-role path guarded for server use.
- Why: it matches the spec’s requested file layout and keeps the repo ready for later browser-side Supabase use without changing imports.

### 3. Query relevance gate
- Options considered: always send the top 5 neighbors to the LLM, or filter weak matches before synthesis.
- Chosen: filter matches below cosine similarity `0.20`.
- Why: the PRD requires a trustworthy no-match path. Passing obviously weak neighbors into the synthesis step would increase hallucinated or low-confidence answers.

### 4. Delete instead of edit
- Options considered: add edit plus re-embedding, or keep entries immutable and support delete only.
- Chosen: delete only.
- Why: this is explicitly aligned with the tech spec’s v1 decision and keeps the retrieval layer simple while still handling typos.

### 5. PWA integration on Next.js 16
- Options considered: skip `next-pwa`, or use `next-pwa` and adapt the production build.
- Chosen: keep `next-pwa` and switch the production build script to `next build --webpack`.
- Why: the spec requires `next-pwa`, but Next.js 16 defaults production builds to Turbopack and warns when a webpack-based plugin injects webpack config.

### 6. Manifest location
- Options considered: Next.js `app/manifest.ts`, or a static `public/manifest.json`.
- Chosen: `public/manifest.json`.
- Why: the technical spec explicitly calls for `manifest.json` in `public/`, and the root layout adds the corresponding manifest link and mobile meta tags manually.

### 7. shadcn/ui implementation style
- Options considered: run the shadcn CLI, or author the minimal shadcn-style primitives in-repo.
- Chosen: create local `components/ui/*` primitives.
- Why: it keeps the repo deterministic, matches the requested shadcn/ui structure closely enough for this MVP, and avoids bringing in unnecessary scaffolded surface area.

### 8. UUID generation in Postgres
- Options considered: assume `gen_random_uuid()` is already available, or enable the required extension in the schema.
- Chosen: enable `pgcrypto` in `db/schema.sql`.
- Why: without it, the default UUID expression is not guaranteed to exist in a fresh Supabase project.

### 9. Embedding provider abstraction
- Options considered: keep embeddings tied to OpenAI only, or add a provider abstraction with an env-based switch.
- Chosen: add an `EMBEDDING_PROVIDER` switch that supports Google embeddings (`text-embedding-004`, 768 dimensions) and OpenAI embeddings (`text-embedding-3-small`, 1536 dimensions).
- Why: Google provides a free embedding option while preserving the ability to switch back to OpenAI without refactoring call sites. The database vector dimension must match the active provider.

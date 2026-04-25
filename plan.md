# Mobile App Plan for Engram

## Goal

Turn Engram into a real mobile app while reusing as much of the current code and infrastructure as possible.

The best path is:

1. Keep the current Next.js app as the web app and backend host.
2. Add a native mobile client with Expo + React Native.
3. Reuse the existing Supabase project, database schema, auth, API contracts, embeddings flow, synthesis flow, and most TypeScript domain code.
4. Avoid trying to force the current DOM-heavy UI into native. Reuse logic and contracts first, not Tailwind/HTML components.

## Short answer on Vercel

Vercel is a strong fit for:

- the current Next.js web app
- the API/backend used by both web and mobile
- server-side auth helpers, embeddings, retrieval, and synthesis routes

Vercel is not the runtime that ships an iOS or Android app to users.

For a native app, deployment usually looks like:

- frontend app: Expo/EAS + Apple App Store + Google Play
- backend/API: Vercel
- database/auth/storage: Supabase

So the answer is: Vercel can support the app backend, but not distribute the native mobile binary itself.

## What can be reused immediately

These parts are already good shared assets:

- `app/api/chats/route.ts`
- `app/api/entries/route.ts`
- `app/api/entries/[id]/route.ts`
- `app/api/query/route.ts`
- `lib/chats.ts`
- `lib/types.ts`
- `lib/embeddings.ts`
- `lib/synthesis.ts`
- `lib/prompts.ts`
- `lib/rateLimit.ts`
- `lib/supabase.ts`
- existing Supabase schema and migrations in `db/`

These parts are reusable in concept but should be refactored before mobile:

- request/response parsing and API client helpers
- auth/session handling boundaries
- app state management now embedded in `components/EngramApp.tsx`

These parts should not be treated as reusable for native:

- `components/EngramApp.tsx`
- most `components/ui/*`
- Tailwind-based layout/styling
- Next-specific navigation and server actions

## Recommended architecture

### Option A: Recommended

Use a shared monorepo structure:

```text
apps/
  web/        # current Next.js app
  mobile/     # new Expo React Native app
packages/
  core/       # shared types, domain helpers, chat assembly, validation
  api-client/ # shared HTTP client for Engram backend
  config/     # shared TS config / lint config if needed
```

Why this is the right tradeoff:

- React knowledge transfers well to Expo
- backend stays mostly unchanged
- web remains deployable on Vercel
- native app gets proper mobile UX, offline hooks, notifications, and camera/mic options later
- shared packages let us reuse logic without fighting DOM-vs-native differences

### Option B: Lowest-effort stopgap

Improve the existing PWA and market it as "mobile-friendly".

Why not enough:

- no App Store / Play Store presence
- weaker native feel
- limited native capabilities
- still not a true mobile app

This is useful only as a transitional step, not the final mobile strategy.

## Refactor strategy for maximum reuse

### Phase 1: Stabilize backend as a product API

Keep Vercel + Next route handlers for now, but treat them as public app APIs for both clients.

Actions:

- keep `/api/entries`, `/api/chats`, `/api/query` as the primary backend surface
- document request and response shapes in one place
- move shared request/response types out of UI files into `packages/core`
- ensure routes return mobile-friendly errors consistently
- verify auth works with bearer-token or mobile-session compatible flows, not only browser cookies

Key constraint:

The current web app relies heavily on cookie-based Supabase SSR patterns. Mobile should not depend on browser cookies.

### Phase 2: Split shared logic out of `components/EngramApp.tsx`

`components/EngramApp.tsx` is currently doing too much:

- view logic
- async fetching
- mutation handling
- optimistic UI state
- chat state
- memory state
- DOM-only behaviors

Refactor into shared and platform-specific layers:

- shared: data types, API client, reducers/state transitions, pure helpers
- web-only: HTML, Tailwind classes, modal behavior, `window` access
- mobile-only: React Native screens, navigation, native inputs, sheets/modals

Target reusable modules:

- `packages/core/src/types.ts`
- `packages/core/src/chats.ts`
- `packages/core/src/entries.ts`
- `packages/api-client/src/index.ts`
- `packages/core/src/errors.ts`

### Phase 3: Add Expo mobile app

Create `apps/mobile` using Expo + TypeScript.

Initial screens:

- auth
- memories list
- add memory
- memory detail
- chat
- chat history

Use the current product flow as-is:

- list entries via `GET /api/entries`
- create entries via `POST /api/entries`
- delete entries via `DELETE /api/entries/:id`
- list chats via `GET /api/chats`
- ask questions via `POST /api/query`

Do not duplicate the retrieval or model pipeline in the mobile app.

### Phase 4: Mobile auth

Recommended approach:

- use Supabase Auth directly in the Expo app for sign-in/sign-up/session storage
- send the mobile access token to the backend
- update backend auth helpers to accept token-based auth for mobile requests

Two implementation paths:

1. Keep Next API on Vercel and add `Authorization: Bearer <token>` support.
2. Later, if needed, move backend logic into a framework-neutral API service.

Start with path 1. It preserves maximum reuse.

### Phase 5: Offline and native features

Only after the basic app works:

- local draft persistence
- cached memories/chat history
- push notifications for reminder-style features
- share extension / quick capture
- voice capture
- camera/image capture

These should be additive mobile features, not blockers for v1.

## Concrete repo changes

### Step 1

Reorganize into:

```text
apps/web
apps/mobile
packages/core
packages/api-client
```

Move the current web code into `apps/web` with minimal behavior changes.

### Step 2

Extract shared code from current locations:

- move `lib/types.ts` to `packages/core`
- move pure pieces of `lib/chats.ts` to `packages/core`
- add shared API DTOs for entries, chats, query, and auth

### Step 3

Create a shared API client:

- `getEntries()`
- `createEntry()`
- `deleteEntry()`
- `getChats()`
- `queryMemories()`

Web and mobile should both call the same client abstraction.

### Step 4

Refactor `components/EngramApp.tsx` into:

- web screen container(s)
- shared hooks or reducer logic
- API client calls through shared modules

### Step 5

Build `apps/mobile` screens against the shared client and shared types.

### Step 6

Adapt auth for native session tokens.

## Risks

### Biggest technical risk

Auth.

The current implementation is optimized for Next.js SSR + cookies. Native apps work better with token-based session handling. This is the one part that should be redesigned early.

### Second risk

Trying to share too much UI.

Sharing React DOM components with React Native usually creates awkward abstractions and slows everything down. Share business logic, not presentational code.

### Third risk

Keeping mobile tied to Next-only primitives.

Anything that depends on:

- `next/link`
- `next/navigation`
- server actions
- browser-only globals

should stay in web-only code.

## MVP definition for the native app

Version 1 should include only:

- login/sign-up
- capture memory
- list memories
- delete memory
- ask question
- view answer with sources
- view recent chat threads

That is enough to launch a credible native companion without expanding product scope.

## Suggested execution order

1. Extract shared types and pure helpers.
2. Add a shared API client package.
3. Refactor web app to consume the shared client.
4. Add bearer-token auth support in backend routes.
5. Scaffold Expo app.
6. Build auth, memories, and chat flows.
7. Test both clients against the same Vercel backend and Supabase project.
8. Ship web on Vercel, ship native through App Store / Play Store.

## Recommendation

Do not rewrite Engram into React Native from scratch.

Do this instead:

- keep the current Next.js app for web
- keep Vercel for backend hosting
- add Expo for iOS/Android
- refactor the repo so shared logic lives in packages
- redesign auth once so both web and mobile can use the same backend cleanly

That gives the highest code reuse with the lowest product risk.

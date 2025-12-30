# Pastebin Lite - Copilot Instructions

## Project Overview
Pastebin Lite is a minimal self-destructing text sharing service built with Next.js 16 + React 19, using Vercel KV for persistence. Users create temporary pastes with optional TTL (time-to-live) and view limits; pastes auto-expire or auto-delete based on these constraints.

## Architecture

### Core Data Flow
1. **Create**: `CreatePasteForm` (client) → `/api/pastes` (POST) → `createPaste()` generates nanoid(10) → stored in Vercel KV
2. **Retrieve**: `/p/[id]` page (SSR fetches without decrement) → `PasteView` (client) → calls `/api/pastes/[id]` (GET) to decrement views
3. **Expiry**: KV TTL handles auto-cleanup; view limits checked on client-side fetch via `PasteView` mount

### Key Files & Responsibilities
- **[lib/paste.ts](../lib/paste.ts)** - Core business logic: `createPaste()`, `fetchPaste()`, `validateCreatePasteRequest()` with validation rules
- **[lib/kv.ts](../lib/kv.ts)** - Vercel KV wrapper: `savePaste()`, `getPaste()`, `decrementViews()` with TTL management
- **[app/api/pastes/route.ts](../app/api/pastes/route.ts)** - POST endpoint for creation
- **[app/api/pastes/[id]/route.ts](../app/api/pastes/[id]/route.ts)** - GET endpoint for retrieval (check routes file for implementation)
- **[types/paste.ts](../types/paste.ts)** - TypeScript interfaces for Paste, CreatePasteRequest, responses

### Data Model
```typescript
StoredPaste {
  content: string;
  createdAt: number;        // milliseconds since epoch
  expiresAt: number | null; // expiry timestamp or null for no expiry
  maxViews: number | null;  // original limit or null for unlimited
  remainingViews: number | null; // tracks current view count
}
```

## Critical Patterns

### Timestamp & Testing
- All timestamps are milliseconds since epoch (JavaScript Date.now())
- [lib/time.ts](../lib/time.ts) provides `getCurrentTime(headers?)` which supports **TEST_MODE**:
  - When `TEST_MODE=1`, passes `x-test-now-ms` header with millisecond value to override Date.now()
  - Used for deterministic testing of expiry/TTL logic
- Always use `getCurrentTime()` instead of `Date.now()` in business logic

### Validation Pattern
- **All API inputs validated before processing** via `validateCreatePasteRequest()`
- Returns `{ valid: boolean, error?: string, request?: CreatePasteRequest }`
- `content` must be non-empty string; `ttl_seconds` and `max_views` must be positive integers
- API endpoints return 400 with error message on validation failure

### TTL Management in Vercel KV
- **On Create**: TTL calculated as `(expiresAt - createdAt) / 1000` seconds, set via `{ ex: ttlSeconds }`
- **On Update** (view decrement): TTL recalculated from current time to expiresAt to preserve expiry
- **Auto-deletion**: When `remainingViews` reaches 0, paste is deleted; `decrementViews()` returns -1 sentinel
- **Expired Check**: `isExpired(expiresAt, currentTime)` returns true if `currentTime >= expiresAt`

### Client-Side Conventions
- **'use client'** directive on interactive components ([CreatePasteForm.tsx](../components/CreatePasteForm.tsx), [PasteView.tsx](../components/PasteView.tsx))
- Form state managed with `useState` hooks; no external state library
- API requests use native `fetch()` with error handling for network/validation failures
- URL generation uses `NEXT_PUBLIC_BASE_URL` env var (defaults to localhost:3000)
- **View decrement pattern**: `PasteView` calls GET `/api/pastes/[id]` on mount to decrement views (after SSR hydration complete)

### Response Formats
- **Create Response* (from `/api/pastes/[id]`): `{ content: string; remaining_views: number | null; expires_at: string | null }`
  - Note: API returns snake_case keys (`remaining_views`, `expires_at`) despite internal camelCase
  - **Important**: GET endpoint decrements views; call only when user actually views the paste
  - **SSR vs Client**: Page renders SSR without decrement; `PasteView` client component calls GET on mount to record the viewl }`
  - Note: API returns snake_case keys (`remaining_views`, `expires_at`) despite internal camelCase

## Development Workflow

### Commands
- `npm run dev` - Start Next.js dev server (port 3000)
- `npm run build` - Production build
- `npm start` - Run production server
- `npm run lint` - Run ESLint

### Testing Pattern
Set `TEST_MODE=1` and pass `x-test-now-ms` header to control time:
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -H "x-test-now-ms: 1000000" \
  -d '{"content":"test","ttl_seconds":10}'
```

### Styling
- **Tailwind CSS 4** with `@tailwindcss/postcss` (check [postcss.config.mjs](../postcss.config.mjs))
- Responsive grid layout: `grid grid-cols-2 gap-4` on forms
- Accessibility: proper `label` + input associations, focus rings

## Common Tasks

### Adding Paste Constraints
1. Extend `CreatePasteRequest` in [types/paste.ts](../types/paste.ts)
2. Update `validateCreatePasteRequest()` in [lib/paste.ts](../lib/paste.ts) with new validation rules
3. Update `StoredPaste` interface in [lib/kv.ts](../lib/kv.ts) if storing new constraint
4. Check/enforce in `fetchPaste()` before returning

### Fixing Expiry Logic
- **Check [lib/paste.ts](../lib/paste.ts)**: `fetchPaste()` calls `isExpired()` before returning
- **Check [lib/kv.ts](../lib/kv.ts)**: TTL preservation in `decrementViews()` uses `Math.ceil((expiresAt - Date.now()) / 1000)`
- **Ensure** `getCurrentTime()` used consistently; don't mix `Date.now()` in business logic

### API Response Serialization
- Backend stores camelCase in KV; API transforms to snake_case for client (see [app/api/pastes/[id]/route.ts](../app/api/pastes/[id]/route.ts) for pattern)
- Always validate before transforming to prevent type errors

## Dependencies
- **@vercel/kv**: Serverless Redis; KV operations atomic at key-level only
- **nanoid**: Generates 10-char paste IDs (default alphabet)
- **next/navigation**: `notFound()` used in [app/p/[id]/page.tsx](../app/p/[id]/page.tsx) for 404 handling
- **Tailwind CSS 4**: Utility-first styling via PostCSS
Hydration mismatch**: Date formatting must be consistent between server/client (use `toISOString()` format, not `toLocaleString()`)
2. **Race conditions**: If paste expires between fetch and decrement, `decrementViews()` returns -1; handle gracefully
3. **Timestamp precision**: TTL rounded up with `Math.ceil()` to avoid premature expiry
4. **Unlimited constraints**: `null` values indicate unlimited TTL/views; all comparisons check for null first
5. **Form reset**: After successful creation, form fields cleared; URL shown to user for sharing
6. **View decrement timing**: SSR page doesn't decrement to avoid double-counting on refresh; only client-side GET decrements
3. **Unlimited constraints**: `null` values indicate unlimited TTL/views; all comparisons check for null first
4. **Form reset**: After successful creation, form fields cleared; URL shown to user for sharing

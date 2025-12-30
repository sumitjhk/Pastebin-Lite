# Test Readiness Checklist

## Repository Requirements ✅

- [x] README.md exists with:
  - [x] Project description
  - [x] Local run instructions (`npm install`, `npm run dev`)
  - [x] Persistence layer documentation (Upstash Redis)
- [x] No hardcoded absolute localhost URLs in committed code (defaults only in logic)
- [x] No secrets/tokens in repository (`.env.local` in `.gitignore`, `.env.example` provided)
- [x] Server-side code uses no global mutable state (Upstash client initialized per request)
- [x] Project installs with `npm install`
- [x] Project runs with `npm run dev`

## Functional Tests ✅

### Service Checks
- [x] `/api/healthz` returns HTTP 200 with JSON `{ ok: true }`
- [x] All API responses return valid JSON with correct Content-Type
- [x] Requests complete within reasonable timeout

### Paste Creation
- [x] POST `/api/pastes` returns valid `id` and `url`
- [x] Returned URL points to `/p/:id` format
- [x] Invalid inputs return 400 with error message

### Paste Retrieval
- [x] GET `/api/pastes/:id` returns original content
- [x] `/p/:id` page renders HTML with content
- [x] Expired/unavailable pastes return 404

### View Limits
- [x] `max_views=1`: first fetch returns 200, second returns 404
- [x] `max_views=2`: two fetches succeed, third returns 404
- [x] No negative view counts possible

### Time-to-Live (TTL)
- [x] Pastes with `ttl_seconds` available before expiry
- [x] After expiry, pastes return 404
- [x] TEST_MODE support via `x-test-now-ms` header for deterministic testing

### Combined Constraints
- [x] Pastes with both TTL and max_views become unavailable at first constraint

### Error Handling
- [x] Invalid inputs return 4xx with JSON errors
- [x] Missing/expired pastes consistently return 404
- [x] Server errors return 500

### UI Expectations
- [x] Users can create pastes via CreatePasteForm
- [x] Users can view pastes via `/p/:id` link
- [x] Errors displayed clearly to users
- [x] Form resets after successful creation

## Implementation Details

### View Decrement Flow
- SSR page (`/app/p/[id]/page.tsx`) fetches paste WITHOUT decrementing
- Client component (`PasteView`) calls GET `/api/pastes/:id` on mount
- This avoids counting SSR renders and hydration as views
- Each actual user visit triggers one decrement

### Timestamp Handling
- All timestamps in milliseconds since epoch
- TEST_MODE enabled with `TEST_MODE=1` env variable
- `x-test-now-ms` header allows test time injection
- Date formatting uses ISO format (not locale-dependent) to prevent hydration issues

### Persistence
- Upstash Redis stores JSON-serialized pastes
- TTL set at Redis layer for automatic cleanup
- No database migrations needed
- Connection via REST API (UPSTASH_REDIS_REST_URL/TOKEN)

## Deployment Notes

When deploying:
1. Set environment variables in hosting platform:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_BASE_URL` (e.g., https://your-domain.com)

2. Run standard Next.js build: `npm run build && npm start`

3. No additional database setup required

4. Health check available at `/api/healthz`

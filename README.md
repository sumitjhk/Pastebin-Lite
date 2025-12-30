# Pastebin Lite

A minimal self-destructing text sharing service built with Next.js 16 and React 19. Create temporary pastes with optional time-to-live (TTL) and view limits.

## 🚀 Live Demo

Deployed at: https://your-app.vercel.app (Replace with your actual Vercel URL after deployment)

## Features

- **Create pastes** with optional expiration (TTL in seconds)
- **View limits** - automatically delete after N views
- **Combined constraints** - pastes expire when first constraint triggers
- **Quick access** - Share short IDs like `/p/abc123`
- **REST API** for programmatic access
- **Health check** endpoint for monitoring

## Persistence Layer

This project uses **Upstash Redis** for persistence:
- Serverless Redis instance managed by Upstash
- TTL is enforced at the Redis layer for automatic cleanup
- View limits tracked in JSON stored in Redis
- No database migrations required
- Survives across serverless function invocations
- Environment variables for configuration (see `.env.example`)

## Why Upstash?

- Built-in TTL support for automatic expiration
- Serverless-friendly with HTTP-based REST API
- Free tier available for development and testing
- Atomic operations for view counting to prevent race conditions

## Getting Started

### Prerequisites

- Node.js 18+
- npm (or yarn/pnpm/bun)
- Upstash Redis instance (free tier available at https://upstash.com)

### Quick Start

```bash
# Clone and install
git clone <repository-url>
cd pastebin-lite
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Upstash credentials

# Run development server
npm run dev
```

Open http://localhost:3000 in your browser

### Local Development

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd pastebin-lite
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env.local`
   - Add your Upstash Redis credentials:
     ```
     UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
     UPSTASH_REDIS_REST_TOKEN=your_token_here
     TEST_MODE=0
     ```
   - Get credentials from [Upstash Console](https://console.upstash.com)

3. **Run development server:**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:3000 in your browser

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check

**GET** `/api/healthz`

Checks if the application can access its persistence layer.

Response (200):
```json
{
  "ok": true
}
```

### Create Paste

**POST** `/api/pastes`

Request parameters:
- `content` (required): The text content of the paste
- `ttl_seconds` (optional): Time-to-live in seconds, integer ≥ 1
- `max_views` (optional): Maximum number of views allowed, integer ≥ 1

Example request:
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your text here",
    "ttl_seconds": 3600,
    "max_views": 5
  }'
```

Success Response (201):
```json
{
  "id": "abc123def45",
  "url": "http://localhost:3000/p/abc123def45"
}
```

Error Response (400):
```json
{
  "error": "content is required and must be a non-empty string"
}
```

### Get Paste (API)

**GET** `/api/pastes/:id`

Retrieves paste content and metadata. Each successful fetch counts as a view.

Success Response (200):
```json
{
  "content": "Your text here",
  "remaining_views": 4,
  "expires_at": "2025-12-31T10:30:00.000Z"
}
```

Notes:
- `remaining_views` is `null` if unlimited
- `expires_at` is `null` if no TTL
- Each successful API fetch decrements the view count

Error Response (404):
```json
{
  "error": "Paste not found"
}
```

Unavailable cases (all return 404):
- Paste doesn't exist
- Paste has expired
- View limit exceeded

### View Paste (HTML)

**GET** `/p/:id`

Returns HTML page containing the paste content.

- Success: 200 with HTML
- Not found/expired: 404 with error page
- Content is rendered safely (no script execution)

## Testing with Deterministic Time (TEST_MODE)

For testing time-based expiration, set `TEST_MODE=1` in `.env.local` and use the `x-test-now-ms` header:

```bash
# Set TEST_MODE in .env.local
TEST_MODE=1

# Start the server
npm run dev

# Create a paste with 10 second TTL at time=1000000
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -H "x-test-now-ms: 1000000" \
  -d '{"content":"test","ttl_seconds":10}'

# Response: {"id":"xyz123","url":"..."}

# Fetch before expiry (time=1005000, 5 seconds later)
curl -H "x-test-now-ms: 1005000" \
  http://localhost:3000/api/pastes/xyz123
# Returns: 200 with paste content

# Fetch after expiry (time=1015000, 15 seconds later)
curl -H "x-test-now-ms: 1015000" \
  http://localhost:3000/api/pastes/xyz123
# Returns: 404 (expired)
```

How it works:
- When `TEST_MODE=1`, the `x-test-now-ms` header overrides system time
- Only affects expiry logic (not actual Redis TTL in production)
- If header is absent, falls back to real system time

## Project Structure

```
pastebin-lite/
├── app/
│   ├── api/
│   │   ├── healthz/
│   │   │   └── route.ts      # Health check endpoint
│   │   └── pastes/
│   │       ├── route.ts       # POST /api/pastes
│   │       └── [id]/
│   │           └── route.ts   # GET /api/pastes/:id
│   ├── p/
│   │   └── [id]/
│   │       └── page.tsx       # GET /p/:id (HTML view)
│   ├── page.tsx               # Homepage with form
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/
│   ├── CreatePasteForm.tsx    # Form to create pastes
│   └── PasteView.tsx          # Display paste content
├── lib/
│   ├── paste.ts               # Business logic (validation, create, fetch)
│   ├── redis.ts               # Redis/Upstash client wrapper
│   └── time.ts                # Timestamp helpers with TEST_MODE support
├── types/
│   └── paste.ts               # TypeScript interfaces
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## Design Decisions

### ID Generation

- Using `nanoid` for short, URL-safe IDs (11 characters)
- Collision probability is negligible for this scale
- IDs are case-sensitive for maximum entropy

### View Counting

- View decrement happens on API GET requests to `/api/pastes/:id`
- Uses atomic operations in Redis to prevent race conditions
- HTML page views (`/p/:id`) trigger an API call from client-side
- Prevents double-counting from SSR + client-side hydration

### Expiry Handling

- TTL enforced at Redis layer for automatic cleanup
- Application-level checks ensure expired pastes return 404
- Combined constraints: paste expires when first constraint triggers
- No negative remaining_views due to atomic decrement operations

### Error Handling

- All unavailable states (expired, view-limited, not-found) return 404
- Invalid inputs return 400 with descriptive error messages
- API always returns JSON with appropriate Content-Type
- HTML views show user-friendly error pages

### Security

- Paste content is HTML-escaped to prevent XSS
- No executable scripts allowed in paste content
- Rate limiting can be added via Upstash Redis built-in features

## Environment Variables

Create a `.env.local` file with:

```bash
# Upstash Redis credentials (required)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Test mode for deterministic time testing (optional)
TEST_MODE=0

# Auto-populated by Vercel (optional, for absolute URLs)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy!

Vercel will auto-detect Next.js and configure build settings.

### Manual Deployment

```bash
npm run build
npm start
```

Ensure environment variables are set in your hosting platform.

## Technologies

- **Next.js 16** - React framework with App Router, API routes, and SSR
- **React 19** - UI components with hooks
- **Tailwind CSS 4** - Utility-first styling
- **Upstash Redis** - Serverless persistence with HTTP REST API
- **nanoid** - Short, URL-safe ID generation
- **TypeScript** - Type safety and better DX

## Testing

The application is designed to pass automated tests that check:

- ✅ Health check returns 200 with valid JSON
- ✅ All API responses return valid JSON with correct Content-Type
- ✅ Paste creation returns valid id and url
- ✅ Paste retrieval returns original content
- ✅ View limits work correctly (1 view, 2 views, etc.)
- ✅ TTL expiration using `x-test-now-ms` header
- ✅ Combined constraints (TTL + max_views)
- ✅ Invalid inputs return 4xx with JSON errors
- ✅ No negative remaining_views
- ✅ Concurrent request handling

## Notes

- All timestamps are in **milliseconds since epoch** (JavaScript `Date.now()`)
- Pastes are stored as JSON in Redis with automatic TTL cleanup
- View decrement is atomic to handle concurrent requests safely
- Invalid inputs return appropriate 4xx responses with descriptive error messages
- Expired or view-limited pastes consistently return 404

## License

MIT

## Support

For issues or questions, please open an issue in the GitHub repository.

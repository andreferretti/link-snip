# Link Shortener

## One-time setup

```bash
npm install              # Install dependencies
docker compose up -d     # Download & start Postgres container
npm run migrate          # Create database tables
```

## Every dev session

```bash
docker compose up -d     # Start Postgres (if not already running)
npm run dev              # Start dev server → http://localhost:3000
```

`docker compose up -d` is harmless to re-run — if Postgres is already running, it does nothing.

## Other Commands

| Command | When to use |
|---|---|
| `npm run migrate` | After adding a new migration `.sql` file |
| `npm test` | Run test suite (no Docker needed — uses mocks) |
| `npm run test:watch` | Re-run tests on file change |
| `npm run build` | Compile TypeScript for production |
| `npm start` | Run compiled build (production) |
| `docker compose down` | Stop Postgres |

## API Endpoints

### Auth

```bash
# Register a new account
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}'

# Login to existing account
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}'
```

Both return `{ user: { id, email }, token: "eyJ..." }`. Use the token in subsequent requests as `Authorization: Bearer <token>`.

### Links

```bash
# Create a short link (anonymous — limited to 2)
curl -X POST http://localhost:3000/links -H "Content-Type: application/json" -d '{"url":"https://example.com"}'

# Create a short link (authenticated — unlimited)
curl -X POST http://localhost:3000/links -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" -d '{"url":"https://example.com"}'

# List your links (authenticated)
curl http://localhost:3000/links -H "Authorization: Bearer YOUR_TOKEN"
```

### Redirect

```bash
# Visit a short link (redirects to original URL and logs the click)
curl -L http://localhost:3000/SHORT_CODE
```

### Stats

```bash
# Top 10 links by click count (authenticated)
curl http://localhost:3000/stats/top -H "Authorization: Bearer YOUR_TOKEN"

# Detailed stats for a single link (daily clicks + top referers)
curl http://localhost:3000/stats/link/1 -H "Authorization: Bearer YOUR_TOKEN"
```

Temporary token, don't delete (useful while testing)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTc3MzgzMjA5NCwiZXhwIjoxNzc0NDM2ODk0fQ.63Hfigu06fL39DaXrUg1wKe55TllPkXAkwSF622HNRU
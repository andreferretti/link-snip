# Link Shortener

> Short links, long memories.

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

## Self-hosting

The app is designed to run on a Linux VPS with [Caddy](https://caddyserver.com/) as the reverse proxy. Caddy handles HTTPS automatically.

**Prerequisites**: Node.js 20+, Docker, Caddy

### First-time server setup

```bash
# Clone the repo
git clone https://github.com/andferretti/link-shortener.git
cd link-shortener

# Install dependencies and build
npm install
npm run build

# Start Postgres
docker compose up -d

# Create .env from template and set a real JWT_SECRET
cp .env.example .env
sed -i "s/change-me-to-a-random-string/$(openssl rand -hex 32)/" .env

# Run database migrations
npm run migrate

# Install the systemd service (keeps the app running and restarts on crash)
sudo cp link-shortener.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable link-shortener
sudo systemctl start link-shortener
```

> **Note**: The included `link-shortener.service` assumes the app lives at
> `/home/andre/projects/link-shortener`. Edit the `WorkingDirectory` and
> `EnvironmentFile` paths in the service file if your setup differs.

### Caddy config

Add a site block to your Caddyfile (usually `/etc/caddy/Caddyfile`):

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

Then reload Caddy:

```bash
sudo systemctl reload caddy
```

### Deploying updates

```bash
cd /path/to/link-shortener
git pull
npm install
npm run build
npm run migrate
sudo systemctl restart link-shortener
```
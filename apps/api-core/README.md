# Backend API

Backend API server for real estate platform built with TypeScript, Express, and MongoDB.

## Features

- **Authentication**: JWT-based authentication with OAuth support (Google, Facebook, LinkedIn)
- **Property Management**: Full CRUD operations for properties with search and filtering
- **Notifications**: In-app and push notifications via FCM
- **Analytics**: Event tracking and analytics
- **File Upload**: Image uploads via Cloudinary
- **Geocoding**: Address to coordinates conversion via Google Maps
- **Background Jobs**: Email queue, cleanup tasks, analytics processing
- **Caching**: Redis-based caching
- **Security**: Rate limiting, input sanitization, CSRF protection, compression

## Prerequisites

- Node.js 20+
- pnpm 8+ (recommended) or npm
- MongoDB
- Redis (optional, for caching and job queues)
- Cloudinary account (optional, for image uploads)
- Firebase account (optional, for push notifications)
- Google Maps API key (optional, for geocoding)

## Installation

1. Clone the repository

2. Install pnpm (if not already installed):
   ```bash
   npm install -g pnpm
   # Or using corepack (Node.js 16.10+)
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment variables:
   ```bash
   cp env.example .env
   ```

   Configure all required environment variables in `.env` file. See `env.example` for all available options.

4. Configure environment variables in `.env`:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/everbloom

   # Redis
   REDIS_URL=redis://localhost:6379

   # JWT
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret-key

   # OAuth (optional)
   OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
   OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Cloudinary (optional)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Firebase (optional)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email

   # Google Maps (optional)
   GOOGLE_MAPS_API_KEY=your-api-key
   ```

## Development

### Using pnpm (Recommended)

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Run tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm type-check

# Kill processes on dev ports (if needed)
pnpm kill-ports
```

### Using Turbo for Caching

This project uses [Turbo](https://turbo.build/) for intelligent task caching and faster builds. You can use turbo directly for better performance:

```bash
# Run tasks with turbo caching
turbo run build    # Cached build (faster on subsequent runs)
turbo run test     # Cached test runs
turbo run lint     # Cached linting
turbo run type-check  # Cached type checking

# Run multiple tasks in parallel
turbo run build test lint

# Clear turbo cache
turbo run build --force
```

**Benefits of Turbo:**
- Intelligent caching: Skips tasks when inputs haven't changed
- Parallel execution: Runs independent tasks simultaneously
- Faster CI/CD: Reduces build times in pipelines
- Remote caching: Share cache across team members (when configured)

### Package Manager

This project uses **pnpm** as the package manager. The configuration is in `.npmrc` and `pnpm-workspace.yaml`.

**Why pnpm?**
- Faster installs with content-addressable storage
- Disk space efficient (shared dependencies)
- Strict dependency resolution
- Better monorepo support

## API Documentation

See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for detailed API documentation.

## Architecture

See [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) for architecture details.

## Containerization

### Docker Compose (Development)

For local development, use Docker Compose to run MongoDB and Redis services.

#### Prerequisites

- Docker Desktop installed and running
- Verify installation:
  ```bash
  docker --version
  docker info
  ```

#### Start Development Services

```bash
# Start MongoDB and Redis
docker-compose -f docker-compose.dev.yaml up -d

# Or use the helper script
./scripts/docker-dev.sh up
```

#### View Logs

```bash
# View all logs
docker-compose -f docker-compose.dev.yaml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yaml logs -f redis
docker-compose -f docker-compose.dev.yaml logs -f mongo

# Or use the helper script
./scripts/docker-dev.sh logs
./scripts/docker-dev.sh logs redis
```

#### Check Status

```bash
# Check service status
docker-compose -f docker-compose.dev.yaml ps

# Or use the helper script
./scripts/docker-dev.sh status
```

#### Stop Services

```bash
# Stop services (keeps containers)
docker-compose -f docker-compose.dev.yaml stop

# Stop and remove containers (keeps volumes)
docker-compose -f docker-compose.dev.yaml down

# Stop and remove everything including volumes
docker-compose -f docker-compose.dev.yaml down -v

# Or use the helper script
./scripts/docker-dev.sh down
```

#### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.dev.yaml restart

# Restart specific service
docker-compose -f docker-compose.dev.yaml restart redis

# Or use the helper script
./scripts/docker-dev.sh restart
./scripts/docker-dev.sh restart mongo
```

#### Environment Variables

Configure your `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/everbloom

# Redis
REDIS_URL=redis://localhost:6379
```

#### Services

- **MongoDB**: Available at `localhost:27017`
  - Database: `everbloom` (matches docker-compose.dev.yaml MONGO_INITDB_DATABASE)
  - Data persisted in `mongo-dev-data` volume

- **Redis**: Available at `localhost:6379`
  - AOF persistence enabled
  - Data persisted in `redis-dev-data` volume

#### Helper Script

The `scripts/docker-dev.sh` script provides convenient commands:

```bash
./scripts/docker-dev.sh up        # Start all services
./scripts/docker-dev.sh down      # Stop all services
./scripts/docker-dev.sh logs      # View all logs
./scripts/docker-dev.sh logs redis # View Redis logs
./scripts/docker-dev.sh status    # Check status
./scripts/docker-dev.sh restart   # Restart all services
```

### Podman (Recommended)

Podman is a daemonless, rootless container engine that is Docker-compatible.

#### Install Podman

```bash
# Ubuntu/Debian
sudo apt-get install -y podman

# RHEL/CentOS/Fedora
sudo dnf install -y podman

# macOS
brew install podman

# Verify installation
podman --version
```

#### Start Redis with Podman

```bash
# Use the management script
./scripts/podman-redis.sh start

# Or manually (use fully qualified image name)
podman pull docker.io/library/redis:7-alpine
podman run -d \
  --name back-end-redis \
  -p 6379:6379 \
  -v back-end-redis-data:/data \
  --restart unless-stopped \
  docker.io/library/redis:7-alpine \
  redis-server --appendonly yes
```

#### Build and Run Application

```bash
# Build image
podman build -t back-end .

# Run container
podman run -p 3000:3000 --env-file .env back-end
```

#### Podman Compose

```bash
# Install podman-compose
pip3 install podman-compose

# Start services
podman-compose -f podman-compose.yml up -d

# Or use podman play kube
podman play kube redis.podman.yml
```

#### Redis Management

```bash
# Start Redis
./scripts/podman-redis.sh start

# Check status
./scripts/podman-redis.sh status

# View logs
./scripts/podman-redis.sh logs -f

# Stop Redis
./scripts/podman-redis.sh stop

# Access Redis CLI
./scripts/podman-redis.sh exec redis-cli
```

For complete Podman documentation, see [docs/PODMAN_GUIDE.md](docs/PODMAN_GUIDE.md).

### Docker (Alternative)

#### Build Docker image

```bash
docker build -t back-end .
```

#### Run with Docker

```bash
docker run -p 3000:3000 --env-file .env back-end
```

#### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/everbloom
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"

  redis:
    image: redis:latest
    ports:
      - "6379:6379"
```

See [docs/PODMAN_MIGRATION_PLAN.md](docs/PODMAN_MIGRATION_PLAN.md) for migration guide from Docker to Podman.

## Scripts

- `pnpm seed` or `npm run seed`: Seed database with sample data
- `pnpm migrate` or `npm run migrate`: Run database migrations
- `pnpm create-admin` or `npm run create-admin`: Create admin user
- `pnpm manage-users` or `npm run manage-users`: Manage user accounts
- `pnpm kill-ports` or `npm run kill-ports`: Kill processes on dev ports (8080)

## Testing

```bash
# Run all tests
pnpm test
# Or: npm test
```

## Deployment

### Railway Deployment

The backend is configured to work seamlessly with Railway's dynamic port assignment.

#### Port Configuration (Automatic)

**Railway automatically handles port configuration:**
- Railway sets the `PORT` environment variable at runtime
- The application automatically reads `PORT` and binds to `0.0.0.0`
- No manual port configuration is needed

**Port Resolution Priority:**
1. `PORT` (Railway sets this automatically) - Highest priority
2. `BACKEND_PORT` (Manual override, if set)
3. Default: `8080` (Development fallback)

**Host Configuration:**
- Automatically binds to `0.0.0.0` when `PORT` or Railway env vars are present
- Uses `localhost` for local development (when `PORT` is not set)

#### Railway Setup

1. **Deploy to Railway:**
   - Railway will automatically detect `railway.json` configuration
   - Uses Dockerfile from root directory (`Dockerfile`)
   - No additional port configuration needed

2. **Environment Variables:**
   - Set required variables in Railway dashboard:
     - `MONGODB_URI` (required)
     - `JWT_SECRET` (required)
     - `JWT_REFRESH_SECRET` (required)
     - `REDIS_URL` (optional)
     - `ADMIN_PANEL_URL` (required for CORS - your admin panel production URL)
     - `BACKEND_CORS_ORIGIN` (optional - comma-separated list of allowed origins)
     - Other service credentials as needed

3. **Health Checks:**
   - Railway uses `/health` endpoint for health checks
   - Automatically configured in Dockerfile

**Important Notes:**
- Do NOT manually set `PORT` in Railway - Railway provides it automatically
- The application code handles Railway's dynamic port assignment
- Server automatically binds to `0.0.0.0` when deployed to Railway
- For local development, use `BACKEND_PORT` if you need a specific port
- Environment variables should be set in Railway dashboard, not in `.env` files (which are gitignored)

## License

ISC


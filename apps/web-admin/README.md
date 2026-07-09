# Web Admin

Modern admin dashboard for Everbloom platform management.

## Tech Stack

- React 18
- Vite
- TailwindCSS
- React Router
- Axios
- Socket.io Client
- Firebase (optional)
- Chart.js

## Prerequisites

- Node.js 20+
- pnpm 9+ (recommended) or npm
- Backend API server running (for local development)

**Note**: This project uses [Turbo](https://turbo.build) for build orchestration and caching.

## Getting Started

### Installation

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure environment variables in `.env`:
   - **Development**: Set `VITE_BACKEND_PORT=8080` to match backend default port
   - **Production**: Set `VITE_API_BASE_URL` or `VITE_BACKEND_URL` to your backend production URL
   - See `.env.example` for all available options

### Development

```bash
# Start development server
pnpm dev
# Or: npm run dev

# The dev server will run on http://localhost:3001 (or VITE_DEV_PORT env var)
# Vite proxy automatically routes /api requests to backend
```

**Important**: Make sure your backend is running on port 8080 (default) or update `VITE_BACKEND_PORT` in `.env`.

### Docker

One Compose Application (mongo + redis only). Run web-admin locally with `pnpm dev`. From repo root: `docker compose -f docker-compose.dev.yaml up -d`, or from this app: `./scripts/docker-dev.sh up` (starts mongo + redis from root compose).

### Production Build

```bash
# Build for production
pnpm build
# Or: npm run build

# Preview production build locally
pnpm preview
# Or: npm run preview
```

### Testing

```bash
# Run tests
pnpm test
# Or: npm test

# Run tests with coverage
pnpm test:coverage
# Or: npm run test:coverage
```

### Linting

```bash
# Run linter
pnpm lint
# Or: npm run lint

# Fix linting issues
pnpm lint:fix
# Or: npm run lint:fix
```

## Features

- User authentication
- Dashboard analytics
- User management
- Inquiry tracking
- Real-time notifications (Socket.io)
- Push notifications (Firebase - optional)
- Theme switching
- PWA support

## Environment Variables

### Required for Production

- `VITE_API_BASE_URL` or `VITE_BACKEND_URL` - Backend API URL (full URL required in production)
- `VITE_SOCKET_URL` - WebSocket URL for real-time updates (optional, defaults to backend URL)

### Optional

- `VITE_FIREBASE_*` - Firebase configuration for push notifications
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Application version

See `.env.example` for complete list of environment variables.

## Deployment

The admin panel can be deployed to various platforms. See deployment guides for detailed instructions:

- **[Vercel Deployment Guide](docs/DEPLOYMENT_VERCEL.md)** - Deploy to Vercel (recommended for static hosting)

### Quick Deployment Notes

**Required Environment Variables:**
- `VITE_API_BASE_URL` - Full URL to your backend API (e.g., `https://your-backend.example.com/api/v1`)
- `VITE_SOCKET_URL` - WebSocket URL (optional, defaults to backend URL)

**Important:**
- Environment variables must be set before building
- Use full URLs (not relative) for production deployments
- See platform-specific guides for detailed setup instructions

## Development Notes

- **Backend URL**: In development, Vite proxy automatically routes `/api` requests to backend
- **Port**: Default dev port is 4000, backend should run on 8080
- **CORS**: Handled automatically by Vite proxy in development
- **Hot Reload**: Enabled by default in development mode

## License

MIT

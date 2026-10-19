# ReportFlow

![ReportFlow](./architecture.png)

ReportFlow is an asynchronous PDF report generation system built with a modern microservices architecture. It processes data-intensive report generation tasks in the background using a job queue, ensuring responsive user experience even with large datasets.

## Features

- **Asynchronous Processing**: Background job queue powered by BullMQ and Redis for non-blocking report generation
- **Real-time Preview**: Interactive dashboard with live data visualization before PDF generation
- **Multiple Report Types**: Support for Sales Summary and Order Analytics reports
- **Idempotent Operations**: Built-in idempotency checks to prevent duplicate processing
- **Reliable Storage**: Local file storage with orphaned file cleanup on failure
- **Scheduled Reports**: Cron-based daily report generation
- **Type-Safe**: Full TypeScript implementation with Prisma ORM
- **Modern UI**: Next.js dashboard with shadcn/ui components

## Architecture

ReportFlow consists of four main services:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Web UI    │─────>│   API       │─────>│   Redis     │─────>│   Worker    │
│  (Next.js)  │      │ (Express)   │      │  (Queue)    │      │ (Processor) │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
                           │                                           │
                           ▼                                           ▼
                    ┌─────────────┐                           ┌─────────────┐
                    │   SQLite    │                           │   Local     │
                    │  Database   │                           │   Storage   │
                    └─────────────┘                           └─────────────┘
```

### Components

- **Web UI**: Next.js application for report management and preview
- **API**: Express.js REST API for report creation and retrieval
- **Worker**: Background processor for PDF generation using Playwright
- **Database**: SQLite with Prisma ORM for data persistence
- **Queue**: Redis-backed BullMQ for job scheduling and management

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for Redis)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nareshchandu17/report-flow.git
   cd report-flow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Redis:
   ```bash
   docker-compose up -d
   ```

4. Set up the database:
   ```bash
   npm run build --workspace=packages/database
   npm run db:seed --workspace=packages/database
   ```

5. Start the application:
   ```bash
   npm run dev
   ```

The application will be available at:
- Web Dashboard: http://localhost:3000
- API: http://localhost:4000

## Environment Variables

### Web Application

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL of the API | `http://localhost:4000/api` |

### Worker

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://127.0.0.1:6390` |

## Usage

### Creating a Report

1. Navigate to the web dashboard
2. Select report type and date range
3. Click "Generate PDF Report"
4. Monitor progress in real-time
5. Download the completed PDF

### API Endpoints

#### Create Report
```http
POST /api/reports
Content-Type: application/json
Idempotency-Key: <unique-key>

{
  "reportType": "SALES_SUMMARY",
  "fromDate": "2026-01-01",
  "toDate": "2026-01-31"
}
```

#### Get Report Status
```http
GET /api/reports/:id
```

#### Download Report
```http
GET /api/reports/:id/download
```

## Development

### Project Structure

```
report-flow/
├── apps/
│   ├── api/          # Express API server
│   ├── web/          # Next.js web application
│   └── worker/       # Background worker
├── packages/
│   ├── database/     # Prisma schema and utilities
│   └── shared/       # Shared types and constants
└── docker-compose.yml
```

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Deployment

### Environment Setup

1. Set `NEXT_PUBLIC_API_URL` to your production API endpoint
2. Configure `REDIS_URL` for the worker
3. Ensure SQLite database file is persisted or use PostgreSQL for production

### Recommended Deployment

- **Web UI**: Vercel, Netlify, or any Node.js hosting
- **API**: Render, Railway, or any Node.js hosting
- **Worker**: Separate process with auto-restart (PM2, systemd)
- **Redis**: Managed Redis service (Redis Cloud, Upstash)
- **Database**: Consider PostgreSQL for production (change Prisma schema)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

Built as part of the FlyRank Internship - Backend Track (Week 4: Assignment A8).

## Report Sample

![PDF Screenshot](./pdf-screenshot.png)

# ReportFlow

![ReportFlow](./architecture.png)

ReportFlow is an asynchronous PDF report generation system built with a modern microservices architecture. It processes data-intensive report generation tasks in the background using a job queue, ensuring responsive user experience even with large datasets.

## Features

- **Dataset Management**: Upload and manage multiple CSV datasets with automatic validation
- **Data Isolation**: Each dataset is isolated with user ownership and currency settings
- **Asynchronous Processing**: Background job queue powered by BullMQ and Redis for non-blocking report generation
- **Real-time Preview**: Interactive dashboard with live data visualization before PDF generation
- **Multiple Report Types**: Support for Sales Summary and Order Analytics reports
- **Multi-Currency Support**: PDF reports and UI display in USD, EUR, GBP, or INR
- **JWT Authentication**: Secure user authentication with token-based access
- **Column Mapping**: Flexible CSV column mapping for different data formats
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

### Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
- `DATABASE_URL`: SQLite database path
- `REDIS_URL`: Redis connection URL
- `PORT`: API server port
- `NEXT_PUBLIC_API_URL`: Frontend API URL
- `JWT_SECRET`: Secret for JWT token signing
- `SESSION_SECRET`: Secret for session management

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

### First Steps

1. **Register an account**: Navigate to http://localhost:3000 and click "Sign up" to create your account
2. **Import data**: Click "Import Data" to upload a CSV file with your order data
3. **Generate reports**: Select a dataset, choose report type and date range, then generate PDF reports

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

### CSV Import Format

Your CSV file should contain the following columns:

| Column | Required | Description | Format |
|--------|----------|-------------|--------|
| `date` | Yes | Order date | YYYY-MM-DD |
| `amount` | Yes | Order amount | Numeric |
| `status` | Yes | Order status | PENDING, PROCESSING, COMPLETED, CANCELLED, or FAILED |
| `customerName` | No | Customer name | String |

Example CSV:
```csv
date,amount,status,customerName
2024-01-15,150.50,COMPLETED,John Doe
2024-01-16,89.99,PENDING,Jane Smith
2024-01-17,299.00,PROCESSING,Bob Johnson
```

### Creating a Report

1. Navigate to the web dashboard
2. Select a dataset from the dropdown
3. Choose report type (Sales Summary or Order Analytics)
4. Select date range
5. Click "Generate PDF Report"
6. Monitor progress in real-time
7. Download the completed PDF

### API Endpoints

#### Authentication
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Create Report
```http
POST /api/reports
Content-Type: application/json
Authorization: Bearer <jwt-token>
Idempotency-Key: <unique-key>

{
  "reportType": "SALES_SUMMARY",
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31",
  "datasetId": "<dataset-uuid>"
}
```

#### Get Report Status
```http
GET /api/reports/:id
Authorization: Bearer <jwt-token>
```

#### Download Report
```http
GET /api/reports/:id/download
Authorization: Bearer <jwt-token>
```

#### Upload CSV Preview
```http
POST /api/datasets/upload
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "csvData": "date,amount,status\n2024-01-01,100.00,COMPLETED"
}
```

#### Create Dataset
```http
POST /api/datasets/create
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "Q4 2024 Sales",
  "currency": "USD",
  "csvData": "date,amount,status\n2024-01-01,100.00,COMPLETED",
  "columnMapping": {
    "date": "date",
    "amount": "amount",
    "status": "status",
    "customerName": "customerName"
  }
}
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

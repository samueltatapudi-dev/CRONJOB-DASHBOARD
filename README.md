# Cron Job Dashboard

A production-style local full-stack web application for creating, managing, executing, and monitoring cron jobs from a modern dashboard UI.

## Overview

Cron Job Dashboard gives you:

- A React + Tailwind single-page dashboard
- A Node.js + Express REST API
- SQLite persistence for jobs and execution logs
- `node-cron`-driven scheduling with per-job registration
- Manual run, pause, resume, edit, delete, and log inspection flows
- Persistent stdout and stderr history for every run

## Features

- Create jobs with:
  - Job name
  - Description
  - Frequency type
  - Interval number
  - Command
  - Enabled / disabled state
- Live schedule preview with:
  - Generated cron expression
  - Human-readable schedule text
  - First-run preview
- Jobs dashboard with:
  - Status badges
  - Last run / next run
  - Duration and exit code
  - Latest output preview
  - Success and failure counters
- Actions:
  - Run now
  - Pause / disable
  - Resume / enable
  - Edit
  - Delete
  - View logs
- Log viewer with:
  - Reverse chronological history
  - Stdout / stderr separation
  - Copy to clipboard
  - Download as text
  - Failed run highlighting
- Dashboard summary cards
- Search, filter, sort, pagination, auto-refresh, and theme toggle

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Scheduler: `node-cron`
- Database: SQLite via `better-sqlite3`
- HTTP client: Axios
- Validation: Zod
- Shared scheduling logic: local workspace package in `shared/`

## Folder Structure

```text
cron-job-dashboard/
  backend/
    src/
      config/
      controllers/
      db/
      middleware/
      routes/
      scheduler/
      services/
      utils/
      app.js
      server.js
    test/
  frontend/
    src/
      components/
      hooks/
      pages/
      services/
      utils/
      App.jsx
      main.jsx
  shared/
    src/
  scripts/
    demo-success.js
    demo-fail.js
  README.md
```

## Prerequisites

- Node.js `20+`
- npm `10+` recommended

## Installation

1. Install dependencies from the repo root:

```bash
npm install
```

This root install also bootstraps the `backend/` and `frontend/` packages automatically.

2. Create local environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Review `backend/.env` before running if you want to change:

- allowed executables
- command timeout
- SQLite database path
- demo seeding behavior

## Running The App

### Run both frontend and backend

```bash
npm run dev
```

### Run backend only

```bash
npm run dev:backend
```

The backend listens on `http://localhost:4000`.

### Run frontend only

```bash
npm run dev:frontend
```

The frontend runs on `http://localhost:5173`.

## Build

```bash
npm run build
```

## Tests

The project includes a small backend test suite for critical schedule utilities.

```bash
npm run test
```

## Seed Demo Data

Demo data is enabled by default through:

```env
SEED_DEMO_DATA=true
```

On first startup, if the database is empty, the backend seeds:

- `Demo Heartbeat`
- `Failing Probe`
- `Monthly Summary`

The seed data also includes sample log history so the dashboard is populated immediately.

## How Scheduling Works

### Important design note

The dashboard accepts interval-based schedules like:

- Every 5 minutes
- Every 2 hours
- Every 2 weeks
- Every year

Plain cron syntax cannot represent every interval precisely, especially when:

- the interval does not divide evenly into a cron field
- the schedule is week-based, month-based, or year-based
- the schedule should be anchored to the time the user created or resumed the job

### How this project handles that

- The UI shows a best-effort cron preview in `cron_expression`.
- Each enabled job is registered with `node-cron`.
- The internal scheduler polls every minute.
- Exact timing is enforced with saved metadata:
  - `frequency_type`
  - `interval_number`
  - `schedule_anchor_at`
  - `next_run_at`

### First run behavior

Because the form does not ask for a specific hour or minute, the first scheduled run happens **after the selected interval** from when the job is:

- created
- edited
- re-enabled

Examples:

- `Minutes + 5` means first run 5 minutes after save
- `Hours + 2` means first run 2 hours after save
- `Weeks + 1` means first run 1 week after save

### Manual runs

- `Run Now` does **not** change the normal recurring schedule
- Manual execution only creates a run record and updates the latest output fields

## Security Caveats

This project is designed for local use and applies basic command safeguards, but it still runs system commands and should be treated carefully.

### Current protections

- Shell operators and environment substitution are blocked
- Commands are parsed and executed without `shell: true`
- A default allowlist is enforced with `ALLOWED_EXECUTABLES`
- Obvious dangerous executables like `rm`, `sudo`, `shutdown`, and `mkfs` are blocked
- Per-job overlap is prevented in memory
- Command timeout protection is enabled
- Output size is truncated with `MAX_OUTPUT_BYTES`

### Default safe mode

By default:

```env
ALLOW_UNSAFE_COMMANDS=false
```

Only allowlisted executables are accepted. The default allowlist is:

- `node`
- `echo`
- `date`
- `python`
- `python3`
- `npm`
- `pnpm`
- `yarn`

### Unsafe local mode

If you set:

```env
ALLOW_UNSAFE_COMMANDS=true
```

the dashboard becomes much more permissive for local experimentation. This is **not recommended** unless you understand the risk.

## API Summary

### Jobs

- `POST /api/jobs` create a job
- `GET /api/jobs` list all jobs
- `GET /api/jobs/:id` fetch one job
- `PUT /api/jobs/:id` update a job
- `DELETE /api/jobs/:id` delete a job
- `POST /api/jobs/:id/run` run immediately
- `POST /api/jobs/:id/enable` enable and reschedule from now
- `POST /api/jobs/:id/disable` disable a job
- `GET /api/jobs/:id/logs` fetch logs for a job

### Logs

- `GET /api/logs/:logId` fetch one log entry

### System

- `GET /api/health` health check
- `GET /api/stats` summary dashboard stats

### Response shape

Successful responses:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "message": "Readable error message",
    "details": {}
  }
}
```

## Example Environment Files

### `backend/.env`

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_PATH=./data/cron-dashboard.sqlite
ALLOW_UNSAFE_COMMANDS=false
ALLOWED_EXECUTABLES=node,echo,date,python,python3,npm,pnpm,yarn
DEFAULT_COMMAND_TIMEOUT_MS=30000
MAX_OUTPUT_BYTES=50000
SEED_DEMO_DATA=true
COMMAND_WORKDIR=..
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:4000
```

## Architecture Notes

### Backend flow

- `routes/` declares API endpoints
- `controllers/` handle HTTP requests and validation
- `services/jobRepository.js` owns SQLite CRUD and log persistence
- `services/executionService.js` owns command parsing, allowlist enforcement, timeouts, and stdout/stderr capture
- `scheduler/schedulerService.js` registers and manages `node-cron` jobs
- `db/` initializes tables and seeds demo data

### Frontend flow

- `DashboardPage.jsx` owns dashboard state and API orchestration
- reusable components handle form, stats, jobs table, logs modal, and dialogs
- schedule preview logic is imported from `shared/` so the UI and backend agree on schedule text and preview behavior

## Example Screenshots

Add screenshots here after running locally:

- `docs/screenshots/dashboard-light.png`
- `docs/screenshots/dashboard-dark.png`
- `docs/screenshots/logs-modal.png`

## Future Improvements

- Per-job custom timeout in the UI
- Import / export job definitions as JSON
- Retry last failed run
- Charts for execution history
- Better shell command policy controls
- Role-based auth for multi-user deployments
- Server-sent events or websockets for live run updates

## Notes For Local Development

- SQLite data is stored under `backend/data/`
- That folder is ignored by Git in `.gitignore`
- If you want a clean demo reset, stop the server and delete the SQLite file

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { STATUS } from "../shared.js";

import { env } from "../config/env.js";
import { db } from "./database.js";

const schema = `
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    description TEXT DEFAULT '',
    frequency_type TEXT NOT NULL,
    interval_number INTEGER NOT NULL CHECK (interval_number > 0),
    cron_expression TEXT NOT NULL,
    command TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Enabled',
    schedule_anchor_at TEXT NOT NULL,
    last_run_at TEXT,
    next_run_at TEXT,
    last_duration_ms INTEGER,
    last_exit_code INTEGER,
    latest_output TEXT,
    failure_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    timeout_ms INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_ms INTEGER,
    exit_code INTEGER,
    status TEXT NOT NULL,
    stdout TEXT DEFAULT '',
    stderr TEXT DEFAULT '',
    combined_output TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_enabled ON jobs(enabled);
  CREATE INDEX IF NOT EXISTS idx_jobs_next_run_at ON jobs(next_run_at);
  CREATE INDEX IF NOT EXISTS idx_job_logs_job_id_created_at ON job_logs(job_id, created_at DESC);
`;

export function initializeDatabase() {
  mkdirSync(dirname(env.databasePath), { recursive: true });
  db.exec(schema);

  db.prepare(
    `
      UPDATE jobs
      SET status = CASE
        WHEN enabled = 1 THEN ?
        ELSE ?
      END
      WHERE status = ?
    `,
  ).run(STATUS.ENABLED, STATUS.DISABLED, STATUS.RUNNING);
}

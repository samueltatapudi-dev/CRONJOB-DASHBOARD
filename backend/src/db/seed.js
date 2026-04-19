import {
  STATUS,
  advanceNextRunAt,
  createSchedulePreview,
  getFirstRunAt,
} from "@cron-dashboard/shared";

import { env } from "../config/env.js";
import { db } from "./database.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function insertJob(job) {
  const statement = db.prepare(`
    INSERT INTO jobs (
      name,
      description,
      frequency_type,
      interval_number,
      cron_expression,
      command,
      enabled,
      status,
      schedule_anchor_at,
      last_run_at,
      next_run_at,
      last_duration_ms,
      last_exit_code,
      latest_output,
      failure_count,
      success_count,
      timeout_ms,
      created_at,
      updated_at
    ) VALUES (
      @name,
      @description,
      @frequency_type,
      @interval_number,
      @cron_expression,
      @command,
      @enabled,
      @status,
      @schedule_anchor_at,
      @last_run_at,
      @next_run_at,
      @last_duration_ms,
      @last_exit_code,
      @latest_output,
      @failure_count,
      @success_count,
      @timeout_ms,
      @created_at,
      @updated_at
    )
  `);

  const result = statement.run(job);
  return Number(result.lastInsertRowid);
}

function insertLog(log) {
  db.prepare(`
    INSERT INTO job_logs (
      job_id,
      started_at,
      finished_at,
      duration_ms,
      exit_code,
      status,
      stdout,
      stderr,
      combined_output,
      created_at
    ) VALUES (
      @job_id,
      @started_at,
      @finished_at,
      @duration_ms,
      @exit_code,
      @status,
      @stdout,
      @stderr,
      @combined_output,
      @created_at
    )
  `).run(log);
}

export function seedDatabase() {
  if (!env.seedDemoData) {
    return;
  }

  const existingJobs = db.prepare("SELECT COUNT(*) AS count FROM jobs").get();

  if (existingJobs.count > 0) {
    return;
  }

  const now = new Date();

  const heartbeatAnchor = new Date(now.getTime() - 35 * 60 * 1000);
  const heartbeatLastRun = new Date(now.getTime() - 5 * 60 * 1000);
  const heartbeatPreview = createSchedulePreview({
    frequencyType: "Minutes",
    intervalNumber: 5,
    anchorAt: heartbeatAnchor,
  });
  const heartbeatNextRun = advanceNextRunAt(
    getFirstRunAt(heartbeatAnchor, "Minutes", 5),
    "Minutes",
    5,
    now,
  );

  const failingAnchor = new Date(now.getTime() - 65 * 60 * 1000);
  const failingLastRun = new Date(now.getTime() - 20 * 60 * 1000);
  const failingPreview = createSchedulePreview({
    frequencyType: "Minutes",
    intervalNumber: 15,
    anchorAt: failingAnchor,
  });
  const failingNextRun = advanceNextRunAt(
    getFirstRunAt(failingAnchor, "Minutes", 15),
    "Minutes",
    15,
    now,
  );

  const monthlyAnchor = new Date(now.getTime() - 2 * DAY_MS);
  const monthlyPreview = createSchedulePreview({
    frequencyType: "Months",
    intervalNumber: 1,
    anchorAt: monthlyAnchor,
  });

  const heartbeatJobId = insertJob({
    name: "Demo Heartbeat",
    description: "Prints a success message to demonstrate a healthy recurring job.",
    frequency_type: "Minutes",
    interval_number: 5,
    cron_expression: heartbeatPreview.cronExpression,
    command: "node scripts/demo-success.js",
    enabled: 1,
    status: STATUS.SUCCESS,
    schedule_anchor_at: heartbeatAnchor.toISOString(),
    last_run_at: heartbeatLastRun.toISOString(),
    next_run_at: heartbeatNextRun.toISOString(),
    last_duration_ms: 280,
    last_exit_code: 0,
    latest_output: "Demo job completed successfully.\nExecuted at seed time.",
    failure_count: 0,
    success_count: 3,
    timeout_ms: env.defaultCommandTimeoutMs,
    created_at: new Date(now.getTime() - 36 * 60 * 1000).toISOString(),
    updated_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
  });

  insertLog({
    job_id: heartbeatJobId,
    started_at: new Date(heartbeatLastRun.getTime() - 280).toISOString(),
    finished_at: heartbeatLastRun.toISOString(),
    duration_ms: 280,
    exit_code: 0,
    status: STATUS.SUCCESS,
    stdout: "Demo job completed successfully.\nExecuted at seed time.",
    stderr: "",
    combined_output: "STDOUT\nDemo job completed successfully.\nExecuted at seed time.",
    created_at: heartbeatLastRun.toISOString(),
  });

  const failingJobId = insertJob({
    name: "Failing Probe",
    description: "Intentional failure sample that demonstrates stderr capture and failure badges.",
    frequency_type: "Minutes",
    interval_number: 15,
    cron_expression: failingPreview.cronExpression,
    command: "node scripts/demo-fail.js",
    enabled: 1,
    status: STATUS.FAILED,
    schedule_anchor_at: failingAnchor.toISOString(),
    last_run_at: failingLastRun.toISOString(),
    next_run_at: failingNextRun.toISOString(),
    last_duration_ms: 190,
    last_exit_code: 1,
    latest_output: "Demo job simulated a failure.\nFailure generated at seed time.",
    failure_count: 1,
    success_count: 0,
    timeout_ms: env.defaultCommandTimeoutMs,
    created_at: new Date(now.getTime() - 70 * 60 * 1000).toISOString(),
    updated_at: failingLastRun.toISOString(),
  });

  insertLog({
    job_id: failingJobId,
    started_at: new Date(failingLastRun.getTime() - 190).toISOString(),
    finished_at: failingLastRun.toISOString(),
    duration_ms: 190,
    exit_code: 1,
    status: STATUS.FAILED,
    stdout: "",
    stderr: "Demo job simulated a failure.\nFailure generated at seed time.",
    combined_output: "STDERR\nDemo job simulated a failure.\nFailure generated at seed time.",
    created_at: failingLastRun.toISOString(),
  });

  insertJob({
    name: "Monthly Summary",
    description: "Disabled sample job that shows a longer cadence and demonstrates edit or enable flows.",
    frequency_type: "Months",
    interval_number: 1,
    cron_expression: monthlyPreview.cronExpression,
    command: "node -e \"console.log('Monthly summary placeholder')\"",
    enabled: 0,
    status: STATUS.DISABLED,
    schedule_anchor_at: monthlyAnchor.toISOString(),
    last_run_at: null,
    next_run_at: getFirstRunAt(monthlyAnchor, "Months", 1).toISOString(),
    last_duration_ms: null,
    last_exit_code: null,
    latest_output: "",
    failure_count: 0,
    success_count: 0,
    timeout_ms: env.defaultCommandTimeoutMs,
    created_at: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
    updated_at: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
  });
}

import { STATUS } from "@cron-dashboard/shared";

import { db } from "../db/database.js";
import { AppError } from "../utils/appError.js";

function normalizeJob(row, runningIds = new Set()) {
  if (!row) {
    return null;
  }

  const enabled = Boolean(row.enabled);
  const isRunning = runningIds.has(Number(row.id));

  return {
    ...row,
    id: Number(row.id),
    interval_number: Number(row.interval_number),
    enabled,
    last_duration_ms:
      row.last_duration_ms == null ? null : Number(row.last_duration_ms),
    last_exit_code: row.last_exit_code == null ? null : Number(row.last_exit_code),
    failure_count: Number(row.failure_count ?? 0),
    success_count: Number(row.success_count ?? 0),
    timeout_ms: row.timeout_ms == null ? null : Number(row.timeout_ms),
    is_running: isRunning,
    status: isRunning ? STATUS.RUNNING : row.status,
    total_runs: Number(row.failure_count ?? 0) + Number(row.success_count ?? 0),
  };
}

export class JobRepository {
  listJobs(runningIds = new Set()) {
    const rows = db
      .prepare("SELECT * FROM jobs ORDER BY datetime(created_at) DESC, id DESC")
      .all();

    return rows.map((row) => normalizeJob(row, runningIds));
  }

  getEnabledJobs(runningIds = new Set()) {
    const rows = db
      .prepare("SELECT * FROM jobs WHERE enabled = 1 ORDER BY id ASC")
      .all();

    return rows.map((row) => normalizeJob(row, runningIds));
  }

  getJobById(id, runningIds = new Set()) {
    const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
    return normalizeJob(row, runningIds);
  }

  requireJob(id, runningIds = new Set()) {
    const job = this.getJobById(id, runningIds);

    if (!job) {
      throw new AppError(404, "Job not found");
    }

    return job;
  }

  getJobByName(name) {
    const row = db.prepare("SELECT * FROM jobs WHERE name = ? COLLATE NOCASE").get(name);
    return normalizeJob(row);
  }

  createJob(payload) {
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      payload.name,
      payload.description,
      payload.frequency_type,
      payload.interval_number,
      payload.cron_expression,
      payload.command,
      payload.enabled ? 1 : 0,
      payload.status,
      payload.schedule_anchor_at,
      payload.last_run_at,
      payload.next_run_at,
      payload.last_duration_ms,
      payload.last_exit_code,
      payload.latest_output,
      payload.failure_count,
      payload.success_count,
      payload.timeout_ms,
      payload.created_at,
      payload.updated_at,
    );

    return this.getJobById(Number(result.lastInsertRowid));
  }

  updateJob(id, payload) {
    db.prepare(`
      UPDATE jobs
      SET
        name = ?,
        description = ?,
        frequency_type = ?,
        interval_number = ?,
        cron_expression = ?,
        command = ?,
        enabled = ?,
        status = ?,
        schedule_anchor_at = ?,
        next_run_at = ?,
        timeout_ms = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      payload.name,
      payload.description,
      payload.frequency_type,
      payload.interval_number,
      payload.cron_expression,
      payload.command,
      payload.enabled ? 1 : 0,
      payload.status,
      payload.schedule_anchor_at,
      payload.next_run_at,
      payload.timeout_ms,
      payload.updated_at,
      id,
    );

    return this.getJobById(id);
  }

  deleteJob(id) {
    const result = db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
    return result.changes > 0;
  }

  setEnabled(id, enabled, updates) {
    db.prepare(`
      UPDATE jobs
      SET
        enabled = ?,
        status = ?,
        schedule_anchor_at = ?,
        next_run_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      enabled ? 1 : 0,
      updates.status,
      updates.schedule_anchor_at,
      updates.next_run_at,
      updates.updated_at,
      id,
    );

    return this.getJobById(id);
  }

  markRunning(id, updatedAt) {
    db.prepare(`
      UPDATE jobs
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(STATUS.RUNNING, updatedAt, id);
  }

  recordExecution(id, execution, nextRunAt) {
    const transaction = db.transaction(() => {
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        execution.started_at,
        execution.finished_at,
        execution.duration_ms,
        execution.exit_code,
        execution.status,
        execution.stdout,
        execution.stderr,
        execution.combined_output,
        execution.started_at,
      );

      db.prepare(`
        UPDATE jobs
        SET
          status = ?,
          last_run_at = ?,
          next_run_at = ?,
          last_duration_ms = ?,
          last_exit_code = ?,
          latest_output = ?,
          failure_count = failure_count + ?,
          success_count = success_count + ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        execution.status,
        execution.finished_at,
        nextRunAt,
        execution.duration_ms,
        execution.exit_code,
        execution.output_preview,
        execution.status === STATUS.FAILED ? 1 : 0,
        execution.status === STATUS.SUCCESS ? 1 : 0,
        execution.finished_at,
        id,
      );
    });

    transaction();

    return this.getJobById(id);
  }

  listLogsForJob(jobId, limit = 25) {
    return db
      .prepare(`
        SELECT *
        FROM job_logs
        WHERE job_id = ?
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      `)
      .all(jobId, limit)
      .map((row) => ({
        ...row,
        id: Number(row.id),
        job_id: Number(row.job_id),
        duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
        exit_code: row.exit_code == null ? null : Number(row.exit_code),
      }));
  }

  getLogById(logId) {
    const row = db.prepare("SELECT * FROM job_logs WHERE id = ?").get(logId);

    if (!row) {
      return null;
    }

    return {
      ...row,
      id: Number(row.id),
      job_id: Number(row.job_id),
      duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
      exit_code: row.exit_code == null ? null : Number(row.exit_code),
    };
  }

  getStats(runningCount = 0) {
    const counts = db.prepare(`
      SELECT
        COUNT(*) AS total_jobs,
        SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) AS enabled_jobs,
        SUM(CASE WHEN enabled = 0 THEN 1 ELSE 0 END) AS disabled_jobs,
        SUM(CASE WHEN status = '${STATUS.FAILED}' THEN 1 ELSE 0 END) AS failed_jobs
      FROM jobs
    `).get();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const successfulRunsToday = db.prepare(`
      SELECT COUNT(*) AS count
      FROM job_logs
      WHERE status = ? AND started_at >= ?
    `).get(STATUS.SUCCESS, startOfDay.toISOString());

    return {
      total_jobs: Number(counts.total_jobs ?? 0),
      enabled_jobs: Number(counts.enabled_jobs ?? 0),
      disabled_jobs: Number(counts.disabled_jobs ?? 0),
      running_jobs: Number(runningCount),
      failed_jobs: Number(counts.failed_jobs ?? 0),
      successful_runs_today: Number(successfulRunsToday.count ?? 0),
    };
  }
}

import cron from "node-cron";

import {
  POLLING_EXPRESSION,
  STATUS,
  advanceNextRunAt,
  getFirstRunAt,
  isDue,
} from "@cron-dashboard/shared";

import { AppError } from "../utils/appError.js";

export class SchedulerService {
  constructor(jobRepository, executionService) {
    this.jobRepository = jobRepository;
    this.executionService = executionService;
    this.tasks = new Map();
    this.runningJobs = new Set();
  }

  getRunningIds() {
    return new Set(this.runningJobs);
  }

  getRunningCount() {
    return this.runningJobs.size;
  }

  isJobRunning(jobId) {
    return this.runningJobs.has(Number(jobId));
  }

  decorateJob(job) {
    if (!job) {
      return null;
    }

    return {
      ...job,
      is_running: this.runningJobs.has(job.id),
      status: this.runningJobs.has(job.id) ? STATUS.RUNNING : job.status,
    };
  }

  async start() {
    const jobs = this.jobRepository.getEnabledJobs();

    for (const job of jobs) {
      this.scheduleJob(job);
    }
  }

  stopAll() {
    for (const [jobId, task] of this.tasks.entries()) {
      task.stop();
      if (typeof task.destroy === "function") {
        task.destroy();
      }
      this.tasks.delete(jobId);
    }
  }

  scheduleJob(job) {
    this.unscheduleJob(job.id);

    if (!job.enabled) {
      return;
    }

    const task = cron.schedule(POLLING_EXPRESSION, async () => {
      await this.handleTick(job.id);
    });

    this.tasks.set(job.id, task);
  }

  unscheduleJob(jobId) {
    const task = this.tasks.get(jobId);

    if (!task) {
      return;
    }

    task.stop();
    if (typeof task.destroy === "function") {
      task.destroy();
    }

    this.tasks.delete(jobId);
  }

  syncJob(jobId) {
    const job = this.jobRepository.getJobById(jobId);

    if (!job || !job.enabled) {
      this.unscheduleJob(jobId);
      return null;
    }

    this.scheduleJob(job);
    return job;
  }

  async handleTick(jobId) {
    const job = this.jobRepository.getJobById(jobId, this.getRunningIds());

    if (!job || !job.enabled) {
      this.unscheduleJob(jobId);
      return;
    }

    if (this.runningJobs.has(job.id) || !job.next_run_at) {
      return;
    }

    if (!isDue(job.next_run_at)) {
      return;
    }

    try {
      await this.runJob(job.id, "scheduled");
    } catch (error) {
      console.error(`Scheduled execution failed for job ${job.id}`, error);
    }
  }

  async runJob(jobId, trigger = "manual") {
    const job = this.jobRepository.requireJob(jobId, this.getRunningIds());

    if (this.runningJobs.has(job.id)) {
      throw new AppError(409, "This job is already running.");
    }

    this.runningJobs.add(job.id);
    this.jobRepository.markRunning(job.id, new Date().toISOString());

    try {
      let execution;

      try {
        execution = await this.executionService.executeJob(job);
      } catch (error) {
        const now = new Date().toISOString();
        execution = {
          started_at: now,
          finished_at: now,
          duration_ms: 0,
          exit_code: 1,
          status: STATUS.FAILED,
          stdout: "",
          stderr: error.message,
          combined_output: `STDERR\n${error.message}`,
          output_preview: error.message,
        };
      }

      const nextRunAt =
        // Scheduled runs advance the persisted next timestamp. Manual runs do
        // not move the recurring schedule forward.
        trigger === "scheduled" && job.next_run_at
          ? advanceNextRunAt(
              job.next_run_at,
              job.frequency_type,
              job.interval_number,
              execution.finished_at,
            ).toISOString()
          : job.next_run_at ??
            getFirstRunAt(
              job.schedule_anchor_at,
              job.frequency_type,
              job.interval_number,
            ).toISOString();

      const updatedJob = this.jobRepository.recordExecution(
        job.id,
        execution,
        nextRunAt,
      );

      return this.decorateJob(updatedJob);
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  triggerManualRun(jobId) {
    const job = this.jobRepository.requireJob(jobId, this.getRunningIds());

    if (this.runningJobs.has(job.id)) {
      throw new AppError(409, "This job is already running.");
    }

    void this.runJob(job.id, "manual").catch((error) => {
      console.error(`Manual execution failed for job ${job.id}`, error);
    });
  }
}

import {
  STATUS,
  createSchedulePreview,
  getFirstRunAt,
} from "@cron-dashboard/shared";
import { z } from "zod";

import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/http.js";

const jobSchema = z.object({
  name: z.string().trim().min(1, "Job name is required.").max(120),
  description: z.string().trim().max(500).optional().default(""),
  frequencyType: z.enum(["Minutes", "Hours", "Days", "Weeks", "Months", "Year"]),
  intervalNumber: z.coerce
    .number()
    .int("Interval must be a whole number.")
    .positive("Interval must be greater than zero."),
  command: z.string().trim().min(1, "Command is required.").max(1000),
  enabled: z.boolean().optional().default(true),
});

function parseId(value) {
  const id = Number.parseInt(value, 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "A valid numeric job id is required.");
  }

  return id;
}

function assertNotRunning(schedulerService, jobId, actionLabel) {
  if (schedulerService.isJobRunning(jobId)) {
    throw new AppError(409, `Stop the current run before trying to ${actionLabel} this job.`);
  }
}

export function createJobsController({ jobRepository, schedulerService, executionService }) {
  return {
    listJobs(req, res) {
      const jobs = jobRepository
        .listJobs(schedulerService.getRunningIds())
        .map((job) => schedulerService.decorateJob(job));

      return sendSuccess(res, jobs);
    },

    getJob(req, res) {
      const id = parseId(req.params.id);
      const job = schedulerService.decorateJob(
        jobRepository.requireJob(id, schedulerService.getRunningIds()),
      );

      return sendSuccess(res, job);
    },

    createJob(req, res, next) {
      try {
        const payload = jobSchema.parse(req.body);

        if (jobRepository.getJobByName(payload.name)) {
          throw new AppError(409, "A job with that name already exists.");
        }

        executionService.validateCommand(payload.command);

        const now = new Date();
        const preview = createSchedulePreview({
          frequencyType: payload.frequencyType,
          intervalNumber: payload.intervalNumber,
          anchorAt: now,
        });
        const firstRunAt = getFirstRunAt(
          now,
          payload.frequencyType,
          payload.intervalNumber,
        );
        const job = jobRepository.createJob({
          name: payload.name,
          description: payload.description ?? "",
          frequency_type: payload.frequencyType,
          interval_number: payload.intervalNumber,
          cron_expression: preview.cronExpression,
          command: payload.command,
          enabled: payload.enabled,
          status: payload.enabled ? STATUS.ENABLED : STATUS.DISABLED,
          schedule_anchor_at: now.toISOString(),
          last_run_at: null,
          next_run_at: firstRunAt.toISOString(),
          last_duration_ms: null,
          last_exit_code: null,
          latest_output: "",
          failure_count: 0,
          success_count: 0,
          timeout_ms: null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });

        if (job.enabled) {
          schedulerService.syncJob(job.id);
        }

        return sendSuccess(
          res,
          schedulerService.decorateJob(jobRepository.requireJob(job.id)),
          "Job created successfully.",
          201,
        );
      } catch (error) {
        return next(error);
      }
    },

    updateJob(req, res, next) {
      try {
        const id = parseId(req.params.id);
        const existingJob = jobRepository.requireJob(id);
        assertNotRunning(schedulerService, id, "update");
        const payload = jobSchema.parse(req.body);

        const duplicateJob = jobRepository.getJobByName(payload.name);

        if (duplicateJob && duplicateJob.id !== existingJob.id) {
          throw new AppError(409, "A job with that name already exists.");
        }

        executionService.validateCommand(payload.command);

        const now = new Date();
        const preview = createSchedulePreview({
          frequencyType: payload.frequencyType,
          intervalNumber: payload.intervalNumber,
          anchorAt: now,
        });
        const nextRunAt = getFirstRunAt(
          now,
          payload.frequencyType,
          payload.intervalNumber,
        );

        const updatedJob = jobRepository.updateJob(existingJob.id, {
          name: payload.name,
          description: payload.description ?? "",
          frequency_type: payload.frequencyType,
          interval_number: payload.intervalNumber,
          cron_expression: preview.cronExpression,
          command: payload.command,
          enabled: payload.enabled,
          status: payload.enabled ? STATUS.ENABLED : STATUS.DISABLED,
          schedule_anchor_at: now.toISOString(),
          next_run_at: nextRunAt.toISOString(),
          timeout_ms: existingJob.timeout_ms,
          updated_at: now.toISOString(),
        });

        if (updatedJob.enabled) {
          schedulerService.syncJob(updatedJob.id);
        } else {
          schedulerService.unscheduleJob(updatedJob.id);
        }

        return sendSuccess(
          res,
          schedulerService.decorateJob(jobRepository.requireJob(updatedJob.id)),
          "Job updated successfully.",
        );
      } catch (error) {
        return next(error);
      }
    },

    deleteJob(req, res, next) {
      try {
        const id = parseId(req.params.id);
        jobRepository.requireJob(id);
        assertNotRunning(schedulerService, id, "delete");
        schedulerService.unscheduleJob(id);
        jobRepository.deleteJob(id);

        return sendSuccess(res, { id }, "Job deleted successfully.");
      } catch (error) {
        return next(error);
      }
    },

    async runJobNow(req, res, next) {
      try {
        const id = parseId(req.params.id);
        jobRepository.requireJob(id);
        schedulerService.triggerManualRun(id);

        return sendSuccess(
          res,
          { id },
          "Job execution started.",
          202,
        );
      } catch (error) {
        return next(error);
      }
    },

    enableJob(req, res, next) {
      try {
        const id = parseId(req.params.id);
        const job = jobRepository.requireJob(id);
        assertNotRunning(schedulerService, id, "enable");
        const now = new Date();
        const nextRunAt = getFirstRunAt(
          now,
          job.frequency_type,
          job.interval_number,
        );

        const updatedJob = jobRepository.setEnabled(id, true, {
          status: STATUS.ENABLED,
          schedule_anchor_at: now.toISOString(),
          next_run_at: nextRunAt.toISOString(),
          updated_at: now.toISOString(),
        });

        schedulerService.syncJob(updatedJob.id);

        return sendSuccess(
          res,
          schedulerService.decorateJob(updatedJob),
          "Job enabled successfully.",
        );
      } catch (error) {
        return next(error);
      }
    },

    disableJob(req, res, next) {
      try {
        const id = parseId(req.params.id);
        const job = jobRepository.requireJob(id);
        assertNotRunning(schedulerService, id, "disable");
        const updatedJob = jobRepository.setEnabled(id, false, {
          status: STATUS.DISABLED,
          schedule_anchor_at: job.schedule_anchor_at,
          next_run_at: job.next_run_at,
          updated_at: new Date().toISOString(),
        });

        schedulerService.unscheduleJob(updatedJob.id);

        return sendSuccess(
          res,
          schedulerService.decorateJob(updatedJob),
          "Job disabled successfully.",
        );
      } catch (error) {
        return next(error);
      }
    },

    getJobLogs(req, res, next) {
      try {
        const id = parseId(req.params.id);
        jobRepository.requireJob(id);
        const limit = Number.parseInt(req.query.limit, 10);
        const logs = jobRepository.listLogsForJob(
          id,
          Number.isInteger(limit) && limit > 0 ? limit : 25,
        );

        return sendSuccess(res, logs);
      } catch (error) {
        return next(error);
      }
    },
  };
}

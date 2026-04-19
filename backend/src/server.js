import { env } from "./config/env.js";
import { initializeDatabase } from "./db/init.js";
import { seedDatabase } from "./db/seed.js";
import { createApp } from "./app.js";
import { ExecutionService } from "./services/executionService.js";
import { JobRepository } from "./services/jobRepository.js";
import { SchedulerService } from "./scheduler/schedulerService.js";

initializeDatabase();
seedDatabase();

const jobRepository = new JobRepository();
const executionService = new ExecutionService();

const schedulerService = new SchedulerService(jobRepository, executionService);
await schedulerService.start();

const app = createApp({
  jobRepository,
  executionService,
  schedulerService,
});

const server = app.listen(env.port, () => {
  console.log(`Cron Job Dashboard API listening on http://localhost:${env.port}`);
});

function shutdown() {
  schedulerService.stopAll();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

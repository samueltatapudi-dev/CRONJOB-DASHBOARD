import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { env } from "./config/env.js";
import { initializeDatabase } from "./db/init.js";
import { seedDatabase } from "./db/seed.js";
import { createApp } from "./app.js";
import { ExecutionService } from "./services/executionService.js";
import { JobRepository } from "./services/jobRepository.js";
import { SchedulerService } from "./scheduler/schedulerService.js";

let runtime = null;
let shutdownRegistered = false;

function getPublicHost(host) {
  return host === "0.0.0.0" ? "127.0.0.1" : host;
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false;
  }

  return pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

async function createRuntime() {
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

  const server = await new Promise((resolveServer, reject) => {
    const nextServer = app.listen(env.port, env.host, () => {
      resolveServer(nextServer);
    });

    nextServer.on("error", reject);
  });

  const address = server.address();
  const port =
    address && typeof address === "object" ? address.port : env.port;
  const publicHost = getPublicHost(env.host);

  return {
    app,
    server,
    jobRepository,
    executionService,
    schedulerService,
    port,
    url: `http://${publicHost}:${port}`,
  };
}

export async function startServer() {
  if (runtime) {
    return runtime;
  }

  runtime = await createRuntime();
  return runtime;
}

export async function stopServer() {
  if (!runtime) {
    return;
  }

  const activeRuntime = runtime;
  runtime = null;
  activeRuntime.schedulerService.stopAll();

  await new Promise((resolveClose, reject) => {
    activeRuntime.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolveClose();
    });
  });
}

function registerShutdownHandlers() {
  if (shutdownRegistered) {
    return;
  }

  shutdownRegistered = true;

  const shutdown = async () => {
    try {
      await stopServer();
      process.exit(0);
    } catch (error) {
      console.error("Failed to stop Cron Job Dashboard cleanly.", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (isDirectExecution()) {
  registerShutdownHandlers();
  startServer()
    .then(({ url }) => {
      console.log(`Cron Job Dashboard API listening on ${url}`);
    })
    .catch((error) => {
      console.error("Failed to start Cron Job Dashboard API.", error);
      process.exit(1);
    });
}

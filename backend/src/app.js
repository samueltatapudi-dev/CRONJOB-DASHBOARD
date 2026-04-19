import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { createJobsRouter } from "./routes/jobsRoutes.js";
import { createLogsRouter } from "./routes/logsRoutes.js";
import { createSystemRouter } from "./routes/systemRoutes.js";

export function createApp(context) {
  const app = express();
  const hasStaticApp =
    Boolean(env.staticDir) && existsSync(join(env.staticDir, "index.html"));

  app.use(
    cors({
      origin: env.clientOrigin,
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.use("/api/jobs", createJobsRouter(context));
  app.use("/api/logs", createLogsRouter(context));
  app.use("/api", createSystemRouter(context));

  if (hasStaticApp) {
    app.use(express.static(env.staticDir));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(join(env.staticDir, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

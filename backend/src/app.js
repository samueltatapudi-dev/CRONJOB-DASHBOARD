import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { createJobsRouter } from "./routes/jobsRoutes.js";
import { createLogsRouter } from "./routes/logsRoutes.js";
import { createSystemRouter } from "./routes/systemRoutes.js";

export function createApp(context) {
  const app = express();

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

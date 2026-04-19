import { Router } from "express";

import { createLogsController } from "../controllers/logsController.js";

export function createLogsRouter(context) {
  const router = Router();
  const controller = createLogsController(context);

  router.get("/:logId", controller.getLog);

  return router;
}

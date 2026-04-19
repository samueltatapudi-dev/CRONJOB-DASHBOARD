import { Router } from "express";

import { createSystemController } from "../controllers/systemController.js";

export function createSystemRouter(context) {
  const router = Router();
  const controller = createSystemController(context);

  router.get("/health", controller.health);
  router.get("/stats", controller.stats);

  return router;
}

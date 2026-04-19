import { Router } from "express";

import { createJobsController } from "../controllers/jobsController.js";

export function createJobsRouter(context) {
  const router = Router();
  const controller = createJobsController(context);

  router.get("/", controller.listJobs);
  router.post("/", controller.createJob);
  router.get("/:id/logs", controller.getJobLogs);
  router.post("/:id/run", controller.runJobNow);
  router.post("/:id/enable", controller.enableJob);
  router.post("/:id/disable", controller.disableJob);
  router.get("/:id", controller.getJob);
  router.put("/:id", controller.updateJob);
  router.delete("/:id", controller.deleteJob);

  return router;
}

import { sendSuccess } from "../utils/http.js";

export function createSystemController({ jobRepository, schedulerService }) {
  return {
    health(_req, res) {
      return sendSuccess(res, {
        status: "ok",
        uptime_seconds: Math.round(process.uptime()),
      });
    },

    stats(_req, res) {
      const stats = jobRepository.getStats(schedulerService.getRunningCount());
      return sendSuccess(res, stats);
    },
  };
}

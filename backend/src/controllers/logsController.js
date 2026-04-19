import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/http.js";

function parseId(value, label = "log") {
  const id = Number.parseInt(value, 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `A valid numeric ${label} id is required.`);
  }

  return id;
}

export function createLogsController({ jobRepository }) {
  return {
    getLog(req, res, next) {
      try {
        const id = parseId(req.params.logId, "log");
        const log = jobRepository.getLogById(id);

        if (!log) {
          throw new AppError(404, "Log not found");
        }

        return sendSuccess(res, log);
      } catch (error) {
        return next(error);
      }
    },
  };
}

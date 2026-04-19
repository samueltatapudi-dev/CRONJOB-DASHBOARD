import { AppError } from "../utils/appError.js";

export function notFoundHandler(_req, _res, next) {
  next(new AppError(404, "Route not found"));
}

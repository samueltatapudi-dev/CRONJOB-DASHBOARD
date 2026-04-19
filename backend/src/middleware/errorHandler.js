import { ZodError } from "zod";

import { AppError } from "../utils/appError.js";

function extractErrorDetails(error) {
  if (error instanceof ZodError) {
    return error.flatten();
  }

  if (error?.details) {
    return error.details;
  }

  return null;
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        details: extractErrorDetails(error),
      },
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        details: extractErrorDetails(error),
      },
    });
  }

  if (error?.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return res.status(409).json({
      success: false,
      error: {
        message: "A job with that name already exists.",
      },
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    error: {
      message: "Something went wrong on the server.",
    },
  });
}

// Global error handler. Turns thrown Errors into consistent JSON responses.
// Uses `next(err)` semantics — with `express-async-errors` imported at the
// entry point, async route handlers can just throw.

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new ApiError(400, code, message, details);
export const notFound = (msg = "not_found") => new ApiError(404, msg, msg);
export const conflict = (code, msg) => new ApiError(409, code, msg);

export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.code, message: err.message, details: err.details });
  }
  // Postgres unique-constraint violation
  if (err.code === "23505") {
    return res.status(409).json({ error: "duplicate", message: err.detail });
  }
  // Zod validation error
  if (err.name === "ZodError") {
    return res.status(400).json({ error: "validation", details: err.issues });
  }
  req.log?.error({ err }, "unhandled_error");
  return res.status(500).json({ error: "internal_error" });
}

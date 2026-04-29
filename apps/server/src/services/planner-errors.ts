import type { ApiErrorCode } from "@timefraim/shared";

export class PlannerError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PlannerError";
  }
}

export function isPlannerError(error: unknown): error is PlannerError {
  return error instanceof PlannerError;
}

export function invalidInput(message: string) {
  return new PlannerError("invalid_input", message);
}

export function forbidden(message: string) {
  return new PlannerError("forbidden", message);
}

export function notFound(message: string) {
  return new PlannerError("not_found", message);
}

export function conflict(message: string) {
  return new PlannerError("conflict", message);
}

export function dependencyUnavailable(message: string) {
  return new PlannerError("dependency_unavailable", message);
}

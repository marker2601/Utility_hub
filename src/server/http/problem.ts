import { ZodError } from "zod";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  request_id?: string;
  errors?: Array<{ path: string; message: string }>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly detail?: string;

  constructor(params: { status: number; title: string; detail?: string; type?: string }) {
    super(params.title);
    this.status = params.status;
    this.type = params.type ?? "about:blank";
    this.detail = params.detail;
  }
}

export function toProblemDetails(error: unknown, requestId?: string): ProblemDetails {
  if (error instanceof ApiError) {
    return {
      type: error.type,
      title: error.message,
      status: error.status,
      detail: error.detail,
      request_id: requestId,
    };
  }

  if (error instanceof ZodError) {
    return {
      type: "https://utilityhub.dev/problems/validation-error",
      title: "Validation failed",
      status: 400,
      detail: "Request payload does not match schema.",
      request_id: requestId,
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return {
    type: "https://utilityhub.dev/problems/internal-error",
    title: "Internal server error",
    status: 500,
    detail: "Unexpected server error.",
    request_id: requestId,
  };
}

export function problemResponse(problem: ProblemDetails): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: {
      "content-type": "application/problem+json",
      "cache-control": "no-store",
      ...(problem.request_id ? { "x-request-id": problem.request_id } : {}),
    },
  });
}

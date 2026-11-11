export interface Env {
  /** Static assets binding configured in wrangler.jsonc (`assets.binding`). */
  ASSETS: Fetcher;
  /** "production" when deployed; "development" via .dev.vars for local work. */
  ENVIRONMENT: string;
}

/** Worker-side API contract. The frontend keeps its own copy in src/types. */
export interface HealthResponse {
  status: 'ok';
  service: 'datamind-ai';
  phase: '0';
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  path: string;
}

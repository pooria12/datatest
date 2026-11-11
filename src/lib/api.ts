import type { HealthResponse, ApiResponse } from '@/types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public path: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  // Only declare a JSON body when there is one; a Content-Type on GET is pointless
  // and forces a CORS preflight for cross-origin calls.
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json() as { message?: string; error?: string };
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Use default error message
    }
    throw new ApiError(errorMessage, response.status, url);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  // Non-JSON bodies are returned as plain text; callers should use T = string for these.
  return (await response.text()) as unknown as T;
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' });
  },

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export async function checkHealth(): Promise<ApiResponse<HealthResponse>> {
  try {
    const data = await api.get<HealthResponse>('/health');
    return { data, error: null, loading: false };
  } catch (error) {
    if (error instanceof ApiError) {
      return { data: null, error: error.message, loading: false };
    }
    return { data: null, error: 'Unknown error occurred', loading: false };
  }
}

export { ApiError };
export type { HealthResponse };
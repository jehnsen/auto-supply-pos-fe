const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "agri-pos-auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
}

type QueryParams = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: QueryParams;
  /** Attach the bearer token from the auth store. Defaults to true. */
  auth?: boolean;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}/api/v1${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { method = "GET", body, params, auth = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`Could not reach the server at ${API_BASE_URL}`, 0);
  }

  let json: ApiEnvelope<T> | undefined;
  try {
    json = await res.json();
  } catch {
    // No/invalid JSON body
  }

  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(json?.message ?? `Request failed with status ${res.status}`, res.status);
  }

  return json ?? { success: true, message: "", data: undefined as T };
}

/** Returns just the `data` payload of the response envelope. */
export async function apiRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  const envelope = await request<T>(path, options);
  return envelope.data;
}

/** Returns the full envelope (useful when `meta`, e.g. pagination, is needed). */
export async function apiRequestEnvelope<T>(path: string, options?: RequestOptions): Promise<ApiEnvelope<T>> {
  return request<T>(path, options);
}

export { AUTH_STORAGE_KEY };

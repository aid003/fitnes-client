export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_BASE_URL = resolveApiBaseUrl();

type ApiRequestInit = RequestInit & {
  skipJson?: boolean;
};

export async function apiFetch<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const isFormDataBody =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  const shouldDisableCache =
    init.cache === "no-store" ||
    path.startsWith("/schedule") ||
    path.startsWith("/admin/schedule");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: shouldDisableCache ? "no-store" : init.cache,
    credentials: 'include',
    headers: {
      ...(shouldDisableCache ? { 'Cache-Control': 'no-store' } : {}),
      ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new ApiError(errorMessage, response.status);
  }

  if (init.skipJson || response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function resolveApiAssetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (!path.startsWith('/uploads/')) {
    return path;
  }

  return new URL(path, `${API_BASE_URL}/`).toString();
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }

    if (payload.message) {
      return payload.message;
    }

    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Ignore invalid JSON error payloads.
  }

  return `Request failed with status ${response.status}`;
}

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;

    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }
  }

  return 'http://localhost:8000';
}

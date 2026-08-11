import { ApiError } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function drainQueue(token: string | null): void {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

async function silentRefresh(): Promise<string | null> {
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return (data as { access_token: string }).access_token ?? null;
}

function getAccessToken(): string | null {
  return sessionStorage.getItem('access_token');
}

function setAccessToken(token: string | null): void {
  if (token === null) {
    sessionStorage.removeItem('access_token');
  } else {
    sessionStorage.setItem('access_token', token);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers ?? {});

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry) {
    if (isRefreshing) {
      const newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve);
      });
      if (newToken) {
        return request<T>(path, options, false);
      }
      const errorData = await response.clone().json().catch(() => ({}));
      throw new ApiError(
        response.status,
        (errorData as { error?: { code?: string } })?.error?.code ?? 'UNAUTHORIZED',
        (errorData as { error?: { message?: string } })?.error?.message ?? 'Unauthorized.',
        (errorData as { error?: { details?: unknown } })?.error?.details,
      );
    }

    isRefreshing = true;
    let newToken: string | null = null;
    try {
      newToken = await silentRefresh();
      setAccessToken(newToken);
      drainQueue(newToken);
    } catch {
      setAccessToken(null);
      drainQueue(null);
    } finally {
      isRefreshing = false;
    }

    if (newToken) {
      return request<T>(path, options, false);
    }

    const errorData = await response.clone().json().catch(() => ({}));
    throw new ApiError(
      response.status,
      (errorData as { error?: { code?: string } })?.error?.code ?? 'UNAUTHORIZED',
      (errorData as { error?: { message?: string } })?.error?.message ?? 'Unauthorized.',
      (errorData as { error?: { details?: unknown } })?.error?.details,
    );
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = {};
    }
    const errObj = errorData as { error?: { code?: string; message?: string; details?: unknown } };
    throw new ApiError(
      response.status,
      errObj?.error?.code ?? 'UNKNOWN_ERROR',
      errObj?.error?.message ?? 'An unexpected error occurred.',
      errObj?.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as unknown as T;
  }
  return JSON.parse(text) as T;
}

export const client = {
  get<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};

export { getAccessToken, setAccessToken };

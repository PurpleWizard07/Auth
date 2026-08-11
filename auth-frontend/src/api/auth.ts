const API_BASE = '/auth';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: string;
  user: UserResponse;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = 'Request failed.';
    try {
      const data = await response.json();
      if (data?.error?.message) {
        message = data.error.message;
      } else if (data?.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // ignore parse error, use default message
    }
    throw new Error(message);
  }

  const text = await response.text();
  if (!text) {
    return undefined as unknown as T;
  }
  return JSON.parse(text) as T;
}

export async function register(payload: RegisterRequest): Promise<UserResponse> {
  return request<UserResponse>('POST', '/register', {
    full_name: payload.fullName,
    email: payload.email,
    password: payload.password,
    confirm_password: payload.confirmPassword,
    accept_terms: payload.acceptTerms,
  });
}

export async function login(payload: LoginRequest): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('POST', '/login', {
    email: payload.email,
    password: payload.password,
    remember_me: payload.rememberMe ?? false,
  });
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
  return request<void>('POST', '/forgot-password', {
    email: payload.email,
  });
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<void> {
  return request<void>('POST', '/reset-password', {
    token: payload.token,
    password: payload.password,
    confirm_password: payload.confirmPassword,
  });
}

export async function me(): Promise<UserResponse> {
  return request<UserResponse>('GET', '/me');
}

export async function logout(): Promise<void> {
  return request<void>('POST', '/logout');
}

export async function refresh(): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('POST', '/refresh');
}

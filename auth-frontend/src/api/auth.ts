import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface MeResponse {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', data);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>('/auth/register', data);
  return response.data;
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', data);
  return response.data;
}

export async function resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  const response = await api.post<ResetPasswordResponse>('/auth/reset-password', data);
  return response.data;
}

export async function me(): Promise<MeResponse> {
  const response = await api.get<MeResponse>('/auth/me');
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function refresh(): Promise<RefreshResponse> {
  const response = await api.post<RefreshResponse>('/auth/refresh');
  return response.data;
}

export default api;

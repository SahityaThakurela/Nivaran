import { apiClient } from "./client";
import type { SafeUser } from "./types";

export type AuthResponse = {
  token: string;
  user: SafeUser;
};

export type LoginInput = {
  email?: string;
  phone?: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  cityId?: string;
};

export async function login(input: LoginInput): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: input,
  });
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: input,
  });
}

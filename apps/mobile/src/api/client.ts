import { API_BASE_URL } from "./config";

type ApiClientOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
};

type ErrorPayload = {
  error?: unknown;
};

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body:
      options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorField =
      payload !== null &&
      typeof payload === "object" &&
      "error" in payload
        ? (payload as ErrorPayload).error
        : undefined;
    const message =
      typeof errorField === "string" && errorField.length > 0
        ? errorField
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

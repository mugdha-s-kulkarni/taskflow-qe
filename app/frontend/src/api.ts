const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPage {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthResult {
  id: string;
  email: string;
  token: string;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.message || `Request failed with ${res.status}`, res.status);
  }
  return body as T;
}

export function register(email: string, password: string): Promise<AuthResult> {
  return request("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function login(email: string, password: string): Promise<AuthResult> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function listTasks(token: string, status?: TaskStatus | "all"): Promise<TaskPage> {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  return request(`/api/tasks${qs}`, { method: "GET" }, token);
}

export function createTask(token: string, title: string, description: string): Promise<Task> {
  return request("/api/tasks", { method: "POST", body: JSON.stringify({ title, description }) }, token);
}

export function updateTaskStatus(token: string, id: string, status: TaskStatus): Promise<Task> {
  return request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
}

export function deleteTask(token: string, id: string): Promise<void> {
  return request(`/api/tasks/${id}`, { method: "DELETE" }, token);
}

export { ApiError };

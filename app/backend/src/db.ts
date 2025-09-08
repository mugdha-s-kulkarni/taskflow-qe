export type TaskStatus = "todo" | "in_progress" | "done";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

// In-memory store. Deliberate choice for a test-fixture app: no native
// bindings, no container, resettable in one line between test runs.
export const db = {
  users: new Map<string, User>(),
  usersByEmail: new Map<string, string>(), // email -> id
  tasks: new Map<string, Task>(),
};

export function resetDb(): void {
  db.users.clear();
  db.usersByEmail.clear();
  db.tasks.clear();
}

import { FormEvent, useEffect, useState } from "react";
import { ApiError, Task, TaskStatus, createTask, deleteTask, listTasks, updateTaskStatus } from "../api";

interface Props {
  email: string;
  token: string;
  onLogout: () => void;
}

const FILTERS: Array<{ value: TaskStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function TasksPage({ email, token, onLogout }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(status: TaskStatus | "all" = filter) {
    setLoading(true);
    try {
      const page = await listTasks(token, status);
      setTasks(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await createTask(token, title.trim(), description.trim());
      setTitle("");
      setDescription("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create task");
    }
  }

  async function handleAdvance(task: Task) {
    try {
      await updateTaskStatus(token, task.id, NEXT_STATUS[task.status]);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update task");
    }
  }

  async function handleDelete(task: Task) {
    try {
      await deleteTask(token, task.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete task");
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>TaskFlow</h1>
        <div className="header-right">
          <span data-testid="current-user">{email}</span>
          <button className="link-button" data-testid="logout-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <form className="add-task-form" onSubmit={handleAdd} data-testid="add-task-form">
        <input
          placeholder="Task title"
          data-testid="task-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Description (optional)"
          data-testid="task-description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" data-testid="add-task-button">
          Add task
        </button>
      </form>

      {error && (
        <div className="error-banner" data-testid="tasks-error">
          {error}
        </div>
      )}

      <nav className="filter-tabs" data-testid="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={filter === f.value ? "filter-tab active" : "filter-tab"}
            data-testid={`filter-${f.value}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <ul className="task-list" data-testid="task-list">
        {loading && <li data-testid="tasks-loading">Loading…</li>}
        {!loading && tasks.length === 0 && <li data-testid="tasks-empty">No tasks yet — add one above.</li>}
        {tasks.map((task) => (
          <li key={task.id} className="task-row" data-testid="task-row" data-status={task.status}>
            <div className="task-main">
              <span className={`status-badge status-${task.status}`} data-testid="task-status-badge">
                {STATUS_LABEL[task.status]}
              </span>
              <div>
                <div className="task-title" data-testid="task-title">
                  {task.title}
                </div>
                {task.description && <div className="task-description">{task.description}</div>}
              </div>
            </div>
            <div className="task-actions">
              <button data-testid="advance-status-button" onClick={() => handleAdvance(task)}>
                Mark {STATUS_LABEL[NEXT_STATUS[task.status]]}
              </button>
              <button data-testid="delete-task-button" onClick={() => handleDelete(task)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

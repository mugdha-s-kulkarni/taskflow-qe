import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, Task, TaskStatus } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/requireAuth";

export const tasksRouter = Router();

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

tasksRouter.use(requireAuth);

function serialize(task: Task) {
  return task;
}

tasksRouter.get("/", (req: AuthedRequest, res) => {
  const { status } = req.query;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));

  if (status !== undefined && !VALID_STATUSES.includes(status as TaskStatus)) {
    return res.status(400).json({ error: "invalid_status", message: `status must be one of ${VALID_STATUSES.join(", ")}` });
  }

  let items = [...db.tasks.values()].filter((t) => t.userId === req.userId);
  if (status) items = items.filter((t) => t.status === status);
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const page_items = items.slice(start, start + pageSize).map(serialize);

  return res.status(200).json({ items: page_items, total, page, pageSize });
});

tasksRouter.post("/", (req: AuthedRequest, res) => {
  const { title, description } = req.body ?? {};

  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "invalid_title", message: "title is required" });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: "title_too_long", message: "title must be 200 characters or fewer" });
  }
  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ error: "invalid_description", message: "description must be a string" });
  }

  const now = new Date().toISOString();
  const task: Task = {
    id: uuid(),
    userId: req.userId!,
    title: title.trim(),
    description: description ?? "",
    status: "todo",
    createdAt: now,
    updatedAt: now,
  };
  db.tasks.set(task.id, task);

  return res.status(201).json(serialize(task));
});

tasksRouter.get("/:id", (req: AuthedRequest, res) => {
  const task = db.tasks.get(req.params.id);
  if (!task || task.userId !== req.userId) {
    return res.status(404).json({ error: "task_not_found", message: "No task with that id" });
  }
  return res.status(200).json(serialize(task));
});

tasksRouter.patch("/:id", (req: AuthedRequest, res) => {
  const task = db.tasks.get(req.params.id);
  if (!task || task.userId !== req.userId) {
    return res.status(404).json({ error: "task_not_found", message: "No task with that id" });
  }

  const { title, description, status } = req.body ?? {};

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "invalid_title", message: "title must be a non-empty string" });
    }
    task.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== "string") {
      return res.status(400).json({ error: "invalid_description", message: "description must be a string" });
    }
    task.description = description;
  }
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "invalid_status", message: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }
    task.status = status;
  }

  task.updatedAt = new Date().toISOString();
  db.tasks.set(task.id, task);

  return res.status(200).json(serialize(task));
});

tasksRouter.delete("/:id", (req: AuthedRequest, res) => {
  const task = db.tasks.get(req.params.id);
  if (!task || task.userId !== req.userId) {
    return res.status(404).json({ error: "task_not_found", message: "No task with that id" });
  }
  db.tasks.delete(task.id);
  return res.status(204).send();
});

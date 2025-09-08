import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";
import { resetDb } from "./db";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

// Malformed JSON body -> 400 instead of Express's default 500.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "invalid_json", message: "Request body is not valid JSON" });
  }
  next(err);
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/tasks", tasksRouter);

// Test-only endpoint: gives each spec file a clean slate without a real DB.
if (process.env.NODE_ENV === "test") {
  app.post("/api/test/reset", (_req, res) => {
    resetDb();
    res.status(204).send();
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "not_found", message: "No such route" });
});

app.listen(PORT, () => {
  console.log(`taskflow backend listening on :${PORT}`);
});

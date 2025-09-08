import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { signToken } from "../auth";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "invalid_email", message: "A valid email is required" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "weak_password", message: "Password must be at least 8 characters" });
  }
  if (db.usersByEmail.has(email)) {
    return res.status(409).json({ error: "email_taken", message: "An account with this email already exists" });
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id, email, passwordHash, createdAt: new Date().toISOString() };
  db.users.set(id, user);
  db.usersByEmail.set(email, id);

  const token = signToken({ userId: id, email });
  return res.status(201).json({ id, email, token });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "missing_credentials", message: "email and password are required" });
  }

  const userId = db.usersByEmail.get(email);
  const user = userId ? db.users.get(userId) : undefined;
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials", message: "Email or password is incorrect" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials", message: "Email or password is incorrect" });
  }

  const token = signToken({ userId: user.id, email: user.email });
  return res.status(200).json({ id: user.id, email: user.email, token });
});

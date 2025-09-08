import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../auth";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "missing_token", message: "Authorization: Bearer <token> header is required" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "invalid_token", message: "Token is invalid or expired" });
    return;
  }

  req.userId = payload.userId;
  next();
}

import { useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { TasksPage } from "./pages/TasksPage";

interface Session {
  email: string;
  token: string;
}

const STORAGE_KEY = "taskflow.session";

function loadSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);

  function handleAuthed(email: string, token: string) {
    const next = { email, token };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  if (!session) {
    return <LoginPage onAuthed={handleAuthed} />;
  }

  return <TasksPage email={session.email} token={session.token} onLogout={handleLogout} />;
}

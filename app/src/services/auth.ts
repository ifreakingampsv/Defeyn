import type { User } from "./types.js";
import { apiFetch, apiBaseUrl, setAuthToken } from "./api/client.js";

/**
 * Auth for the Defeyn frontend.
 *
 * - Mock mode (no VITE_API_BASE_URL): any name/email signs in, persisted to
 *   localStorage — the Phase 1 behavior.
 * - Real mode (VITE_API_BASE_URL set): POST /api/auth/login, falling back to
 *   /api/auth/signup for unknown emails; the bearer token is stored and sent
 *   by the API client on every call.
 */

const KEY = "defeyn-user";

export const realAuthEnabled = !!apiBaseUrl();

interface AuthResponse {
  token: string;
  user: { id: string; name: string; email: string; initials: string };
}

function initialsOf(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function storeUser(user: User): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable: user lives for the session only */
  }
}

/** Sign in against the backend (real mode) or locally (mock mode). Throws on
 * real-mode failures (wrong password, network) — the login page shows them. */
export async function signIn(name: string, email: string, password?: string): Promise<User> {
  if (!realAuthEnabled) {
    const fallback = email.split("@")[0] ?? "Learner";
    const clean = name.trim() || fallback.replace(/[._-]+/g, " ");
    const user: User = {
      id: `u-${Date.now().toString(36)}`,
      name: clean.charAt(0).toUpperCase() + clean.slice(1),
      initials: initialsOf(clean),
    };
    storeUser(user);
    return user;
  }

  const displayName = name.trim() || email.split("@")[0].replace(/[._-]+/g, " ");
  const pw = password || `defeyn-${email.toLowerCase()}`;
  let response: AuthResponse;
  try {
    response = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pw }),
    });
  } catch {
    // unknown account: sign up with the typed details
    response = await apiFetch<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password: pw, name: displayName }),
    });
  }
  setAuthToken(response.token);
  const user: User = {
    id: response.user.id,
    name: response.user.name,
    initials: response.user.initials || initialsOf(displayName),
  };
  storeUser(user);
  return user;
}

export function signOut(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing persisted */
  }
  setAuthToken("");
}

import type { User } from './types';

/**
 * Mock auth for the frontend-only product build. There is no account service
 * yet (BACKEND.md §2 "Auth"): any name/email combination signs you in, and the
 * session lives in localStorage under `defeyn-user`. When real auth lands,
 * replace this module's bodies — every consumer only uses the three functions.
 */

const KEY = 'defeyn-user';

function initialsOf(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function signIn(name: string, email: string): User {
  const fallback = email.split('@')[0] ?? 'Learner';
  const clean = name.trim() || fallback.replace(/[._-]+/g, ' ');
  const user: User = {
    id: `u-${Date.now().toString(36)}`,
    name: clean.charAt(0).toUpperCase() + clean.slice(1),
    initials: initialsOf(clean),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable: user lives for the session only */
  }
  return user;
}

export function signOut(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing persisted */
  }
}

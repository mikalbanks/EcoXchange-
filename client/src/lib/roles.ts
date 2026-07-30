import type { AuthUser } from "./auth";

export type Role = AuthUser["role"];

/**
 * Where a signed-in user belongs. Single source of truth for the post-login
 * redirect and for the wrong-role bounce in ProtectedRoute — these used to be
 * duplicated ternaries that could drift apart.
 */
export function dashboardPathForRole(role: Role | string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "DEVELOPER":
      return "/developer";
    default:
      return "/investor";
  }
}

/** Login URL that remembers where the user was trying to go. */
export function loginPathWithReturn(attemptedPath: string): string {
  // Never bounce back to an auth page; that would loop.
  if (!attemptedPath || attemptedPath.startsWith("/auth/")) return "/auth/login";
  return `/auth/login?next=${encodeURIComponent(attemptedPath)}`;
}

/**
 * Reads the `next` param, rejecting anything that isn't a local path so a
 * crafted link can't redirect off-site after sign-in.
 */
export function safeReturnPath(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (next.startsWith("/auth/")) return null;
  return next;
}

import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { backendFetch } from "./backend";
import { sessionCookieName } from "./config";
import type { SessionUser } from "./types";

/** Token mentah dari cookie httpOnly, atau null bila belum login. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(sessionCookieName)?.value ?? null;
}

export type SessionState =
  | { status: "authenticated"; user: SessionUser }
  | { status: "anonymous" }
  | { status: "unavailable"; error: string };

// Sesi menurut backend (`GET /api/auth/me`)
export const getSession = cache(async (): Promise<SessionState> => {
  const token = await getSessionToken();
  if (!token) return { status: "anonymous" };

  const res = await backendFetch<{ user: SessionUser }>("/api/auth/me", { token });
  if (res.ok) return { status: "authenticated", user: res.data.user };
  if (res.status === 401) return { status: "anonymous" };
  return { status: "unavailable", error: res.error };
});


export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getSession();
  if (session.status === "authenticated") return session.user;
  if (session.status === "anonymous") redirect("/login");
  throw new Error(session.error);
}

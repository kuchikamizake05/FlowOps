"use server";

import { cookies } from "next/headers";
import { backendFetch } from "../backend";
import { sessionCookieName } from "../config";

export type LoginResult = 
  | { ok: true }
  | { ok: false; error: string };

export async function login(email: unknown, password: unknown): Promise<LoginResult> {
  // Validasi tipe
  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false, error: "Email dan sandi harus berupa teks." };
  }

  // Panggil API
  const res = await backendFetch<{ token: string; expiresAt: string }>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });

  // Jika berhasil, tanam cookie, kembalikan balasan kosong (token tidak bocor ke klien)
  if (res.ok) {
    const expires = new Date(res.data.expiresAt);
    const store = await cookies();
    store.set(sessionCookieName, res.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: Number.isNaN(expires.getTime()) ? undefined : expires,
    });
    return { ok: true };
  }

  // Pemetaan Pesan Gagal
  if (res.status === 400 || res.status === 401) {
    return { ok: false, error: res.error || "Email atau kata sandi salah." };
  }
  
  if (res.status === 429) {
    return { ok: false, error: "Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit." };
  }
  
  if (res.status === 0) {
    return { ok: false, error: res.error };
  }

  return { ok: false, error: "Terjadi kesalahan pada server." };
}
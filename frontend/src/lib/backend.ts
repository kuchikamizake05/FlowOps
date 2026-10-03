import "server-only";
import { backendBaseUrl } from "./config";

export type BackendResult<T> =
    | { ok: true; status: number; data: T }
    | { ok: false; status: number; error: string };

export async function backendFetch<T>(
    path: string,
    options?: { method?: "GET" | "POST"; token?: string; body?: unknown },
): Promise<BackendResult<T>> {
    const url = `${backendBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    if(options?.token) {
        headers["Authorization"] = `Bearer ${options.token}`;
    }

    let res: Response;
    try {
        res = await fetch(url, {
            method: options?.method || "GET",
            headers,
            body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
            cache: "no-store",
        });
    } catch {
        return {
            ok: false,
            status: 0,
            error: "Tidak dapat menghubungi server. Periksa koneksi Anda."
        };
    }

    if(!res.ok) {
        const errorData = await res.json().catch(() => null);
        const error = errorData?.message || errorData?.error || "Permintaan ke server gagal.";
        return { ok: false, status: res.status, error };
    }

    if(res.status === 204) {
        return { ok:true, status: 204, data: undefined as T };
    }

    const data: T | null = await res.json().catch(() => null);
    if (data === null) {
        return { ok: false, status: res.status, error: "Respons server tidak valid." };
    }
    return { ok: true, status: res.status, data };
}

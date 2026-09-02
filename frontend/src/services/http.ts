/**
 * Service transport layer.
 *
 * The prototype resolves every call against the in-memory mock store, but the
 * shape of this module mirrors what the production implementation will look
 * like once the FastAPI backend is available:
 *
 *   const { data } = await api.get<Paginated<Resident>>("/residents", { params });
 *
 * Swapping the mock services for real ones therefore means replacing the body
 * of each `*Service` method - not touching any component or page.
 */
import axios from "axios";
import type { ListQuery, Paginated } from "@/types";

export const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ??
  "/api/v1";

/** Pre-configured Axios client kept ready for the real backend. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

let accessToken: string | null = null;
export function setAuthToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/** Runtime flag so the UI can label the data source honestly. */
export const USING_MOCK_BACKEND = true;

/* ------------------------------------------------------------------ */
/* Mock helpers                                                        */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Simulates realistic network latency. */
export function delay(min = 180, max = 460) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function mockRequest<T>(resolver: () => T, opts?: { min?: number; max?: number }): Promise<T> {
  await delay(opts?.min, opts?.max);
  return resolver();
}

export function paginate<T>(items: T[], query: ListQuery | undefined): Paginated<T> {
  const page = Math.max(1, query?.page ?? 1);
  const pageSize = Math.max(1, query?.pageSize ?? 10);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function matches(haystack: (string | number | null | undefined)[], needle?: string) {
  if (!needle) return true;
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((h) => String(h ?? "").toLowerCase().includes(q));
}

export function sortBy<T>(items: T[], key: string | undefined, dir: "asc" | "desc" = "asc", accessor?: (item: T, key: string) => unknown) {
  if (!key) return items;
  const get = accessor ?? ((item: T, k: string) => (item as Record<string, unknown>)[k]);
  return [...items].sort((a, b) => {
    const av = get(a, key);
    const bv = get(b, key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") {
      return dir === "asc" ? av - bv : bv - av;
    }
    const cmp = String(av).localeCompare(String(bv), "en", { numeric: true });
    return dir === "asc" ? cmp : -cmp;
  });
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Server-side client for the FastAPI analyzer service.
 * Never imported by client components.
 */

export type AnalyzerResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

const TIMEOUT_MS = 10_000;

function baseUrl(): string {
  return (process.env.ANALYZER_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
}

export async function postAnalyzer<T>(path: string, body: unknown): Promise<AnalyzerResult<T>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.ANALYZER_TOKEN) {
    headers.authorization = "Bearer " + process.env.ANALYZER_TOKEN;
  }

  try {
    const response = await fetch(baseUrl() + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const raw = await response.text();
    let payload: unknown = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }

    if (response.ok) {
      return { ok: true, data: payload as T };
    }

    const message =
      payload && typeof payload === "object" && payload !== null && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Layanan analisis mengembalikan kesalahan.";

    return { ok: false, status: response.status, message };
  } catch (error) {
    const aborted = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return {
      ok: false,
      status: aborted ? 504 : 502,
      message: aborted
        ? "Request membutuhkan waktu terlalu lama, silakan coba lagi."
        : "Layanan analisis tidak dapat dihubungi, silakan coba lagi.",
    };
  }
}

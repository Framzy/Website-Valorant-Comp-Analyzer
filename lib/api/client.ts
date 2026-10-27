/** Browser-side HTTP helpers with the legacy axios error semantics. */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function networkMessage(): string {
  return "Tidak dapat terhubung ke server, silakan coba lagi.";
}

function timeoutMessage(): string {
  return "Request membutuhkan waktu sedikit lebih lama, silakan coba lagi.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const aborted = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    throw new ApiError(aborted ? timeoutMessage() : networkMessage(), 0);
  }

  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;

  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : "Terjadi kesalahan pada server (" + response.status + ").";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

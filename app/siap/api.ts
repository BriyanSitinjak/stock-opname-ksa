export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("ksa-staff-required"));
  }
  const data = (await response.json()) as T;
  return { ok: response.ok, status: response.status, data };
}

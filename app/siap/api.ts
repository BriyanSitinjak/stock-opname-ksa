export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = (await response.json()) as T;
  return { ok: response.ok, status: response.status, data };
}

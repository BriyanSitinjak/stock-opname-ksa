export async function jsonOf(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

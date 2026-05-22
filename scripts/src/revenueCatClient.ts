import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

export async function rcGet<T>(path: string): Promise<T> {
  const resp = await connectors.proxy("revenuecat", path, { method: "GET" });
  return (resp as unknown as Response).json() as Promise<T>;
}

export async function rcPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await connectors.proxy("revenuecat", path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  } as RequestInit);
  return (resp as unknown as Response).json() as Promise<T>;
}

export async function rcPatch<T>(path: string, body: unknown): Promise<T> {
  const resp = await connectors.proxy("revenuecat", path, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  } as RequestInit);
  return (resp as unknown as Response).json() as Promise<T>;
}

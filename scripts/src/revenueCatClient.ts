import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";

export async function getUncachableRevenueCatClient() {
  const connectors = new ReplitConnectors();

  const tokenResponse = await connectors.proxy("revenuecat", "/v2/projects", {
    method: "GET",
  });

  const authHeader = (tokenResponse as any)?.request?.headers?.Authorization as string | undefined;

  const baseUrl = "https://api.revenuecat.com";

  const client = createClient({
    baseUrl,
    headers: {
      Authorization: authHeader ?? "",
    },
    fetch: async (url: string, init?: RequestInit) => {
      const path = url.replace(baseUrl, "");
      const resp = await connectors.proxy("revenuecat", path, {
        method: (init?.method ?? "GET") as string,
        headers: init?.headers as Record<string, string> | undefined,
        body: init?.body as string | undefined,
      });
      return resp as unknown as Response;
    },
  });

  return client;
}

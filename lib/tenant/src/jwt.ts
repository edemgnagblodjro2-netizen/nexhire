import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = process.env.TENANT_JWT_SECRET ?? process.env.ADMIN_KEY ?? "civicai-dev-secret-change-in-prod";
const secret = new TextEncoder().encode(JWT_SECRET);
const ALGORITHM = "HS256";
const EXPIRY = "8h";

export interface TenantJWTPayload extends JWTPayload {
  tenantId: string;
  schemaName: string;
  userId: string;
  email: string;
  roleName: string | null;
}

export async function signTenantJWT(payload: Omit<TenantJWTPayload, "iss" | "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setIssuer("civicai")
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export async function verifyTenantJWT(token: string): Promise<TenantJWTPayload> {
  const { payload } = await jwtVerify(token, secret, { issuer: "civicai" });
  return payload as TenantJWTPayload;
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

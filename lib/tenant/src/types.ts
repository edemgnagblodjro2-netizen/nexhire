export type AppType = "attentezero" | "constructpro" | string;
export type TenantPlan = "free" | "pro" | "enterprise";
export type TenantStatus = "active" | "suspended" | "trial";

export interface TenantInfo {
  id: string;
  companyName: string;
  schemaName: string;
  subdomain: string | null;
  customDomain: string | null;
  appType: AppType;
  plan: TenantPlan;
  status: TenantStatus;
  dbHost: string | null;
  dbName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUser {
  userId: string;
  email: string;
  fullName: string | null;
  roleId: string | null;
  roleName: string | null;
}

export interface CreateTenantInput {
  companyName: string;
  subdomain: string;
  appType: AppType;
  plan?: TenantPlan;
  customDomain?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantInfo;
      tenantUser?: TenantUser;
    }
  }
}

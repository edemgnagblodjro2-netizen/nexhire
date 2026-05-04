import { getOrgToken } from "./orgAuth";

export type OrgUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "user" | "organisme";
};

export type Organisation = {
  id: string;
  userId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
  badgeVerified: boolean;
  serviceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  id: string;
  organisationId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: "standard" | "plus";
  interval: "month" | "year";
  status: string;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type StatsResponse = {
  totals: { views: number; calls: number; clicks: number };
  daily: Array<{ date: string; action: "view" | "call" | "click"; count: number }>;
  days?: number;
  message?: string;
};

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const token = getOrgToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function loginOrganism(email: string, password: string) {
  const res = await fetch("/api/mobile-auth/email-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur de connexion.");
  return data as { token: string; user: OrgUser };
}

export async function fetchMyOrganisation(): Promise<{
  organisation: Organisation;
  subscription: Subscription | null;
}> {
  const res = await fetch("/api/organisations/me", { headers: authHeaders() });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (res.status === 404) throw new Error("NOT_ORGANISM");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchMyStats(days = 30): Promise<StatsResponse> {
  const res = await fetch(`/api/organisations/me/stats?days=${days}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateMyOrganisation(data: {
  contactName?: string;
  phone?: string;
  website?: string;
  description?: string;
}): Promise<{ organisation: Organisation }> {
  const res = await fetch("/api/organisations/me", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function openBillingPortal(organisationId: string): Promise<string> {
  const res = await fetch("/api/stripe/billing-portal", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ organisationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur ouverture du portail.");
  return data.url as string;
}

// ── Verification (Badge Vérifié) ─────────────────────────────────────────
export type VerificationRequest = {
  id: string;
  organisationId: string;
  neq: string;
  arcCharityNumber: string | null;
  legalName: string;
  foundedYear: string;
  contactPhone: string;
  website: string | null;
  mission: string;
  status: "pending" | "auto_approved" | "approved" | "rejected";
  autoCheckResult: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VerificationStatus = {
  isVerified: boolean;
  eligibleForRequest: boolean;
  paidPlan: string | null;
  latestRequest: VerificationRequest | null;
};

export async function fetchVerificationStatus(): Promise<VerificationStatus> {
  const res = await fetch("/api/org/verification/status", { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function submitVerificationRequest(payload: {
  neq: string;
  arcCharityNumber?: string;
  legalName: string;
  foundedYear: string;
  contactPhone: string;
  website?: string;
  mission: string;
}): Promise<{
  request: VerificationRequest;
  autoApproved: boolean;
  message: string;
  autoCheck: { passed: boolean; reason: string };
}> {
  const res = await fetch("/api/org/verification/request", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur lors de la demande.");
  return data;
}

// Admin (super-admin) endpoints — use admin key, not org token.
export async function adminListVerifications(adminKey: string, status = "pending") {
  const res = await fetch(
    `/api/admin/verification/requests?status=${encodeURIComponent(status)}`,
    { headers: { "x-admin-key": adminKey } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as {
    requests: Array<{ request: VerificationRequest; org: Organisation | null }>;
  };
}

export async function adminApproveVerification(adminKey: string, id: string) {
  const res = await fetch(`/api/admin/verification/${id}/approve`, {
    method: "POST",
    headers: { "x-admin-key": adminKey },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function adminRejectVerification(adminKey: string, id: string, reason: string) {
  const res = await fetch(`/api/admin/verification/${id}/reject`, {
    method: "POST",
    headers: { "x-admin-key": adminKey, "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ──────────────────────────────────────────────────────────────────────────
// Admin — Organismes & Partenaires (manual badge management)
// ──────────────────────────────────────────────────────────────────────────
export type AdminOrgRow = {
  org: Organisation & { kind: "organisme" | "partenaire" | "intervenant"; professionalTitle?: string | null; affiliation?: string | null };
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
  } | null;
};

export async function adminListOrganisations(
  adminKey: string,
  kind: "organisme" | "partenaire" | "all" = "all",
  q = "",
): Promise<AdminOrgRow[]> {
  const params = new URLSearchParams({ kind });
  if (q.trim()) params.set("q", q.trim());
  const res = await fetch(`/api/admin/organisations?${params.toString()}`, {
    headers: { "x-admin-key": adminKey },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.organisations as AdminOrgRow[];
}

export async function adminToggleOrgBadge(
  adminKey: string,
  orgId: string,
  verified: boolean,
): Promise<Organisation> {
  const res = await fetch(`/api/admin/organisations/${orgId}/badge`, {
    method: "POST",
    headers: { "x-admin-key": adminKey, "Content-Type": "application/json" },
    body: JSON.stringify({ verified }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.organisation as Organisation;
}

export async function startCheckout(
  organisationId: string,
  email: string,
  plan: "standard" | "plus",
  interval: "monthly" | "annual"
): Promise<string> {
  const res = await fetch("/api/stripe/create-checkout-session", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ organisationId, email, plan, interval }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur lors de la création.");
  return data.url as string;
}

const API_BASE = "";

export type Service = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  city: string;
  phone: string;
  website: string;
  description: string;
  address: string | null;
  hours: string | null;
  isUrgent: boolean;
  isProvinceWide: boolean;
  lat: number | null;
  lng: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceList = {
  data: Service[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ServiceMeta = {
  cities: string[];
  categories: string[];
  stats: {
    total: number;
    active: number;
    urgent: number;
    provinceWide: number;
  };
};

function headers(adminKey: string) {
  return {
    "Content-Type": "application/json",
    "x-admin-key": adminKey,
  };
}

export async function fetchMeta(adminKey: string): Promise<ServiceMeta> {
  const res = await fetch(`${API_BASE}/api/admin/services/meta`, {
    headers: headers(adminKey),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  category?: string;
  active?: "true" | "false" | "";
};

export async function fetchServices(
  adminKey: string,
  params: ListParams = {}
): Promise<ServiceList> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.city) q.set("city", params.city);
  if (params.category) q.set("category", params.category);
  if (params.active) q.set("active", params.active);

  const res = await fetch(`${API_BASE}/api/admin/services?${q}`, {
    headers: headers(adminKey),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createService(
  adminKey: string,
  data: Partial<Service>
): Promise<Service> {
  const res = await fetch(`${API_BASE}/api/admin/services`, {
    method: "POST",
    headers: headers(adminKey),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateService(
  adminKey: string,
  id: string,
  data: Partial<Service>
): Promise<Service> {
  const res = await fetch(`${API_BASE}/api/admin/services/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: headers(adminKey),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteService(
  adminKey: string,
  id: string,
  hard = false
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/admin/services/${encodeURIComponent(id)}?hard=${hard}`,
    { method: "DELETE", headers: headers(adminKey) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function toggleService(
  adminKey: string,
  id: string,
  active: boolean
): Promise<Service> {
  return updateService(adminKey, id, { active });
}

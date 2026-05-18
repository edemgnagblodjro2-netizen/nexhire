const BASE = "/api";

function getToken(): string {
  return localStorage.getItem("tenant_token") ?? "";
}

function headers(): HeadersInit {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const azApi = {
  // Sites
  getSites:   ()                => req<any[]>("GET",   "/attentezero/sites"),
  createSite: (b: any)         => req<any>("POST",  "/attentezero/sites", b),
  updateSite: (id: string, b: any) => req<any>("PATCH", `/attentezero/sites/${id}`, b),

  // Staff
  getStaff:        ()                           => req<any[]>("GET",   "/attentezero/staff"),
  updateStaffStatus: (id: string, status: string) => req<any>("PATCH", `/attentezero/staff/${id}/status`, { status }),

  // Queues + Tickets
  getQueues:   (siteId?: string) => req<any[]>("GET",   `/attentezero/queues${siteId ? `?site_id=${siteId}` : ""}`),
  getTickets:  (params?: { site_id?: string; queue_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.site_id)  q.set("site_id",  params.site_id);
    if (params?.queue_id) q.set("queue_id", params.queue_id);
    if (params?.status)   q.set("status",   params.status);
    const qs = q.toString();
    return req<any[]>("GET", `/attentezero/tickets${qs ? `?${qs}` : ""}`);
  },
  createTicket: (b: any)         => req<any>("POST",  "/attentezero/tickets", b),
  callTicket:   (id: string, guichet: string) => req<any>("PATCH", `/attentezero/tickets/${id}/call`, { guichet }),
  serveTicket:  (id: string)     => req<any>("PATCH", `/attentezero/tickets/${id}/serve`, {}),
  deleteTicket: (id: string)     => req<any>("DELETE", `/attentezero/tickets/${id}`),

  // Appointments
  getAppointments: (params?: { status?: string; site_id?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.status)  q.set("status",   params.status);
    if (params?.site_id) q.set("site_id",  params.site_id);
    if (params?.date)    q.set("date",     params.date);
    const qs = q.toString();
    return req<any[]>("GET", `/attentezero/appointments${qs ? `?${qs}` : ""}`);
  },
  createAppointment: (b: any)          => req<any>("POST",  "/attentezero/appointments", b),
  updateAppointment: (id: string, b: any) => req<any>("PATCH", `/attentezero/appointments/${id}`, b),

  // CRM
  getCrmClients:    (q?: string)        => req<any[]>("GET",   `/attentezero/crm${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createCrmClient:  (b: any)           => req<any>("POST",  "/attentezero/crm", b),
  updateCrmClient:  (id: string, b: any) => req<any>("PATCH", `/attentezero/crm/${id}`, b),

  // Analytics
  getAnalytics: () => req<any>("GET", "/attentezero/analytics/summary"),
};

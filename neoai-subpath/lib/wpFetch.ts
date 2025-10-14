// neoai-subpath/lib/wpFetch.ts
const WP_BASE = "https://neorejuvenai.com";

export async function wpFetch(path: string, init: RequestInit = {}) {
  const token = (typeof window !== "undefined")
    ? localStorage.getItem("neoai_sso")
    : null;

  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${WP_BASE}${path}`, {
    ...init,
    headers,
    // Importante: SIN credentials: 'include' (no usamos cookies de terceros)
  });

  return res;
}

export type SessionResp = {
  authenticated: boolean;
  user?: { id: number; email: string; name: string; roles: string[] };
  rcp_active?: boolean;
  rcp_access_level?: number;
};

export type LimitsResp = {
  active: boolean;
  access_level: number;
  max_plans: number;
  current_count: number;
  can_create: boolean;
  reason: "" | "limit_reached" | "membership_inactive";
};

export async function getSession(): Promise<SessionResp> {
  const r = await wpFetch("/wp-json/neoai/v1/session");
  return r.json();
}

export async function getLimits(): Promise<LimitsResp> {
  const r = await wpFetch("/wp-json/neoai/v1/limits");
  if (r.status === 401) {
    // token caducado o no presente
    return {
      active: false,
      access_level: 0,
      max_plans: 0,
      current_count: 0,
      can_create: false,
      reason: "membership_inactive",
    };
  }
  return r.json();
}

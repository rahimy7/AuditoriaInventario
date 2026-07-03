import type {
  AppState,
  Audit,
  AuditStatus,
  CountItem,
  DashboardMetrics,
  Locality,
  Product,
  StorageLocation,
  User,
  Warehouse,
} from "./types";

// Configure with EXPO_PUBLIC_API_URL. On a physical device set it to the dev
// machine's LAN IP (e.g. http://192.168.1.20:5055/api); localhost works for the
// iOS simulator and Expo web.
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5055/api").replace(/\/$/, "");

let token: string | null = null;
export function setApiToken(t: string | null) {
  token = t;
}

/** Resolve a stored image path to a full URL (server photos live at /uploads on the API origin). */
export function assetUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  return BASE.replace(/\/api$/, "") + path;
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface RNFile {
  uri: string;
  name: string;
  type: string;
}

export const api = {
  base: BASE,

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/healthz`);
      return res.ok;
    } catch {
      return false;
    }
  },

  login: (email: string, password: string) =>
    req<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getState: () => req<AppState>("/state"),
  getMetrics: () => req<DashboardMetrics>("/metrics"),

  createProduct: (data: Omit<Product, "id">) => req<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, patch: Partial<Omit<Product, "id">>) =>
    req<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteProduct: (id: string) => req<void>(`/products/${id}`, { method: "DELETE" }),
  uploadProductPhoto: (id: string, file: RNFile) => {
    const form = new FormData();
    // React Native FormData accepts a { uri, name, type } object for files.
    form.append("photo", file as unknown as Blob);
    return fetch(`${BASE}/products/${id}/photo`, {
      method: "POST",
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Product;
    });
  },

  createAudit: (input: {
    name: string;
    warehouse: string;
    location: string;
    supervisorId: string;
    assignedTo: string[];
    lines: string[];
    categories: string[];
    blindForAuxiliar: boolean;
    blindForSupervisor: boolean;
    productIds: string[];
  }) => req<Audit>("/audits", { method: "POST", body: JSON.stringify(input) }),
  updateAudit: (id: string, patch: Partial<Omit<Audit, "id">>) =>
    req<Audit>(`/audits/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  setAuditStatus: (id: string, status: AuditStatus) =>
    req<Audit>(`/audits/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  assignUsers: (id: string, userIds: string[]) =>
    req<Audit>(`/audits/${id}/assign`, { method: "POST", body: JSON.stringify({ userIds }) }),
  closeAudit: (id: string) => req<Audit>(`/audits/${id}/close`, { method: "POST" }),
  approveAll: (id: string) => req<Audit>(`/audits/${id}/approve-all`, { method: "POST" }),
  deleteAudit: (id: string) => req<void>(`/audits/${id}`, { method: "DELETE" }),
  addItems: (auditId: string, productIds: string[], location: string, assignedTo: string) =>
    req<CountItem[]>(`/audits/${auditId}/items`, { method: "POST", body: JSON.stringify({ productIds, location, assignedTo }) }),

  saveCount: (id: string, countedQty: number, notes: string, photos: string[]) =>
    req<CountItem>(`/count-items/${id}`, { method: "PATCH", body: JSON.stringify({ countedQty, notes, photos }) }),
  submitCount: (id: string) => req<CountItem>(`/count-items/${id}/submit`, { method: "POST" }),
  reviewItem: (id: string, action: "approve" | "return", notes: string) =>
    req<CountItem>(`/count-items/${id}/review`, { method: "POST", body: JSON.stringify({ action, notes }) }),
  reassignItems: (itemIds: string[], userId: string) =>
    req<void>("/count-items/reassign", { method: "POST", body: JSON.stringify({ itemIds, userId }) }),
  submitAll: (auditId: string, userId?: string) =>
    req<CountItem[]>("/count-items/submit-all", { method: "POST", body: JSON.stringify({ auditId, userId }) }),
  removeItem: (id: string) => req<void>(`/count-items/${id}`, { method: "DELETE" }),

  createLocality: (data: Omit<Locality, "id">) => req<Locality>("/localities", { method: "POST", body: JSON.stringify(data) }),
  updateLocality: (id: string, patch: Partial<Omit<Locality, "id">>) =>
    req<Locality>(`/localities/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteLocality: (id: string) => req<void>(`/localities/${id}`, { method: "DELETE" }),
  createWarehouse: (data: Omit<Warehouse, "id">) => req<Warehouse>("/warehouses", { method: "POST", body: JSON.stringify(data) }),
  updateWarehouse: (id: string, patch: Partial<Omit<Warehouse, "id">>) =>
    req<Warehouse>(`/warehouses/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteWarehouse: (id: string) => req<void>(`/warehouses/${id}`, { method: "DELETE" }),
  createStorageLocation: (data: Omit<StorageLocation, "id">) =>
    req<StorageLocation>("/storage-locations", { method: "POST", body: JSON.stringify(data) }),
  updateStorageLocation: (id: string, patch: Partial<Omit<StorageLocation, "id">>) =>
    req<StorageLocation>(`/storage-locations/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteStorageLocation: (id: string) => req<void>(`/storage-locations/${id}`, { method: "DELETE" }),
};

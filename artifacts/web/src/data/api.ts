import type {
  ActivityEntry,
  Audit,
  AuditStatus,
  CountItem,
  CreateAuditInput,
  DashboardMetrics,
  ImportResult,
  Locality,
  Product,
  ProductImportMode,
  ProductImportRow,
  StorageLocation,
  StoredUser,
  User,
  Warehouse,
} from "./types";

// Base URL of the API. Configure with VITE_API_URL; defaults to a same-origin `/api`
// (works when the web app is served behind the same host/proxy as the server).
const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
const TOKEN_KEY = "ic_web_token";

let token: string | null = null;
try {
  token = localStorage.getItem(TOKEN_KEY);
} catch {
  /* ignore */
}

// Resolve a stored image path to a displayable URL. Server photos are served at
// `/uploads/...` on the API origin (not under /api); offline photos are data URLs.
export function assetUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  const origin = BASE.replace(/\/api$/, "");
  return origin + path;
}

export function setToken(t: string | null) {
  token = t;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
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

export interface AppState {
  users: User[];
  products: Product[];
  audits: Audit[];
  countItems: CountItem[];
  activity: ActivityEntry[];
  localities: Locality[];
  warehouses: Warehouse[];
  storageLocations: StorageLocation[];
}

type UserInput = Omit<StoredUser, "id">;
type LocalityInput = Omit<Locality, "id">;
type WarehouseInput = Omit<Warehouse, "id">;
type StorageLocationInput = Omit<StorageLocation, "id">;

// Multipart upload — bypasses req() which forces a JSON content-type.
async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  return (await res.json()) as T;
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

  createUser: (data: UserInput) => req<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, patch: Partial<UserInput>) => req<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteUser: (id: string) => req<void>(`/users/${id}`, { method: "DELETE" }),

  createProduct: (data: Omit<Product, "id">) => req<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, patch: Partial<Omit<Product, "id">>) => req<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteProduct: (id: string) => req<void>(`/products/${id}`, { method: "DELETE" }),
  bulkProducts: (mode: ProductImportMode, rows: ProductImportRow[]) =>
    req<ImportResult>("/products/bulk", { method: "POST", body: JSON.stringify({ mode, rows }) }),
  uploadProductPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return upload<Product>(`/products/${id}/photo`, form);
  },

  createLocality: (data: LocalityInput) => req<Locality>("/localities", { method: "POST", body: JSON.stringify(data) }),
  updateLocality: (id: string, patch: Partial<LocalityInput>) => req<Locality>(`/localities/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteLocality: (id: string) => req<void>(`/localities/${id}`, { method: "DELETE" }),
  createWarehouse: (data: WarehouseInput) => req<Warehouse>("/warehouses", { method: "POST", body: JSON.stringify(data) }),
  updateWarehouse: (id: string, patch: Partial<WarehouseInput>) => req<Warehouse>(`/warehouses/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteWarehouse: (id: string) => req<void>(`/warehouses/${id}`, { method: "DELETE" }),
  createStorageLocation: (data: StorageLocationInput) => req<StorageLocation>("/storage-locations", { method: "POST", body: JSON.stringify(data) }),
  updateStorageLocation: (id: string, patch: Partial<StorageLocationInput>) => req<StorageLocation>(`/storage-locations/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteStorageLocation: (id: string) => req<void>(`/storage-locations/${id}`, { method: "DELETE" }),

  getMetrics: () => req<DashboardMetrics>("/metrics"),

  createAudit: (input: CreateAuditInput) => req<Audit>("/audits", { method: "POST", body: JSON.stringify(input) }),
  updateAudit: (id: string, patch: Partial<Omit<Audit, "id">>) => req<Audit>(`/audits/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  setAuditStatus: (id: string, status: AuditStatus) => req<Audit>(`/audits/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  assignUsers: (id: string, userIds: string[]) => req<Audit>(`/audits/${id}/assign`, { method: "POST", body: JSON.stringify({ userIds }) }),
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
};

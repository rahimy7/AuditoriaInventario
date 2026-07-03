import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  ActivityEntry,
  Audit,
  AuditStatus,
  CountItem,
  CountStatus,
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
import {
  SEED_AUDITS,
  SEED_LOCALITIES,
  SEED_PRODUCTS,
  SEED_STORAGE_LOCATIONS,
  SEED_USERS,
  SEED_WAREHOUSES,
  buildSeedCountItems,
} from "./seed";
import { computeMetrics } from "@/lib/metrics";
import { api, setToken, type AppState } from "./api";

const VERSION = "2";
const K = {
  users: "ic_web_users",
  products: "ic_web_products",
  audits: "ic_web_audits",
  items: "ic_web_items",
  activity: "ic_web_activity",
  localities: "ic_web_localities",
  warehouses: "ic_web_warehouses",
  storageLocations: "ic_web_storage_locations",
  session: "ic_web_session",
  version: "ic_web_version",
};

if (typeof localStorage !== "undefined" && localStorage.getItem(K.version) !== VERSION) {
  [K.users, K.products, K.audits, K.items, K.activity, K.localities, K.warehouses, K.storageLocations, K.session].forEach(
    (k) => localStorage.removeItem(k),
  );
  localStorage.setItem(K.version, VERSION);
}

function loadOrSeed<T>(key: string, seed: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  const val = seed();
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
  return val;
}

function usePersistentState<T>(key: string, seed: () => T) {
  const [state, setState] = useState<T>(() => loadOrSeed(key, seed));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);
  return [state, setState] as const;
}

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

const stripUser = ({ password: _pw, ...u }: StoredUser): User => u;
function stripPatch(patch: Partial<Omit<StoredUser, "id">>): Partial<User> {
  const { password: _pw, ...rest } = patch;
  return rest;
}

function seedActivity(): ActivityEntry[] {
  return [
    { id: "act-1", timestamp: "2026-06-30T06:00:00Z", userId: "u5", userName: "Ana Martínez", action: "creó la auditoría", entity: "audit", entityId: "a5", detail: "Conteo Zona Jardín - Almacén Norte" },
    { id: "act-2", timestamp: "2026-06-29T14:00:00Z", userId: "u1", userName: "María García", action: "envió conteos", entity: "audit", entityId: "a2", detail: "Inventario Materiales Construcción" },
    { id: "act-3", timestamp: "2026-06-28T10:30:00Z", userId: "u1", userName: "María García", action: "registró conteos", entity: "audit", entityId: "a1", detail: "Conteo Almacén Central - Herramientas" },
    { id: "act-4", timestamp: "2026-06-22T16:00:00Z", userId: "u3", userName: "Carlos López", action: "aprobó la auditoría", entity: "audit", entityId: "a4", detail: "Pinturas y Acabados Q2" },
  ];
}

export interface StoreValue {
  online: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  users: User[];
  products: Product[];
  audits: Audit[];
  countItems: CountItem[];
  activity: ActivityEntry[];
  localities: Locality[];
  warehouses: Warehouse[];
  storageLocations: StorageLocation[];

  getUserById: (id: string) => User | undefined;
  getAudit: (id: string) => Audit | undefined;
  getAuditItems: (auditId: string) => CountItem[];
  getUserAudits: (userId: string) => Audit[];
  getSupervisorAudits: (supervisorId: string) => Audit[];
  searchProducts: (query: string) => Product[];

  createAudit: (input: CreateAuditInput) => Promise<Audit>;
  updateAudit: (id: string, patch: Partial<Omit<Audit, "id">>) => Promise<void>;
  updateAuditStatus: (id: string, status: AuditStatus) => Promise<void>;
  assignUsers: (auditId: string, userIds: string[]) => Promise<void>;
  closeAudit: (id: string) => Promise<void>;
  deleteAudit: (id: string) => Promise<void>;

  addCountItems: (auditId: string, productIds: string[], location: string, assignedTo: string) => Promise<void>;
  removeCountItem: (itemId: string) => Promise<void>;
  reassignItems: (itemIds: string[], userId: string) => Promise<void>;
  saveCount: (itemId: string, qty: number, notes: string, photos: string[]) => Promise<void>;
  submitCount: (itemId: string) => Promise<void>;
  submitAllForAudit: (auditId: string, userId?: string) => Promise<void>;
  reviewItem: (itemId: string, action: "approve" | "return", notes: string) => Promise<void>;
  approveAll: (auditId: string) => Promise<void>;

  createProduct: (data: Omit<Product, "id">) => Promise<Product>;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id">>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  bulkImportProducts: (mode: ProductImportMode, rows: ProductImportRow[]) => Promise<ImportResult>;
  uploadProductPhoto: (id: string, file: File) => Promise<void>;

  createLocality: (data: Omit<Locality, "id">) => Promise<void>;
  updateLocality: (id: string, patch: Partial<Omit<Locality, "id">>) => Promise<void>;
  deleteLocality: (id: string) => Promise<void>;
  createWarehouse: (data: Omit<Warehouse, "id">) => Promise<void>;
  updateWarehouse: (id: string, patch: Partial<Omit<Warehouse, "id">>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  createStorageLocation: (data: Omit<StorageLocation, "id">) => Promise<void>;
  updateStorageLocation: (id: string, patch: Partial<Omit<StorageLocation, "id">>) => Promise<void>;
  deleteStorageLocation: (id: string) => Promise<void>;

  getMetrics: () => Promise<DashboardMetrics>;

  createUser: (data: Omit<StoredUser, "id">) => Promise<void>;
  updateUser: (id: string, patch: Partial<Omit<StoredUser, "id">>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  resetData: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

// Selectors shared by both providers.
function makeSelectors(users: User[], products: Product[], audits: Audit[], countItems: CountItem[]) {
  return {
    getUserById: (id: string) => users.find((u) => u.id === id),
    getAudit: (id: string) => audits.find((a) => a.id === id),
    getAuditItems: (auditId: string) => countItems.filter((i) => i.auditId === auditId),
    getUserAudits: (userId: string) => audits.filter((a) => a.assignedTo.includes(userId)),
    getSupervisorAudits: (supervisorId: string) => audits.filter((a) => a.supervisorId === supervisorId),
    searchProducts: (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return products;
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.line.toLowerCase().includes(q),
      );
    },
  };
}

// ===========================================================================
// API-backed provider (source of truth = server). Mutations call the API and
// re-hydrate the whole state so server-side status/progress transitions apply.
// ===========================================================================
function ApiStoreProvider({ initial, children }: { initial: AppState; children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial);
  const [session, setSession] = usePersistentState<User | null>(K.session, () => null);

  const refresh = useCallback(async () => {
    const s = await api.getState();
    setState(s);
  }, []);

  const wrap = useCallback(
    async (fn: () => Promise<unknown>) => {
      await fn();
      await refresh();
    },
    [refresh],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const { token, user } = await api.login(email, password);
        setToken(token);
        setSession(user);
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh, setSession],
  );

  const logout = useCallback(() => {
    setToken(null);
    setSession(null);
  }, [setSession]);

  const selectors = useMemo(
    () => makeSelectors(state.users, state.products, state.audits, state.countItems),
    [state],
  );

  const value: StoreValue = {
    online: true,
    user: session,
    login,
    logout,
    users: state.users,
    products: state.products,
    audits: state.audits,
    countItems: state.countItems,
    activity: state.activity,
    localities: state.localities,
    warehouses: state.warehouses,
    storageLocations: state.storageLocations,
    ...selectors,
    createAudit: async (input) => {
      const audit = await api.createAudit(input);
      await refresh();
      return audit;
    },
    updateAudit: (id, patch) => wrap(() => api.updateAudit(id, patch)),
    updateAuditStatus: (id, status) => wrap(() => api.setAuditStatus(id, status)),
    assignUsers: (auditId, userIds) => wrap(() => api.assignUsers(auditId, userIds)),
    closeAudit: (id) => wrap(() => api.closeAudit(id)),
    deleteAudit: (id) => wrap(() => api.deleteAudit(id)),
    addCountItems: (auditId, productIds, location, assignedTo) => wrap(() => api.addItems(auditId, productIds, location, assignedTo)),
    removeCountItem: (itemId) => wrap(() => api.removeItem(itemId)),
    reassignItems: (itemIds, userId) => wrap(() => api.reassignItems(itemIds, userId)),
    saveCount: (itemId, qty, notes, photos) => wrap(() => api.saveCount(itemId, qty, notes, photos)),
    submitCount: (itemId) => wrap(() => api.submitCount(itemId)),
    submitAllForAudit: (auditId, userId) => wrap(() => api.submitAll(auditId, userId)),
    reviewItem: (itemId, action, notes) => wrap(() => api.reviewItem(itemId, action, notes)),
    approveAll: (auditId) => wrap(() => api.approveAll(auditId)),
    createProduct: async (data) => {
      const p = await api.createProduct(data);
      await refresh();
      return p;
    },
    updateProduct: (id, patch) => wrap(() => api.updateProduct(id, patch)),
    deleteProduct: (id) => wrap(() => api.deleteProduct(id)),
    bulkImportProducts: async (mode, rows) => {
      const result = await api.bulkProducts(mode, rows);
      await refresh();
      return result;
    },
    uploadProductPhoto: async (id, file) => {
      await api.uploadProductPhoto(id, file);
      await refresh();
    },
    createLocality: (data) => wrap(() => api.createLocality(data)),
    updateLocality: (id, patch) => wrap(() => api.updateLocality(id, patch)),
    deleteLocality: (id) => wrap(() => api.deleteLocality(id)),
    createWarehouse: (data) => wrap(() => api.createWarehouse(data)),
    updateWarehouse: (id, patch) => wrap(() => api.updateWarehouse(id, patch)),
    deleteWarehouse: (id) => wrap(() => api.deleteWarehouse(id)),
    createStorageLocation: (data) => wrap(() => api.createStorageLocation(data)),
    updateStorageLocation: (id, patch) => wrap(() => api.updateStorageLocation(id, patch)),
    deleteStorageLocation: (id) => wrap(() => api.deleteStorageLocation(id)),
    getMetrics: () => api.getMetrics(),
    createUser: (data) => wrap(() => api.createUser(data)),
    updateUser: async (id, patch) => {
      await api.updateUser(id, patch);
      setSession((s) => (s && s.id === id ? { ...s, ...stripPatch(patch) } : s));
      await refresh();
    },
    deleteUser: (id) => wrap(() => api.deleteUser(id)),
    resetData: () => refresh(),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// ===========================================================================
// Offline provider (localStorage). Used when the API is unreachable so the
// console still runs as a self-contained demo with seed data.
// ===========================================================================
function LocalStoreProvider({ children }: { children: React.ReactNode }) {
  const [storedUsers, setStoredUsers] = usePersistentState<StoredUser[]>(K.users, () => SEED_USERS);
  const [products, setProducts] = usePersistentState<Product[]>(K.products, () => SEED_PRODUCTS);
  const [audits, setAudits] = usePersistentState<Audit[]>(K.audits, () => SEED_AUDITS);
  const [countItems, setCountItems] = usePersistentState<CountItem[]>(K.items, buildSeedCountItems);
  const [activity, setActivity] = usePersistentState<ActivityEntry[]>(K.activity, seedActivity);
  const [localities, setLocalities] = usePersistentState<Locality[]>(K.localities, () => SEED_LOCALITIES);
  const [warehouses, setWarehouses] = usePersistentState<Warehouse[]>(K.warehouses, () => SEED_WAREHOUSES);
  const [storageLocations, setStorageLocations] = usePersistentState<StorageLocation[]>(
    K.storageLocations,
    () => SEED_STORAGE_LOCATIONS,
  );
  const [session, setSession] = usePersistentState<User | null>(K.session, () => null);

  const users = useMemo(() => storedUsers.map(stripUser), [storedUsers]);

  const log = useCallback(
    (action: string, entity: ActivityEntry["entity"], entityId: string, detail: string) => {
      const actor = session;
      const entry: ActivityEntry = {
        id: uid("act"),
        timestamp: new Date().toISOString(),
        userId: actor?.id ?? "system",
        userName: actor?.name ?? "Sistema",
        action,
        entity,
        entityId,
        detail,
      };
      setActivity((prev) => [entry, ...prev].slice(0, 500));
    },
    [session, setActivity],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const found = storedUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.active,
      );
      if (!found) return false;
      setSession(stripUser(found));
      return true;
    },
    [storedUsers, setSession],
  );

  const logout = useCallback(() => setSession(null), [setSession]);

  const recompute = useCallback((auditId: string, items: CountItem[]): number => {
    const list = items.filter((i) => i.auditId === auditId);
    if (list.length === 0) return 0;
    const counted = list.filter((i) => i.countedQty !== null).length;
    return Math.round((counted / list.length) * 100);
  }, []);

  useEffect(() => {
    setAudits((prev) => {
      let changed = false;
      const next = prev.map((a) => {
        const p = recompute(a.id, countItems);
        if (p === a.progress) return a;
        changed = true;
        return { ...a, progress: p };
      });
      return changed ? next : prev;
    });
  }, [countItems, recompute, setAudits]);

  const touch = useCallback(
    (id: string, patch: Partial<Audit>) => {
      setAudits((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a)));
    },
    [setAudits],
  );

  const createAudit = useCallback(
    async (input: CreateAuditInput): Promise<Audit> => {
      const now = new Date().toISOString();
      const newAudit: Audit = {
        id: uid("a"),
        name: input.name,
        warehouse: input.warehouse,
        location: input.location,
        status: input.assignedTo.length > 0 ? "asignado" : "creado",
        assignedTo: input.assignedTo,
        supervisorId: input.supervisorId,
        createdBy: session?.id ?? "u5",
        createdAt: now,
        updatedAt: now,
        lines: input.lines,
        categories: input.categories,
        progress: 0,
        blindForAuxiliar: input.blindForAuxiliar,
        blindForSupervisor: input.blindForSupervisor,
      };
      setAudits((prev) => [newAudit, ...prev]);
      if (input.productIds.length > 0) {
        const chosen = products.filter((p) => input.productIds.includes(p.id));
        const assignees = input.assignedTo.length > 0 ? input.assignedTo : [""];
        const newItems: CountItem[] = chosen.map((p, i) => ({
          id: uid("ci"),
          auditId: newAudit.id,
          productId: p.id,
          product: p,
          assignedTo: assignees[i % assignees.length] ?? "",
          location: input.location || "Sin ubicación",
          systemQty: p.systemStock,
          countedQty: null,
          notes: "",
          photos: [],
          status: "pendiente",
        }));
        setCountItems((prev) => [...prev, ...newItems]);
      }
      log("creó la auditoría", "audit", newAudit.id, newAudit.name);
      return newAudit;
    },
    [products, session, setAudits, setCountItems, log],
  );

  const updateAudit = useCallback(
    async (id: string, patch: Partial<Omit<Audit, "id">>) => {
      touch(id, patch);
      log("editó la auditoría", "audit", id, audits.find((a) => a.id === id)?.name ?? "");
    },
    [touch, log, audits],
  );

  const updateAuditStatus = useCallback(
    async (id: string, status: AuditStatus) => {
      touch(id, { status });
      log(`cambió el estado a ${status}`, "audit", id, audits.find((a) => a.id === id)?.name ?? "");
    },
    [touch, log, audits],
  );

  const assignUsers = useCallback(
    async (auditId: string, userIds: string[]) => {
      touch(auditId, { assignedTo: userIds, status: userIds.length > 0 ? "asignado" : "creado" });
      if (userIds.length > 0) {
        setCountItems((prev) => {
          let n = 0;
          return prev.map((i) => {
            if (i.auditId !== auditId) return i;
            const to = userIds[n % userIds.length]!;
            n += 1;
            return { ...i, assignedTo: to };
          });
        });
      }
      log("asignó auxiliares", "audit", auditId, `${userIds.length} usuario(s)`);
    },
    [touch, setCountItems, log],
  );

  const closeAudit = useCallback(
    async (id: string) => {
      touch(id, { status: "cerrado" });
      log("cerró la auditoría", "audit", id, audits.find((a) => a.id === id)?.name ?? "");
    },
    [touch, log, audits],
  );

  const deleteAudit = useCallback(
    async (id: string) => {
      const name = audits.find((a) => a.id === id)?.name ?? "";
      setAudits((prev) => prev.filter((a) => a.id !== id));
      setCountItems((prev) => prev.filter((i) => i.auditId !== id));
      log("eliminó la auditoría", "audit", id, name);
    },
    [setAudits, setCountItems, log, audits],
  );

  const addCountItems = useCallback(
    async (auditId: string, productIds: string[], location: string, assignedTo: string) => {
      const chosen = products.filter((p) => productIds.includes(p.id));
      const newItems: CountItem[] = chosen.map((p) => ({
        id: uid("ci"),
        auditId,
        productId: p.id,
        product: p,
        assignedTo,
        location: location || "Sin ubicación",
        systemQty: p.systemStock,
        countedQty: null,
        notes: "",
        photos: [],
        status: "pendiente",
      }));
      setCountItems((prev) => [...prev, ...newItems]);
      log("agregó productos al conteo", "audit", auditId, `${chosen.length} ítem(s)`);
    },
    [products, setCountItems, log],
  );

  const removeCountItem = useCallback(
    async (itemId: string) => {
      setCountItems((prev) => prev.filter((i) => i.id !== itemId));
    },
    [setCountItems],
  );

  const reassignItems = useCallback(
    async (itemIds: string[], userId: string) => {
      setCountItems((prev) => prev.map((i) => (itemIds.includes(i.id) ? { ...i, assignedTo: userId } : i)));
      log("reasignó ítems", "count", itemIds[0] ?? "", `${itemIds.length} ítem(s)`);
    },
    [setCountItems, log],
  );

  const saveCount = useCallback(
    async (itemId: string, qty: number, notes: string, photos: string[]) => {
      const target = countItems.find((i) => i.id === itemId);
      setCountItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, countedQty: qty, notes, photos, status: "contado" as CountStatus, countedAt: new Date().toISOString() }
            : i,
        ),
      );
      if (target) {
        setAudits((prev) =>
          prev.map((x) => (x.id === target.auditId && x.status === "asignado" ? { ...x, status: "en_proceso", updatedAt: new Date().toISOString() } : x)),
        );
      }
    },
    [countItems, setCountItems, setAudits],
  );

  const submitCount = useCallback(
    async (itemId: string) => {
      const next = countItems.map((i) => (i.id === itemId ? { ...i, status: "enviado" as CountStatus } : i));
      setCountItems(next);
      const target = next.find((i) => i.id === itemId);
      if (target) {
        const list = next.filter((i) => i.auditId === target.auditId);
        if (list.every((i) => i.status === "enviado" || i.status === "aprobado")) {
          setAudits((prev) =>
            prev.map((x) =>
              x.id === target.auditId && (x.status === "en_proceso" || x.status === "asignado")
                ? { ...x, status: "enviado", updatedAt: new Date().toISOString() }
                : x,
            ),
          );
        }
      }
      log("envió un conteo", "count", itemId, "");
    },
    [countItems, setCountItems, setAudits, log],
  );

  const submitAllForAudit = useCallback(
    async (auditId: string, userId?: string) => {
      const next = countItems.map((i) =>
        i.auditId === auditId && i.status === "contado" && (!userId || i.assignedTo === userId)
          ? { ...i, status: "enviado" as CountStatus }
          : i,
      );
      setCountItems(next);
      const list = next.filter((i) => i.auditId === auditId);
      if (list.length > 0 && list.every((i) => i.status === "enviado" || i.status === "aprobado")) {
        setAudits((prev) => prev.map((x) => (x.id === auditId ? { ...x, status: "enviado", updatedAt: new Date().toISOString() } : x)));
      }
      log("envió todos los conteos", "audit", auditId, "");
    },
    [countItems, setCountItems, setAudits, log],
  );

  const reviewItem = useCallback(
    async (itemId: string, action: "approve" | "return", notes: string) => {
      const status: CountStatus = action === "approve" ? "aprobado" : "devuelto";
      setCountItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status, reviewNotes: notes } : i)));
      const target = countItems.find((i) => i.id === itemId);
      if (target && action === "return") touch(target.auditId, { status: "devuelto" });
      log(action === "approve" ? "aprobó un conteo" : "devolvió un conteo", "count", itemId, notes);
    },
    [setCountItems, countItems, touch, log],
  );

  const approveAll = useCallback(
    async (auditId: string) => {
      setCountItems((prev) =>
        prev.map((i) => (i.auditId === auditId && i.status === "enviado" ? { ...i, status: "aprobado" as CountStatus, reviewNotes: "Aprobado en revisión masiva" } : i)),
      );
      touch(auditId, { status: "aprobado" });
      log("aprobó todos los conteos", "audit", auditId, "");
    },
    [setCountItems, touch, log],
  );

  const createProduct = useCallback(
    async (data: Omit<Product, "id">): Promise<Product> => {
      const p: Product = { ...data, id: uid("p") };
      setProducts((prev) => [p, ...prev]);
      log("creó un producto", "product", p.id, p.name);
      return p;
    },
    [setProducts, log],
  );

  const updateProduct = useCallback(
    async (id: string, patch: Partial<Omit<Product, "id">>) => {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      setCountItems((prev) => prev.map((i) => (i.productId === id ? { ...i, product: { ...i.product, ...patch } } : i)));
      log("editó un producto", "product", id, patch.name ?? "");
    },
    [setProducts, setCountItems, log],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const name = products.find((p) => p.id === id)?.name ?? "";
      setProducts((prev) => prev.filter((p) => p.id !== id));
      log("eliminó un producto", "product", id, name);
    },
    [setProducts, log, products],
  );

  const bulkImportProducts = useCallback(
    async (mode: ProductImportMode, rows: ProductImportRow[]): Promise<ImportResult> => {
      const next = [...products];
      const byCode = new Map(next.map((p, idx) => [p.code.toUpperCase(), idx] as const));
      let created = 0;
      let updated = 0;
      const errors: ImportResult["errors"] = [];

      rows.forEach((r, i) => {
        const code = String(r.code ?? "").trim();
        if (!code) {
          errors.push({ row: i + 1, code: "", message: "Código vacío." });
          return;
        }
        const idx = byCode.get(code.toUpperCase());
        if (mode === "stock") {
          if (idx === undefined) {
            errors.push({ row: i + 1, code, message: "Código no encontrado." });
            return;
          }
          if (r.systemStock === undefined || Number.isNaN(Number(r.systemStock))) {
            errors.push({ row: i + 1, code, message: "Stock inválido." });
            return;
          }
          next[idx] = { ...next[idx]!, systemStock: Number(r.systemStock) };
          updated++;
          return;
        }
        if (idx !== undefined) {
          const cur = next[idx]!;
          next[idx] = {
            ...cur,
            name: r.name !== undefined ? String(r.name) : cur.name,
            category: r.category !== undefined ? String(r.category) : cur.category,
            line: r.line !== undefined ? String(r.line) : cur.line,
            unit: r.unit !== undefined ? String(r.unit) : cur.unit,
            systemStock: r.systemStock !== undefined ? Number(r.systemStock) || 0 : cur.systemStock,
            active: r.active !== undefined ? Boolean(r.active) : cur.active,
          };
          updated++;
        } else {
          if (!r.name) {
            errors.push({ row: i + 1, code, message: "Falta el nombre para crear el producto." });
            return;
          }
          const p: Product = {
            id: uid("p"),
            code,
            name: String(r.name),
            category: r.category ? String(r.category) : "",
            line: r.line ? String(r.line) : "",
            unit: r.unit ? String(r.unit) : "PZA",
            systemStock: Number(r.systemStock) || 0,
            active: r.active === undefined ? true : Boolean(r.active),
          };
          next.push(p);
          byCode.set(code.toUpperCase(), next.length - 1);
          created++;
        }
      });

      setProducts(next);
      log("importó productos", "product", "bulk", `${created} creados, ${updated} actualizados`);
      return { created, updated, errors };
    },
    [products, setProducts, log],
  );

  const uploadProductPhoto = useCallback(
    async (id: string, file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
        reader.readAsDataURL(file);
      });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, imageUrl: dataUrl } : p)));
      setCountItems((prev) =>
        prev.map((it) => (it.productId === id ? { ...it, product: { ...it.product, imageUrl: dataUrl } } : it)),
      );
    },
    [setProducts, setCountItems],
  );

  const createLocality = useCallback(
    async (data: Omit<Locality, "id">) => setLocalities((prev) => [...prev, { ...data, id: uid("loc") }]),
    [setLocalities],
  );
  const updateLocality = useCallback(
    async (id: string, patch: Partial<Omit<Locality, "id">>) =>
      setLocalities((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    [setLocalities],
  );
  const deleteLocality = useCallback(
    async (id: string) => {
      const removedWh = warehouses.filter((w) => w.localityId === id).map((w) => w.id);
      setStorageLocations((prev) => prev.filter((s) => !removedWh.includes(s.warehouseId)));
      setWarehouses((prev) => prev.filter((w) => w.localityId !== id));
      setLocalities((prev) => prev.filter((l) => l.id !== id));
    },
    [warehouses, setStorageLocations, setWarehouses, setLocalities],
  );

  const createWarehouse = useCallback(
    async (data: Omit<Warehouse, "id">) => setWarehouses((prev) => [...prev, { ...data, id: uid("wh") }]),
    [setWarehouses],
  );
  const updateWarehouse = useCallback(
    async (id: string, patch: Partial<Omit<Warehouse, "id">>) =>
      setWarehouses((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w))),
    [setWarehouses],
  );
  const deleteWarehouse = useCallback(
    async (id: string) => {
      setStorageLocations((prev) => prev.filter((s) => s.warehouseId !== id));
      setWarehouses((prev) => prev.filter((w) => w.id !== id));
    },
    [setStorageLocations, setWarehouses],
  );

  const createStorageLocation = useCallback(
    async (data: Omit<StorageLocation, "id">) =>
      setStorageLocations((prev) => [...prev, { ...data, id: uid("sl") }]),
    [setStorageLocations],
  );
  const updateStorageLocation = useCallback(
    async (id: string, patch: Partial<Omit<StorageLocation, "id">>) =>
      setStorageLocations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    [setStorageLocations],
  );
  const deleteStorageLocation = useCallback(
    async (id: string) => setStorageLocations((prev) => prev.filter((s) => s.id !== id)),
    [setStorageLocations],
  );

  const getMetrics = useCallback(
    async () => computeMetrics(users, products, audits, countItems),
    [users, products, audits, countItems],
  );

  const createUser = useCallback(
    async (data: Omit<StoredUser, "id">) => {
      const u: StoredUser = { ...data, id: uid("u") };
      setStoredUsers((prev) => [...prev, u]);
      log("creó un usuario", "user", u.id, u.name);
    },
    [setStoredUsers, log],
  );

  const updateUser = useCallback(
    async (id: string, patch: Partial<Omit<StoredUser, "id">>) => {
      setStoredUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      setSession((s) => (s && s.id === id ? { ...s, ...stripPatch(patch) } : s));
      log("editó un usuario", "user", id, patch.name ?? "");
    },
    [setStoredUsers, setSession, log],
  );

  const deleteUser = useCallback(
    async (id: string) => {
      const name = storedUsers.find((u) => u.id === id)?.name ?? "";
      setStoredUsers((prev) => prev.filter((u) => u.id !== id));
      log("eliminó un usuario", "user", id, name);
    },
    [setStoredUsers, log, storedUsers],
  );

  const resetData = useCallback(async () => {
    [K.users, K.products, K.audits, K.items, K.activity, K.localities, K.warehouses, K.storageLocations].forEach((k) =>
      localStorage.removeItem(k),
    );
    setStoredUsers(SEED_USERS);
    setProducts(SEED_PRODUCTS);
    setAudits(SEED_AUDITS);
    setCountItems(buildSeedCountItems());
    setActivity(seedActivity());
    setLocalities(SEED_LOCALITIES);
    setWarehouses(SEED_WAREHOUSES);
    setStorageLocations(SEED_STORAGE_LOCATIONS);
  }, [
    setStoredUsers,
    setProducts,
    setAudits,
    setCountItems,
    setActivity,
    setLocalities,
    setWarehouses,
    setStorageLocations,
  ]);

  const selectors = useMemo(() => makeSelectors(users, products, audits, countItems), [users, products, audits, countItems]);

  const value: StoreValue = {
    online: false,
    user: session,
    login,
    logout,
    users,
    products,
    audits,
    countItems,
    activity,
    localities,
    warehouses,
    storageLocations,
    ...selectors,
    createAudit,
    updateAudit,
    updateAuditStatus,
    assignUsers,
    closeAudit,
    deleteAudit,
    addCountItems,
    removeCountItem,
    reassignItems,
    saveCount,
    submitCount,
    submitAllForAudit,
    reviewItem,
    approveAll,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkImportProducts,
    uploadProductPhoto,
    createLocality,
    updateLocality,
    deleteLocality,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    createStorageLocation,
    updateStorageLocation,
    deleteStorageLocation,
    getMetrics,
    createUser,
    updateUser,
    deleteUser,
    resetData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// ===========================================================================
// Root provider: probes the API once, then mounts the matching implementation.
// ===========================================================================
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"probing" | "online" | "offline">("probing");
  const [initial, setInitial] = useState<AppState | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getState()
      .then((s) => {
        if (!cancelled) {
          setInitial(s);
          setMode("online");
        }
      })
      .catch(() => {
        if (!cancelled) setMode("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "probing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (mode === "online" && initial) {
    return <ApiStoreProvider initial={initial}>{children}</ApiStoreProvider>;
  }

  return <LocalStoreProvider>{children}</LocalStoreProvider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import {
  isBlindForAuxiliar,
  isBlindForSupervisor,
  type AppState,
  type Audit,
  type AuditStatus,
  type CountItem,
  type CountStatus,
  type DashboardMetrics,
  type Locality,
  type Product,
  type StorageLocation,
  type User,
  type Warehouse,
} from "@/lib/types";

// Re-export domain types + helpers so existing screen imports keep working.
export type { Audit, AuditStatus, CountItem, CountStatus, Product, Locality, Warehouse, StorageLocation };
export { isBlindForAuxiliar, isBlindForSupervisor };

interface AuditContextValue {
  audits: Audit[];
  countItems: CountItem[];
  users: User[];
  products: Product[];
  localities: Locality[];
  warehouses: Warehouse[];
  storageLocations: StorageLocation[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  getAudit: (id: string) => Audit | undefined;
  getAuditItems: (auditId: string) => CountItem[];
  getUserAudits: (userId: string) => Audit[];
  getSupervisorAudits: (supervisorId: string) => Audit[];
  searchProducts: (query: string) => Product[];
  getMetrics: () => Promise<DashboardMetrics>;
  createAudit: (data: Omit<Audit, "id" | "createdAt" | "updatedAt" | "progress">) => Promise<Audit>;
  updateAuditStatus: (auditId: string, status: AuditStatus) => Promise<void>;
  assignUsers: (auditId: string, userIds: string[]) => Promise<void>;
  closeAudit: (auditId: string) => Promise<void>;
  deleteAudit: (auditId: string) => Promise<void>;
  saveCount: (itemId: string, qty: number, notes: string, photos: string[]) => Promise<void>;
  submitCount: (itemId: string) => Promise<void>;
  submitAll: (auditId: string, userId?: string) => Promise<void>;
  reviewItem: (itemId: string, action: "approve" | "return", notes: string) => Promise<void>;
  approveAll: (auditId: string) => Promise<void>;
  reassignItems: (itemIds: string[], userId: string) => Promise<void>;
  addCountItem: (auditId: string, product: Product, location: string, assignedTo: string) => Promise<void>;
  addCountItems: (auditId: string, productIds: string[], location: string, assignedTo: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  // location catalog
  createLocality: (data: Omit<Locality, "id">) => Promise<void>;
  updateLocality: (id: string, patch: Partial<Omit<Locality, "id">>) => Promise<void>;
  deleteLocality: (id: string) => Promise<void>;
  createWarehouse: (data: Omit<Warehouse, "id">) => Promise<void>;
  updateWarehouse: (id: string, patch: Partial<Omit<Warehouse, "id">>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  createStorageLocation: (data: Omit<StorageLocation, "id">) => Promise<void>;
  updateStorageLocation: (id: string, patch: Partial<Omit<StorageLocation, "id">>) => Promise<void>;
  deleteStorageLocation: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
}

const AuditContext = createContext<AuditContextValue>({} as AuditContextValue);

const EMPTY_STATE: AppState = {
  users: [],
  products: [],
  audits: [],
  countItems: [],
  activity: [],
  localities: [],
  warehouses: [],
  storageLocations: [],
};

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await api.getState();
      setState(s);
    } catch {
      /* keep previous state on transient errors */
    }
  }, []);

  // (Re)hydrate whenever the authenticated user changes.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState(EMPTY_STATE);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    api
      .getState()
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const wrap = useCallback(
    async (fn: () => Promise<unknown>) => {
      await fn();
      await refresh();
    },
    [refresh],
  );

  const { audits, countItems, users, products, localities, warehouses, storageLocations } = state;

  const getAudit = useCallback((id: string) => audits.find((a) => a.id === id), [audits]);
  const getAuditItems = useCallback((auditId: string) => countItems.filter((i) => i.auditId === auditId), [countItems]);
  const getUserAudits = useCallback((userId: string) => audits.filter((a) => a.assignedTo.includes(userId)), [audits]);
  const getSupervisorAudits = useCallback(
    (supervisorId: string) => audits.filter((a) => a.supervisorId === supervisorId),
    [audits],
  );
  const searchProducts = useCallback(
    (query: string): Product[] => {
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
    [products],
  );

  const createAudit = useCallback(
    async (data: Omit<Audit, "id" | "createdAt" | "updatedAt" | "progress">): Promise<Audit> => {
      const audit = await api.createAudit({
        name: data.name,
        warehouse: data.warehouse,
        location: data.location,
        supervisorId: data.supervisorId,
        assignedTo: data.assignedTo ?? [],
        lines: data.lines ?? [],
        categories: data.categories ?? [],
        blindForAuxiliar: data.blindForAuxiliar ?? false,
        blindForSupervisor: data.blindForSupervisor ?? false,
        productIds: [],
      });
      await refresh();
      return audit;
    },
    [refresh],
  );

  const value: AuditContextValue = useMemo(
    () => ({
      audits,
      countItems,
      users,
      products,
      localities,
      warehouses,
      storageLocations,
      isLoading,
      refresh,
      getAudit,
      getAuditItems,
      getUserAudits,
      getSupervisorAudits,
      searchProducts,
      getMetrics: () => api.getMetrics(),
      createAudit,
      updateAuditStatus: (auditId, status) => wrap(() => api.setAuditStatus(auditId, status)),
      assignUsers: (auditId, userIds) => wrap(() => api.assignUsers(auditId, userIds)),
      closeAudit: (auditId) => wrap(() => api.closeAudit(auditId)),
      deleteAudit: (auditId) => wrap(() => api.deleteAudit(auditId)),
      saveCount: (itemId, qty, notes, photos) => wrap(() => api.saveCount(itemId, qty, notes, photos)),
      submitCount: (itemId) => wrap(() => api.submitCount(itemId)),
      submitAll: (auditId, userId) => wrap(() => api.submitAll(auditId, userId)),
      reviewItem: (itemId, action, notes) => wrap(() => api.reviewItem(itemId, action, notes)),
      approveAll: (auditId) => wrap(() => api.approveAll(auditId)),
      reassignItems: (itemIds, userId) => wrap(() => api.reassignItems(itemIds, userId)),
      addCountItem: (auditId, product, location, assignedTo) =>
        wrap(() => api.addItems(auditId, [product.id], location, assignedTo)),
      addCountItems: (auditId, productIds, location, assignedTo) =>
        wrap(() => api.addItems(auditId, productIds, location, assignedTo)),
      removeItem: (itemId) => wrap(() => api.removeItem(itemId)),
      createLocality: (data) => wrap(() => api.createLocality(data)),
      updateLocality: (id, patch) => wrap(() => api.updateLocality(id, patch)),
      deleteLocality: (id) => wrap(() => api.deleteLocality(id)),
      createWarehouse: (data) => wrap(() => api.createWarehouse(data)),
      updateWarehouse: (id, patch) => wrap(() => api.updateWarehouse(id, patch)),
      deleteWarehouse: (id) => wrap(() => api.deleteWarehouse(id)),
      createStorageLocation: (data) => wrap(() => api.createStorageLocation(data)),
      updateStorageLocation: (id, patch) => wrap(() => api.updateStorageLocation(id, patch)),
      deleteStorageLocation: (id) => wrap(() => api.deleteStorageLocation(id)),
      resetData: () => refresh(),
    }),
    [
      audits,
      countItems,
      users,
      products,
      localities,
      warehouses,
      storageLocations,
      isLoading,
      refresh,
      wrap,
      getAudit,
      getAuditItems,
      getUserAudits,
      getSupervisorAudits,
      searchProducts,
      createAudit,
    ],
  );

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAuditContext() {
  return useContext(AuditContext);
}

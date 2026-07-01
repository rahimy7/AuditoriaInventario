import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ALL_USERS, type User } from "./AuthContext";

export type AuditStatus =
  | "creado" | "asignado" | "en_proceso" | "enviado"
  | "en_revision" | "devuelto" | "aprobado" | "cerrado";

export type CountStatus = "pendiente" | "contado" | "enviado" | "aprobado" | "devuelto";

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  line: string;
  unit: string;
  systemStock: number;
}

export interface CountItem {
  id: string;
  auditId: string;
  productId: string;
  product: Product;
  assignedTo: string;
  location: string;
  systemQty: number;
  countedQty: number | null;
  notes: string;
  photos: string[];
  status: CountStatus;
  countedAt?: string;
  reviewNotes?: string;
}

export interface Audit {
  id: string;
  name: string;
  warehouse: string;
  location: string;
  status: AuditStatus;
  assignedTo: string[];
  supervisorId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: string[];
  categories: string[];
  progress: number;
}

export interface HistoryEntry {
  id: string;
  auditId: string;
  userId: string;
  action: string;
  detail: string;
  timestamp: string;
}

export const MOCK_PRODUCTS: Product[] = [
  { id: "p1", code: "001-MART", name: "Martillo 16oz Stanley", category: "Herramientas", line: "Ferretería", unit: "PZA", systemStock: 45 },
  { id: "p2", code: "002-TADR", name: "Taladro Percutor Black&Decker", category: "Eléctricos", line: "Ferretería", unit: "PZA", systemStock: 12 },
  { id: "p3", code: "003-TORN", name: "Tornillos Galvanizados 1/2\" (caja 100u)", category: "Tornillería", line: "Ferretería", unit: "CAJ", systemStock: 200 },
  { id: "p4", code: "004-PINB", name: "Pintura Blanca Vinílica 4L", category: "Pinturas", line: "Acabados", unit: "CUB", systemStock: 88 },
  { id: "p5", code: "005-TUBE", name: "Tubo PVC 2\" x 6m", category: "Plomería", line: "Hidráulica", unit: "PZA", systemStock: 34 },
  { id: "p6", code: "006-COND", name: "Conduit EMT 3/4\" x 3m", category: "Eléctricos", line: "Instalaciones", unit: "PZA", systemStock: 60 },
  { id: "p7", code: "007-SERR", name: "Sierra Circular 7 1/4\" Makita", category: "Herramientas", line: "Ferretería", unit: "PZA", systemStock: 8 },
  { id: "p8", code: "008-CEMN", name: "Cemento Gris 50kg Holcim", category: "Construcción", line: "Materiales", unit: "SAC", systemStock: 150 },
  { id: "p9", code: "009-LIJA", name: "Lija para madera grano 120 (x10)", category: "Abrasivos", line: "Acabados", unit: "PQT", systemStock: 300 },
  { id: "p10", code: "010-LLAV", name: "Llave ajustable 10\" Urrea", category: "Herramientas", line: "Plomería", unit: "PZA", systemStock: 25 },
  { id: "p11", code: "011-MANG", name: "Manguera jardín 1/2\" x 25m", category: "Riego", line: "Jardín", unit: "ROL", systemStock: 18 },
  { id: "p12", code: "012-EXTN", name: "Extensión 10m 3 contactos", category: "Eléctricos", line: "Instalaciones", unit: "PZA", systemStock: 42 },
  { id: "p13", code: "013-GUAD", name: "Guantes de hule talla M", category: "Seguridad", line: "EPP", unit: "PAR", systemStock: 120 },
  { id: "p14", code: "014-CASCO", name: "Casco de seguridad blanco", category: "Seguridad", line: "EPP", unit: "PZA", systemStock: 55 },
  { id: "p15", code: "015-GRILL", name: "Rejilla metálica 50x50cm", category: "Acabados", line: "Construcción", unit: "PZA", systemStock: 75 },
];

const INITIAL_AUDITS: Audit[] = [
  {
    id: "a1",
    name: "Conteo Almacén Central - Herramientas",
    warehouse: "Almacén Central",
    location: "Pasillo A, B",
    status: "en_proceso",
    assignedTo: ["u1", "u2"],
    supervisorId: "u3",
    createdBy: "u5",
    createdAt: "2026-06-25T08:00:00Z",
    updatedAt: "2026-06-28T10:30:00Z",
    lines: ["Ferretería"],
    categories: ["Herramientas", "Eléctricos"],
    progress: 62,
  },
  {
    id: "a2",
    name: "Inventario Materiales Construcción",
    warehouse: "Almacén Central",
    location: "Zona C",
    status: "enviado",
    assignedTo: ["u1"],
    supervisorId: "u3",
    createdBy: "u5",
    createdAt: "2026-06-20T09:00:00Z",
    updatedAt: "2026-06-29T14:00:00Z",
    lines: ["Materiales", "Hidráulica"],
    categories: ["Construcción", "Plomería"],
    progress: 100,
  },
  {
    id: "a3",
    name: "Conteo EPP y Seguridad",
    warehouse: "Almacén Norte",
    location: "Estante 1-4",
    status: "asignado",
    assignedTo: ["u2"],
    supervisorId: "u4",
    createdBy: "u5",
    createdAt: "2026-06-29T07:00:00Z",
    updatedAt: "2026-06-29T07:30:00Z",
    lines: ["EPP"],
    categories: ["Seguridad"],
    progress: 0,
  },
  {
    id: "a4",
    name: "Pinturas y Acabados Q2",
    warehouse: "Almacén Central",
    location: "Pasillo D",
    status: "aprobado",
    assignedTo: ["u1"],
    supervisorId: "u3",
    createdBy: "u5",
    createdAt: "2026-06-10T08:00:00Z",
    updatedAt: "2026-06-22T16:00:00Z",
    lines: ["Acabados"],
    categories: ["Pinturas", "Abrasivos"],
    progress: 100,
  },
  {
    id: "a5",
    name: "Conteo Zona Jardín - Almacén Norte",
    warehouse: "Almacén Norte",
    location: "Zona Exterior",
    status: "creado",
    assignedTo: [],
    supervisorId: "u4",
    createdBy: "u5",
    createdAt: "2026-06-30T06:00:00Z",
    updatedAt: "2026-06-30T06:00:00Z",
    lines: ["Jardín"],
    categories: ["Riego"],
    progress: 0,
  },
];

function buildCountItems(auditId: string, products: Product[], assignedTo: string[]): CountItem[] {
  const locations = ["Pasillo A - Góndola 1", "Pasillo A - Góndola 2", "Pasillo B - Estante 1", "Pasillo B - Estante 2"];
  return products.map((p, i) => ({
    id: `ci-${auditId}-${p.id}`,
    auditId,
    productId: p.id,
    product: p,
    assignedTo: assignedTo[i % Math.max(assignedTo.length, 1)] ?? assignedTo[0] ?? "u1",
    location: locations[i % locations.length] ?? locations[0],
    systemQty: p.systemStock,
    countedQty: null,
    notes: "",
    photos: [],
    status: "pendiente",
  }));
}

const INITIAL_COUNT_ITEMS: CountItem[] = [
  ...buildCountItems("a1", MOCK_PRODUCTS.slice(0, 7), ["u1", "u2"]),
  ...buildCountItems("a2", MOCK_PRODUCTS.slice(4, 9), ["u1"]),
  ...buildCountItems("a3", MOCK_PRODUCTS.slice(12, 15), ["u2"]),
  ...buildCountItems("a4", MOCK_PRODUCTS.slice(3, 5).concat(MOCK_PRODUCTS.slice(8, 10)), ["u1"]),
  ...buildCountItems("a5", MOCK_PRODUCTS.slice(10, 12), []),
];

// Pre-fill some counts for a2
INITIAL_COUNT_ITEMS.forEach((item) => {
  if (item.auditId === "a2" || item.auditId === "a4") {
    item.countedQty = item.systemQty + Math.floor(Math.random() * 6 - 3);
    item.status = item.auditId === "a4" ? "aprobado" : "enviado";
    item.countedAt = "2026-06-29T11:00:00Z";
  }
  if (item.auditId === "a1") {
    const r = Math.random();
    if (r < 0.6) {
      item.countedQty = item.systemQty + Math.floor(Math.random() * 4 - 2);
      item.status = "contado";
      item.countedAt = "2026-06-28T10:00:00Z";
    }
  }
});

interface AuditContextValue {
  audits: Audit[];
  countItems: CountItem[];
  users: User[];
  isLoading: boolean;
  getAudit: (id: string) => Audit | undefined;
  getAuditItems: (auditId: string) => CountItem[];
  getUserAudits: (userId: string) => Audit[];
  getSupervisorAudits: (supervisorId: string) => Audit[];
  createAudit: (data: Omit<Audit, "id" | "createdAt" | "updatedAt" | "progress">) => Promise<Audit>;
  updateAuditStatus: (auditId: string, status: AuditStatus) => Promise<void>;
  assignUsers: (auditId: string, userIds: string[]) => Promise<void>;
  saveCount: (itemId: string, qty: number, notes: string, photos: string[]) => Promise<void>;
  submitCount: (itemId: string) => Promise<void>;
  reviewItem: (itemId: string, action: "approve" | "return", notes: string) => Promise<void>;
  searchProducts: (query: string) => Product[];
  addCountItem: (auditId: string, product: Product, location: string, assignedTo: string) => Promise<void>;
  closeAudit: (auditId: string) => Promise<void>;
}

const AuditContext = createContext<AuditContextValue>({} as AuditContextValue);

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("audits"),
      AsyncStorage.getItem("count_items"),
    ]).then(([rawAudits, rawItems]) => {
      setAudits(rawAudits ? JSON.parse(rawAudits) : INITIAL_AUDITS);
      setCountItems(rawItems ? JSON.parse(rawItems) : INITIAL_COUNT_ITEMS);
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback(async (newAudits: Audit[], newItems: CountItem[]) => {
    await Promise.all([
      AsyncStorage.setItem("audits", JSON.stringify(newAudits)),
      AsyncStorage.setItem("count_items", JSON.stringify(newItems)),
    ]);
  }, []);

  const getAudit = useCallback((id: string) => audits.find((a) => a.id === id), [audits]);
  const getAuditItems = useCallback((auditId: string) => countItems.filter((i) => i.auditId === auditId), [countItems]);
  const getUserAudits = useCallback((userId: string) => audits.filter((a) => a.assignedTo.includes(userId)), [audits]);
  const getSupervisorAudits = useCallback((supervisorId: string) => audits.filter((a) => a.supervisorId === supervisorId), [audits]);

  const createAudit = useCallback(async (data: Omit<Audit, "id" | "createdAt" | "updatedAt" | "progress">): Promise<Audit> => {
    const newAudit: Audit = {
      ...data,
      id: `a-${Date.now()}`,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...audits, newAudit];
    setAudits(updated);
    await persist(updated, countItems);
    return newAudit;
  }, [audits, countItems, persist]);

  const updateAuditStatus = useCallback(async (auditId: string, status: AuditStatus) => {
    const updated = audits.map((a) =>
      a.id === auditId ? { ...a, status, updatedAt: new Date().toISOString() } : a
    );
    setAudits(updated);
    await persist(updated, countItems);
  }, [audits, countItems, persist]);

  const assignUsers = useCallback(async (auditId: string, userIds: string[]) => {
    const updated = audits.map((a) =>
      a.id === auditId ? { ...a, assignedTo: userIds, status: "asignado" as AuditStatus, updatedAt: new Date().toISOString() } : a
    );
    setAudits(updated);
    await persist(updated, countItems);
  }, [audits, countItems, persist]);

  const saveCount = useCallback(async (itemId: string, qty: number, notes: string, photos: string[]) => {
    const updated = countItems.map((i) =>
      i.id === itemId ? { ...i, countedQty: qty, notes, photos, status: "contado" as CountStatus, countedAt: new Date().toISOString() } : i
    );
    setCountItems(updated);
    const audit = audits.find((a) => a.id === updated.find((i) => i.id === itemId)?.auditId);
    let updatedAudits = audits;
    if (audit) {
      const items = updated.filter((i) => i.auditId === audit.id);
      const counted = items.filter((i) => i.countedQty !== null).length;
      const progress = Math.round((counted / items.length) * 100);
      updatedAudits = audits.map((a) =>
        a.id === audit.id ? { ...a, progress, status: progress > 0 ? "en_proceso" : a.status, updatedAt: new Date().toISOString() } : a
      );
      setAudits(updatedAudits);
    }
    await persist(updatedAudits, updated);
  }, [audits, countItems, persist]);

  const submitCount = useCallback(async (itemId: string) => {
    const updated = countItems.map((i) =>
      i.id === itemId ? { ...i, status: "enviado" as CountStatus } : i
    );
    setCountItems(updated);
    await persist(audits, updated);
  }, [audits, countItems, persist]);

  const reviewItem = useCallback(async (itemId: string, action: "approve" | "return", notes: string) => {
    const status: CountStatus = action === "approve" ? "aprobado" : "devuelto";
    const updated = countItems.map((i) =>
      i.id === itemId ? { ...i, status, reviewNotes: notes } : i
    );
    setCountItems(updated);
    await persist(audits, updated);
  }, [audits, countItems, persist]);

  const searchProducts = useCallback((query: string): Product[] => {
    if (!query.trim()) return MOCK_PRODUCTS;
    const q = query.toLowerCase();
    return MOCK_PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.line.toLowerCase().includes(q)
    );
  }, []);

  const addCountItem = useCallback(async (auditId: string, product: Product, location: string, assignedTo: string) => {
    const newItem: CountItem = {
      id: `ci-${Date.now()}`,
      auditId,
      productId: product.id,
      product,
      assignedTo,
      location,
      systemQty: product.systemStock,
      countedQty: null,
      notes: "",
      photos: [],
      status: "pendiente",
    };
    const updated = [...countItems, newItem];
    setCountItems(updated);
    await persist(audits, updated);
  }, [audits, countItems, persist]);

  const closeAudit = useCallback(async (auditId: string) => {
    const updated = audits.map((a) =>
      a.id === auditId ? { ...a, status: "cerrado" as AuditStatus, updatedAt: new Date().toISOString() } : a
    );
    setAudits(updated);
    await persist(updated, countItems);
  }, [audits, countItems, persist]);

  return (
    <AuditContext.Provider value={{
      audits, countItems, users: ALL_USERS, isLoading,
      getAudit, getAuditItems, getUserAudits, getSupervisorAudits,
      createAudit, updateAuditStatus, assignUsers,
      saveCount, submitCount, reviewItem,
      searchProducts, addCountItem, closeAudit,
    }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAuditContext() {
  return useContext(AuditContext);
}

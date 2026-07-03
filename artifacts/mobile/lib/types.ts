// Shared domain types for the mobile app. Mirror the API DTOs so mobile and web
// share the same backend data. Re-exported by the contexts for screen imports.

export type UserRole = "auxiliar" | "supervisor" | "gerente";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  warehouse?: string;
  avatar?: string;
  active?: boolean;
}

export type AuditStatus =
  | "creado"
  | "asignado"
  | "en_proceso"
  | "enviado"
  | "en_revision"
  | "devuelto"
  | "aprobado"
  | "cerrado";

export type CountStatus = "pendiente" | "contado" | "enviado" | "aprobado" | "devuelto";

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  line: string;
  unit: string;
  systemStock: number;
  active?: boolean;
  imageUrl?: string;
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
  /** @deprecated Legacy flag: blind for both roles. Prefer the per-role flags below. */
  blindCount?: boolean;
  blindForAuxiliar?: boolean;
  blindForSupervisor?: boolean;
}

export interface Locality {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface Warehouse {
  id: string;
  localityId: string;
  name: string;
  code: string;
  active: boolean;
}

export interface StorageLocation {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  active: boolean;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
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

export interface DashboardMetrics {
  totals: { audits: number; products: number; activeProducts: number; countItems: number };
  coveragePct: number;
  accuracyPct: number;
  discrepancyRatePct: number;
  dataQualityScore: number;
  exactCount: number;
  shortageCount: number;
  surplusCount: number;
  shortageUnits: number;
  surplusUnits: number;
  netVarianceUnits: number;
  absVarianceUnits: number;
  auditsByStatus: { status: AuditStatus; count: number }[];
  byAuxiliar: { userId: string; name: string; assigned: number; counted: number; submitted: number; exact: number; accuracyPct: number }[];
  topDiscrepancies: { productId: string; code: string; name: string; systemQty: number; countedQty: number; diff: number }[];
  byCategory: { category: string; items: number; counted: number; discrepancies: number; accuracyPct: number }[];
  byWarehouse: { warehouse: string; items: number; counted: number; discrepancies: number }[];
}

/** Whether the system stock must be hidden from the auxiliary while counting. */
export const isBlindForAuxiliar = (a: Pick<Audit, "blindForAuxiliar" | "blindCount">) =>
  a.blindForAuxiliar ?? a.blindCount ?? false;

/** Whether the system stock must be hidden from the supervisor while reviewing. */
export const isBlindForSupervisor = (a: Pick<Audit, "blindForSupervisor" | "blindCount">) =>
  a.blindForSupervisor ?? a.blindCount ?? false;

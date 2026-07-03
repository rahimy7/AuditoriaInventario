// Domain model for the InventControl web console.
// Mirrors the mobile app's AuditContext / AuthContext, plus management-only fields.

export type UserRole = "auxiliar" | "supervisor" | "gerente";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  warehouse?: string;
  avatar?: string;
  active: boolean;
}

/** Stored user includes the credential; never exposed through the auth session. */
export interface StoredUser extends User {
  password: string;
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
  active: boolean;
  imageUrl?: string;
}

// --- Location hierarchy: locality → warehouse → storage location ------------
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

// --- Bulk product import ----------------------------------------------------
export type ProductImportMode = "products" | "stock";

export interface ProductImportRow {
  code: string;
  name?: string;
  category?: string;
  line?: string;
  unit?: string;
  systemStock?: number;
  active?: boolean;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; code: string; message: string }[];
}

// --- Dashboard metrics ------------------------------------------------------
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
  blindForAuxiliar?: boolean;
  blindForSupervisor?: boolean;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: "audit" | "count" | "user" | "product";
  entityId: string;
  detail: string;
}

export interface CreateAuditInput {
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
}

export const isBlindForAuxiliar = (a: Pick<Audit, "blindForAuxiliar">) =>
  a.blindForAuxiliar ?? false;

export const isBlindForSupervisor = (a: Pick<Audit, "blindForSupervisor">) =>
  a.blindForSupervisor ?? false;

// ---------------------------------------------------------------------------
// Labels & presentation metadata
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  auxiliar: "Auxiliar",
  supervisor: "Supervisor",
  gerente: "Gerente",
};

export const ROLE_FULL_LABELS: Record<UserRole, string> = {
  auxiliar: "Auxiliar de Conteo",
  supervisor: "Supervisor",
  gerente: "Gerente General",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  auxiliar: "#3949AB",
  supervisor: "#8E24AA",
  gerente: "#C62828",
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  creado: "Creado",
  asignado: "Asignado",
  en_proceso: "En Proceso",
  enviado: "Enviado",
  en_revision: "En Revisión",
  devuelto: "Devuelto",
  aprobado: "Aprobado",
  cerrado: "Cerrado",
};

export const COUNT_STATUS_LABELS: Record<CountStatus, string> = {
  pendiente: "Pendiente",
  contado: "Contado",
  enviado: "Enviado",
  aprobado: "Aprobado",
  devuelto: "Devuelto",
};

export interface StatusColor {
  bg: string;
  text: string;
}

export const STATUS_COLORS: Record<AuditStatus | CountStatus, StatusColor> = {
  creado: { bg: "#F1F5F9", text: "#546E7A" },
  asignado: { bg: "#EEF4FF", text: "#1565C0" },
  en_proceso: { bg: "#EDE9FE", text: "#5E35B1" },
  enviado: { bg: "#F3E8FF", text: "#8E24AA" },
  en_revision: { bg: "#FFF3E0", text: "#E65100" },
  devuelto: { bg: "#FFEBEE", text: "#C62828" },
  aprobado: { bg: "#E8F5E9", text: "#2E7D32" },
  cerrado: { bg: "#ECEFF1", text: "#455A64" },
  pendiente: { bg: "#FFF3E0", text: "#E65100" },
  contado: { bg: "#E8EAF6", text: "#3949AB" },
};

/** Palette used across charts and diff indicators. */
export const PALETTE = {
  primary: "#1565C0",
  purple: "#5E35B1",
  accent: "#0288D1",
  warning: "#E65100",
  success: "#2E7D32",
  error: "#C62828",
  muted: "#78909C",
};

/**
 * Allowed audit status transitions — drives the lifecycle controls in the UI.
 * The manager can also force-close/reopen from the detail screen.
 */
export const AUDIT_TRANSITIONS: Record<AuditStatus, AuditStatus[]> = {
  creado: ["asignado"],
  asignado: ["en_proceso", "creado"],
  en_proceso: ["enviado"],
  enviado: ["en_revision", "devuelto"],
  en_revision: ["aprobado", "devuelto"],
  devuelto: ["en_proceso"],
  aprobado: ["cerrado", "en_revision"],
  cerrado: [],
};

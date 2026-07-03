import type { AuditStatus, CountStatus, UserRole } from "@workspace/db";

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  warehouse?: string;
  active: boolean;
}

export interface SeedProduct {
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

export interface SeedLocality {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface SeedWarehouse {
  id: string;
  localityId: string;
  name: string;
  code: string;
  active: boolean;
}

export interface SeedStorageLocation {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  active: boolean;
}

export interface SeedAudit {
  id: string;
  name: string;
  warehouse: string;
  location: string;
  status: AuditStatus;
  assignedTo: string[];
  supervisorId: string;
  createdBy: string;
  lines: string[];
  categories: string[];
  progress: number;
  blindForAuxiliar: boolean;
  blindForSupervisor: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeedCountItem {
  id: string;
  auditId: string;
  productId: string;
  assignedTo: string;
  location: string;
  systemQty: number;
  countedQty: number | null;
  notes: string;
  photos: string[];
  status: CountStatus;
  countedAt: string | null;
}

export const SEED_USERS: SeedUser[] = [
  { id: "u1", name: "María García", email: "auxiliar@inv.com", password: "1234", role: "auxiliar", warehouse: "Almacén Central", active: true },
  { id: "u2", name: "Juan Pérez", email: "auxiliar2@inv.com", password: "1234", role: "auxiliar", warehouse: "Almacén Norte", active: true },
  { id: "u3", name: "Carlos López", email: "supervisor@inv.com", password: "1234", role: "supervisor", warehouse: "Almacén Central", active: true },
  { id: "u4", name: "Laura Rodríguez", email: "supervisor2@inv.com", password: "1234", role: "supervisor", warehouse: "Almacén Norte", active: true },
  { id: "u5", name: "Ana Martínez", email: "gerente@inv.com", password: "1234", role: "gerente", active: true },
];

export const SEED_PRODUCTS: SeedProduct[] = [
  { id: "p1", code: "001-MART", name: "Martillo 16oz Stanley", category: "Herramientas", line: "Ferretería", unit: "PZA", systemStock: 45, active: true },
  { id: "p2", code: "002-TADR", name: "Taladro Percutor Black&Decker", category: "Eléctricos", line: "Ferretería", unit: "PZA", systemStock: 12, active: true },
  { id: "p3", code: "003-TORN", name: 'Tornillos Galvanizados 1/2" (caja 100u)', category: "Tornillería", line: "Ferretería", unit: "CAJ", systemStock: 200, active: true },
  { id: "p4", code: "004-PINB", name: "Pintura Blanca Vinílica 4L", category: "Pinturas", line: "Acabados", unit: "CUB", systemStock: 88, active: true },
  { id: "p5", code: "005-TUBE", name: 'Tubo PVC 2" x 6m', category: "Plomería", line: "Hidráulica", unit: "PZA", systemStock: 34, active: true },
  { id: "p6", code: "006-COND", name: 'Conduit EMT 3/4" x 3m', category: "Eléctricos", line: "Instalaciones", unit: "PZA", systemStock: 60, active: true },
  { id: "p7", code: "007-SERR", name: 'Sierra Circular 7 1/4" Makita', category: "Herramientas", line: "Ferretería", unit: "PZA", systemStock: 8, active: true },
  { id: "p8", code: "008-CEMN", name: "Cemento Gris 50kg Holcim", category: "Construcción", line: "Materiales", unit: "SAC", systemStock: 150, active: true },
  { id: "p9", code: "009-LIJA", name: "Lija para madera grano 120 (x10)", category: "Abrasivos", line: "Acabados", unit: "PQT", systemStock: 300, active: true },
  { id: "p10", code: "010-LLAV", name: 'Llave ajustable 10" Urrea', category: "Herramientas", line: "Plomería", unit: "PZA", systemStock: 25, active: true },
  { id: "p11", code: "011-MANG", name: 'Manguera jardín 1/2" x 25m', category: "Riego", line: "Jardín", unit: "ROL", systemStock: 18, active: true },
  { id: "p12", code: "012-EXTN", name: "Extensión 10m 3 contactos", category: "Eléctricos", line: "Instalaciones", unit: "PZA", systemStock: 42, active: true },
  { id: "p13", code: "013-GUAD", name: "Guantes de hule talla M", category: "Seguridad", line: "EPP", unit: "PAR", systemStock: 120, active: true },
  { id: "p14", code: "014-CASCO", name: "Casco de seguridad blanco", category: "Seguridad", line: "EPP", unit: "PZA", systemStock: 55, active: true },
  { id: "p15", code: "015-GRILL", name: "Rejilla metálica 50x50cm", category: "Acabados", line: "Construcción", unit: "PZA", systemStock: 75, active: true },
];

export const SEED_LOCALITIES: SeedLocality[] = [
  { id: "loc1", name: "Región Centro", code: "CTR", active: true },
  { id: "loc2", name: "Región Norte", code: "NTE", active: true },
];

export const SEED_WAREHOUSES: SeedWarehouse[] = [
  { id: "wh1", localityId: "loc1", name: "Almacén Central", code: "AC", active: true },
  { id: "wh2", localityId: "loc1", name: "Almacén Sur", code: "AS", active: true },
  { id: "wh3", localityId: "loc2", name: "Almacén Norte", code: "AN", active: true },
  { id: "wh4", localityId: "loc2", name: "Almacén Poniente", code: "AP", active: true },
];

export const SEED_STORAGE_LOCATIONS: SeedStorageLocation[] = [
  { id: "sl1", warehouseId: "wh1", name: "Pasillo A", code: "A", active: true },
  { id: "sl2", warehouseId: "wh1", name: "Pasillo B", code: "B", active: true },
  { id: "sl3", warehouseId: "wh1", name: "Zona C", code: "C", active: true },
  { id: "sl4", warehouseId: "wh1", name: "Pasillo D", code: "D", active: true },
  { id: "sl5", warehouseId: "wh2", name: "Estante 1", code: "E1", active: true },
  { id: "sl6", warehouseId: "wh2", name: "Estante 2", code: "E2", active: true },
  { id: "sl7", warehouseId: "wh3", name: "Estante 1-4", code: "E1-4", active: true },
  { id: "sl8", warehouseId: "wh3", name: "Zona Exterior", code: "EXT", active: true },
  { id: "sl9", warehouseId: "wh4", name: "Andén 1", code: "AND1", active: true },
  { id: "sl10", warehouseId: "wh4", name: "Andén 2", code: "AND2", active: true },
];

export const SEED_AUDITS: SeedAudit[] = [
  { id: "a1", name: "Conteo Almacén Central - Herramientas", warehouse: "Almacén Central", location: "Pasillo A, B", status: "en_proceso", assignedTo: ["u1", "u2"], supervisorId: "u3", createdBy: "u5", lines: ["Ferretería"], categories: ["Herramientas", "Eléctricos"], progress: 0, blindForAuxiliar: true, blindForSupervisor: false, createdAt: "2026-06-25T08:00:00Z", updatedAt: "2026-06-28T10:30:00Z" },
  { id: "a2", name: "Inventario Materiales Construcción", warehouse: "Almacén Central", location: "Zona C", status: "enviado", assignedTo: ["u1"], supervisorId: "u3", createdBy: "u5", lines: ["Materiales", "Hidráulica"], categories: ["Construcción", "Plomería"], progress: 0, blindForAuxiliar: false, blindForSupervisor: false, createdAt: "2026-06-20T09:00:00Z", updatedAt: "2026-06-29T14:00:00Z" },
  { id: "a3", name: "Conteo EPP y Seguridad", warehouse: "Almacén Norte", location: "Estante 1-4", status: "asignado", assignedTo: ["u2"], supervisorId: "u4", createdBy: "u5", lines: ["EPP"], categories: ["Seguridad"], progress: 0, blindForAuxiliar: false, blindForSupervisor: false, createdAt: "2026-06-29T07:00:00Z", updatedAt: "2026-06-29T07:30:00Z" },
  { id: "a4", name: "Pinturas y Acabados Q2", warehouse: "Almacén Central", location: "Pasillo D", status: "aprobado", assignedTo: ["u1"], supervisorId: "u3", createdBy: "u5", lines: ["Acabados"], categories: ["Pinturas", "Abrasivos"], progress: 0, blindForAuxiliar: false, blindForSupervisor: false, createdAt: "2026-06-10T08:00:00Z", updatedAt: "2026-06-22T16:00:00Z" },
  { id: "a5", name: "Conteo Zona Jardín - Almacén Norte", warehouse: "Almacén Norte", location: "Zona Exterior", status: "creado", assignedTo: [], supervisorId: "u4", createdBy: "u5", lines: ["Jardín"], categories: ["Riego"], progress: 0, blindForAuxiliar: false, blindForSupervisor: false, createdAt: "2026-06-30T06:00:00Z", updatedAt: "2026-06-30T06:00:00Z" },
];

const LOCATIONS = ["Pasillo A - Góndola 1", "Pasillo A - Góndola 2", "Pasillo B - Estante 1", "Pasillo B - Estante 2"];

function offset(seed: number): number {
  return Math.round((Math.abs(Math.sin(seed) * 10000) % 6) - 3);
}

function build(auditId: string, products: SeedProduct[], assignees: string[]): SeedCountItem[] {
  return products.map((p, i) => ({
    id: `ci-${auditId}-${p.id}`,
    auditId,
    productId: p.id,
    assignedTo: assignees[i % Math.max(assignees.length, 1)] ?? assignees[0] ?? "",
    location: LOCATIONS[i % LOCATIONS.length]!,
    systemQty: p.systemStock,
    countedQty: null,
    notes: "",
    photos: [],
    status: "pendiente" as CountStatus,
    countedAt: null,
  }));
}

export function buildSeedCountItems(): SeedCountItem[] {
  const items: SeedCountItem[] = [
    ...build("a1", SEED_PRODUCTS.slice(0, 7), ["u1", "u2"]),
    ...build("a2", SEED_PRODUCTS.slice(4, 9), ["u1"]),
    ...build("a3", SEED_PRODUCTS.slice(12, 15), ["u2"]),
    ...build("a4", SEED_PRODUCTS.slice(3, 5).concat(SEED_PRODUCTS.slice(8, 10)), ["u1"]),
    ...build("a5", SEED_PRODUCTS.slice(10, 12), []),
  ];

  items.forEach((item, idx) => {
    if (item.auditId === "a2" || item.auditId === "a4") {
      item.countedQty = item.systemQty + offset(idx + 1);
      item.status = item.auditId === "a4" ? "aprobado" : "enviado";
      item.countedAt = "2026-06-29T11:00:00Z";
    }
    if (item.auditId === "a1" && idx % 5 < 3) {
      item.countedQty = item.systemQty + Math.round(offset(idx + 100) / 1.5);
      item.status = "contado";
      item.countedAt = "2026-06-28T10:00:00Z";
    }
  });

  return items;
}

import { sql } from "drizzle-orm";
import {
  activityTable,
  auditsTable,
  countItemsTable,
  db,
  localitiesTable,
  productsTable,
  storageLocationsTable,
  usersTable,
  warehousesTable,
} from "@workspace/db";
import { logger } from "./logger";
import {
  SEED_AUDITS,
  SEED_LOCALITIES,
  SEED_PRODUCTS,
  SEED_STORAGE_LOCATIONS,
  SEED_USERS,
  SEED_WAREHOUSES,
  buildSeedCountItems,
} from "./seedData";

// Idempotent DDL. Kept between the sentinel comments so the schema can be applied
// with just DATABASE_URL — no drizzle-kit / bundler required at runtime.
export const SCHEMA_SQL = `
-- @schema-start
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'auxiliar',
  warehouse text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  line text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'PZA',
  system_stock integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  image_url text
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
CREATE TABLE IF NOT EXISTS localities (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS warehouses (
  id text PRIMARY KEY,
  locality_id text NOT NULL REFERENCES localities(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS storage_locations (
  id text PRIMARY KEY,
  warehouse_id text NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS audits (
  id text PRIMARY KEY,
  name text NOT NULL,
  warehouse text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'creado',
  assigned_to text[] NOT NULL DEFAULT '{}',
  supervisor_id text NOT NULL,
  created_by text NOT NULL,
  lines text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  progress integer NOT NULL DEFAULT 0,
  blind_for_auxiliar boolean NOT NULL DEFAULT false,
  blind_for_supervisor boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS count_items (
  id text PRIMARY KEY,
  audit_id text NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  assigned_to text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  system_qty integer NOT NULL DEFAULT 0,
  counted_qty integer,
  notes text NOT NULL DEFAULT '',
  photos text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pendiente',
  review_notes text,
  counted_at timestamptz
);
CREATE TABLE IF NOT EXISTS activity_log (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id text NOT NULL DEFAULT 'system',
  user_name text NOT NULL DEFAULT 'Sistema',
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT ''
);
-- @schema-end
`;

export async function ensureSchema(): Promise<void> {
  await db.execute(sql.raw(SCHEMA_SQL));
}

// Seeds the location hierarchy independently (its own "empty" guard) so it also
// populates databases that already have users from an earlier seed.
export async function seedLocationsIfEmpty(): Promise<void> {
  const existing = await db.select({ id: localitiesTable.id }).from(localitiesTable).limit(1);
  if (existing.length > 0) return;
  logger.info("Seeding location hierarchy…");
  await db.insert(localitiesTable).values(SEED_LOCALITIES);
  await db.insert(warehousesTable).values(SEED_WAREHOUSES);
  await db.insert(storageLocationsTable).values(SEED_STORAGE_LOCATIONS);
}

export async function seedIfEmpty(): Promise<void> {
  await seedLocationsIfEmpty();

  const existing = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existing.length > 0) return;

  logger.info("Seeding database with demo data…");

  await db.insert(usersTable).values(
    SEED_USERS.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      warehouse: u.warehouse ?? null,
      active: u.active,
    })),
  );

  await db.insert(productsTable).values(
    SEED_PRODUCTS.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      line: p.line,
      unit: p.unit,
      systemStock: p.systemStock,
      active: p.active,
      imageUrl: p.imageUrl ?? null,
    })),
  );

  const items = buildSeedCountItems();

  await db.insert(auditsTable).values(
    SEED_AUDITS.map((a) => {
      const list = items.filter((i) => i.auditId === a.id);
      const counted = list.filter((i) => i.countedQty !== null).length;
      const progress = list.length > 0 ? Math.round((counted / list.length) * 100) : 0;
      return {
        id: a.id,
        name: a.name,
        warehouse: a.warehouse,
        location: a.location,
        status: a.status,
        assignedTo: a.assignedTo,
        supervisorId: a.supervisorId,
        createdBy: a.createdBy,
        lines: a.lines,
        categories: a.categories,
        progress,
        blindForAuxiliar: a.blindForAuxiliar,
        blindForSupervisor: a.blindForSupervisor,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
      };
    }),
  );

  await db.insert(countItemsTable).values(
    items.map((i) => ({
      id: i.id,
      auditId: i.auditId,
      productId: i.productId,
      assignedTo: i.assignedTo,
      location: i.location,
      systemQty: i.systemQty,
      countedQty: i.countedQty,
      notes: i.notes,
      photos: i.photos,
      status: i.status,
      countedAt: i.countedAt ? new Date(i.countedAt) : null,
    })),
  );

  await db.insert(activityTable).values([
    { userId: "u5", userName: "Ana Martínez", action: "creó la auditoría", entity: "audit", entityId: "a5", detail: "Conteo Zona Jardín - Almacén Norte" },
    { userId: "u1", userName: "María García", action: "envió conteos", entity: "audit", entityId: "a2", detail: "Inventario Materiales Construcción" },
    { userId: "u3", userName: "Carlos López", action: "aprobó la auditoría", entity: "audit", entityId: "a4", detail: "Pinturas y Acabados Q2" },
  ]);

  logger.info("Seed complete.");
}

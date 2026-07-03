import { randomUUID } from "node:crypto";
import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Location hierarchy: locality → warehouse → storage location.
// Kept as a catalog; audits/count_items still store warehouse/location as text
// (denormalized) for backward compatibility — these tables feed the pickers.

export const localitiesTable = pgTable("localities", {
  id: text("id").primaryKey().$defaultFn(() => `loc-${randomUUID()}`),
  name: text("name").notNull(),
  code: text("code").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

export const warehousesTable = pgTable("warehouses", {
  id: text("id").primaryKey().$defaultFn(() => `wh-${randomUUID()}`),
  localityId: text("locality_id")
    .notNull()
    .references(() => localitiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

export const storageLocationsTable = pgTable("storage_locations", {
  id: text("id").primaryKey().$defaultFn(() => `sl-${randomUUID()}`),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

export const insertLocalitySchema = createInsertSchema(localitiesTable).omit({ id: true });
export const insertWarehouseSchema = createInsertSchema(warehousesTable).omit({ id: true });
export const insertStorageLocationSchema = createInsertSchema(storageLocationsTable).omit({ id: true });

export type InsertLocality = z.infer<typeof insertLocalitySchema>;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;

export type LocalityRow = typeof localitiesTable.$inferSelect;
export type WarehouseRow = typeof warehousesTable.$inferSelect;
export type StorageLocationRow = typeof storageLocationsTable.$inferSelect;

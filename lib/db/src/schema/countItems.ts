import { randomUUID } from "node:crypto";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type { CountStatus } from "./enums";
import { auditsTable } from "./audits";
import { productsTable } from "./products";

export const countItemsTable = pgTable("count_items", {
  id: text("id").primaryKey().$defaultFn(() => `ci-${randomUUID()}`),
  auditId: text("audit_id")
    .notNull()
    .references(() => auditsTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "restrict" }),
  assignedTo: text("assigned_to").notNull().default(""),
  location: text("location").notNull().default(""),
  systemQty: integer("system_qty").notNull().default(0),
  countedQty: integer("counted_qty"),
  notes: text("notes").notNull().default(""),
  photos: text("photos").array().notNull().$defaultFn(() => []),
  status: text("status").$type<CountStatus>().notNull().default("pendiente"),
  reviewNotes: text("review_notes"),
  countedAt: timestamp("counted_at", { withTimezone: true }),
});

export const insertCountItemSchema = createInsertSchema(countItemsTable).omit({ id: true });

export type InsertCountItem = z.infer<typeof insertCountItemSchema>;
export type CountItemRow = typeof countItemsTable.$inferSelect;

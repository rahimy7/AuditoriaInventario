import { randomUUID } from "node:crypto";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type { AuditStatus } from "./enums";

export const auditsTable = pgTable("audits", {
  id: text("id").primaryKey().$defaultFn(() => `a-${randomUUID()}`),
  name: text("name").notNull(),
  warehouse: text("warehouse").notNull().default(""),
  location: text("location").notNull().default(""),
  status: text("status").$type<AuditStatus>().notNull().default("creado"),
  assignedTo: text("assigned_to").array().notNull().$defaultFn(() => []),
  supervisorId: text("supervisor_id").notNull(),
  createdBy: text("created_by").notNull(),
  lines: text("lines").array().notNull().$defaultFn(() => []),
  categories: text("categories").array().notNull().$defaultFn(() => []),
  progress: integer("progress").notNull().default(0),
  blindForAuxiliar: boolean("blind_for_auxiliar").notNull().default(false),
  blindForSupervisor: boolean("blind_for_supervisor").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditSchema = createInsertSchema(auditsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  progress: true,
});

export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type AuditRow = typeof auditsTable.$inferSelect;

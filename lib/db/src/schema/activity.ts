import { randomUUID } from "node:crypto";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type { ActivityEntity } from "./enums";

export const activityTable = pgTable("activity_log", {
  id: text("id").primaryKey().$defaultFn(() => `act-${randomUUID()}`),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  userId: text("user_id").notNull().default("system"),
  userName: text("user_name").notNull().default("Sistema"),
  action: text("action").notNull(),
  entity: text("entity").$type<ActivityEntity>().notNull(),
  entityId: text("entity_id").notNull().default(""),
  detail: text("detail").notNull().default(""),
});

export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, timestamp: true });

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ActivityRow = typeof activityTable.$inferSelect;

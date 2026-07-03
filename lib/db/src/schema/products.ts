import { randomUUID } from "node:crypto";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => `p-${randomUUID()}`),
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  line: text("line").notNull().default(""),
  unit: text("unit").notNull().default("PZA"),
  systemStock: integer("system_stock").notNull().default(0),
  active: boolean("active").notNull().default(true),
  imageUrl: text("image_url"),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductRow = typeof productsTable.$inferSelect;

import type { Request } from "express";
import { eq, type SQL } from "drizzle-orm";
import {
  activityTable,
  auditsTable,
  countItemsTable,
  db,
  productsTable,
  usersTable,
  type ActivityEntity,
} from "@workspace/db";
import { toCountItemDTO } from "./dto";

/** The client sends `Authorization: Bearer <userId>` — a lightweight demo token. */
export function actorId(req: Request): string {
  const h = req.headers.authorization;
  if (h && h.startsWith("Bearer ")) return h.slice(7).trim() || "system";
  return "system";
}

export async function recomputeAudit(auditId: string): Promise<number> {
  const items = await db
    .select({ countedQty: countItemsTable.countedQty })
    .from(countItemsTable)
    .where(eq(countItemsTable.auditId, auditId));
  const total = items.length;
  const counted = items.filter((i) => i.countedQty !== null).length;
  const progress = total > 0 ? Math.round((counted / total) * 100) : 0;
  await db.update(auditsTable).set({ progress, updatedAt: new Date() }).where(eq(auditsTable.id, auditId));
  return progress;
}

export async function logActivity(
  req: Request,
  action: string,
  entity: ActivityEntity,
  entityId: string,
  detail = "",
): Promise<void> {
  const uid = actorId(req);
  let userName = "Sistema";
  if (uid !== "system") {
    const found = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, uid)).limit(1);
    if (found[0]) userName = found[0].name;
  }
  await db.insert(activityTable).values({ userId: uid, userName, action, entity, entityId, detail });
}

/** Fetch count items (optionally filtered) joined with their product snapshot for the DTO. */
export async function itemsWithProducts(where?: SQL) {
  const rows = where
    ? await db.select().from(countItemsTable).where(where)
    : await db.select().from(countItemsTable);
  const products = await db.select().from(productsTable);
  const map = new Map(products.map((p) => [p.id, p]));
  return rows.map((i) => toCountItemDTO(i, map.get(i.productId)));
}

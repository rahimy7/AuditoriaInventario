import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { auditsTable, countItemsTable, db, productsTable, type CountStatus } from "@workspace/db";
import { toCountItemDTO } from "../lib/dto";
import { itemsWithProducts, logActivity, recomputeAudit } from "../lib/service";

const router: IRouter = Router();

async function itemById(id: string) {
  const rows = await db.select().from(countItemsTable).where(eq(countItemsTable.id, id)).limit(1);
  return rows[0];
}

async function dtoFor(id: string) {
  const item = await itemById(id);
  if (!item) return undefined;
  const p = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
  return toCountItemDTO(item, p[0]);
}

// Save a count (or edit assignment/location/notes) on an item.
router.patch("/count-items/:id", async (req, res) => {
  const item = await itemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Ítem no encontrado." });
    return;
  }
  const b = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (b.notes !== undefined) patch.notes = b.notes;
  if (b.photos !== undefined) patch.photos = b.photos;
  if (b.location !== undefined) patch.location = b.location;
  if (b.assignedTo !== undefined) patch.assignedTo = b.assignedTo;
  if (b.countedQty !== undefined) {
    patch.countedQty = b.countedQty === null ? null : Number(b.countedQty);
    if (b.countedQty !== null) {
      patch.status = "contado" satisfies CountStatus;
      patch.countedAt = new Date();
    }
  }
  await db.update(countItemsTable).set(patch).where(eq(countItemsTable.id, item.id));

  if (b.countedQty !== undefined && b.countedQty !== null) {
    await recomputeAudit(item.auditId);
    await db
      .update(auditsTable)
      .set({ status: "en_proceso", updatedAt: new Date() })
      .where(and(eq(auditsTable.id, item.auditId), eq(auditsTable.status, "asignado")));
  }
  res.json(await dtoFor(item.id));
});

router.post("/count-items/:id/submit", async (req, res) => {
  const item = await itemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Ítem no encontrado." });
    return;
  }
  await db.update(countItemsTable).set({ status: "enviado" }).where(eq(countItemsTable.id, item.id));

  const siblings = await db
    .select({ status: countItemsTable.status })
    .from(countItemsTable)
    .where(eq(countItemsTable.auditId, item.auditId));
  const allSubmitted = siblings.every((s) => s.status === "enviado" || s.status === "aprobado");
  if (allSubmitted) {
    await db
      .update(auditsTable)
      .set({ status: "enviado", updatedAt: new Date() })
      .where(and(eq(auditsTable.id, item.auditId), inArray(auditsTable.status, ["asignado", "en_proceso"])));
  }
  await logActivity(req, "envió un conteo", "count", item.id, "");
  res.json(await dtoFor(item.id));
});

router.post("/count-items/:id/review", async (req, res) => {
  const item = await itemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Ítem no encontrado." });
    return;
  }
  const action = req.body?.action as "approve" | "return" | undefined;
  const notes = String(req.body?.notes ?? "");
  if (action !== "approve" && action !== "return") {
    res.status(400).json({ error: "action debe ser 'approve' o 'return'." });
    return;
  }
  const status: CountStatus = action === "approve" ? "aprobado" : "devuelto";
  await db.update(countItemsTable).set({ status, reviewNotes: notes }).where(eq(countItemsTable.id, item.id));
  if (action === "return") {
    await db.update(auditsTable).set({ status: "devuelto", updatedAt: new Date() }).where(eq(auditsTable.id, item.auditId));
  }
  await logActivity(req, action === "approve" ? "aprobó un conteo" : "devolvió un conteo", "count", item.id, notes);
  res.json(await dtoFor(item.id));
});

router.post("/count-items/reassign", async (req, res) => {
  const itemIds: string[] = Array.isArray(req.body?.itemIds) ? req.body.itemIds : [];
  const userId = String(req.body?.userId ?? "");
  if (itemIds.length === 0) {
    res.status(400).json({ error: "itemIds requerido." });
    return;
  }
  await db.update(countItemsTable).set({ assignedTo: userId }).where(inArray(countItemsTable.id, itemIds));
  await logActivity(req, "reasignó ítems", "count", itemIds[0] ?? "", `${itemIds.length} ítem(s)`);
  res.json({ ok: true, count: itemIds.length });
});

router.post("/count-items/submit-all", async (req, res) => {
  const auditId = String(req.body?.auditId ?? "");
  const userId = req.body?.userId ? String(req.body.userId) : undefined;
  if (!auditId) {
    res.status(400).json({ error: "auditId requerido." });
    return;
  }
  const conditions = [eq(countItemsTable.auditId, auditId), eq(countItemsTable.status, "contado" as CountStatus)];
  if (userId) conditions.push(eq(countItemsTable.assignedTo, userId));
  await db.update(countItemsTable).set({ status: "enviado" }).where(and(...conditions));

  const siblings = await db.select({ status: countItemsTable.status }).from(countItemsTable).where(eq(countItemsTable.auditId, auditId));
  const allSubmitted = siblings.length > 0 && siblings.every((s) => s.status === "enviado" || s.status === "aprobado");
  if (allSubmitted) {
    await db.update(auditsTable).set({ status: "enviado", updatedAt: new Date() }).where(eq(auditsTable.id, auditId));
  }
  await logActivity(req, "envió todos los conteos", "audit", auditId, "");
  res.json(await itemsWithProducts(eq(countItemsTable.auditId, auditId)));
});

router.delete("/count-items/:id", async (req, res) => {
  const item = await itemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Ítem no encontrado." });
    return;
  }
  await db.delete(countItemsTable).where(eq(countItemsTable.id, item.id));
  await recomputeAudit(item.auditId);
  res.status(204).end();
});

export default router;

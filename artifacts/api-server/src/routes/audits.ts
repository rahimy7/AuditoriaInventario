import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  auditsTable,
  countItemsTable,
  db,
  productsTable,
  type AuditStatus,
  type CountStatus,
} from "@workspace/db";
import { toAuditDTO } from "../lib/dto";
import { itemsWithProducts, logActivity, recomputeAudit } from "../lib/service";

const router: IRouter = Router();

async function auditById(id: string) {
  const rows = await db.select().from(auditsTable).where(eq(auditsTable.id, id)).limit(1);
  return rows[0];
}

router.get("/audits", async (_req, res) => {
  const rows = await db.select().from(auditsTable).orderBy(desc(auditsTable.updatedAt));
  res.json(rows.map(toAuditDTO));
});

router.get("/audits/:id", async (req, res) => {
  const audit = await auditById(req.params.id);
  if (!audit) {
    res.status(404).json({ error: "Auditoría no encontrada." });
    return;
  }
  res.json(toAuditDTO(audit));
});

router.get("/audits/:id/items", async (req, res) => {
  const items = await itemsWithProducts(eq(countItemsTable.auditId, req.params.id));
  res.json(items);
});

router.post("/audits", async (req, res) => {
  const b = req.body ?? {};
  if (!b.name || !b.warehouse || !b.supervisorId) {
    res.status(400).json({ error: "Nombre, almacén y supervisor son obligatorios." });
    return;
  }
  const assignedTo: string[] = Array.isArray(b.assignedTo) ? b.assignedTo : [];
  const productIds: string[] = Array.isArray(b.productIds) ? b.productIds : [];

  const inserted = await db
    .insert(auditsTable)
    .values({
      name: String(b.name),
      warehouse: String(b.warehouse),
      location: b.location ?? "",
      status: assignedTo.length > 0 ? "asignado" : "creado",
      assignedTo,
      supervisorId: String(b.supervisorId),
      createdBy: b.createdBy ?? "system",
      lines: Array.isArray(b.lines) ? b.lines : [],
      categories: Array.isArray(b.categories) ? b.categories : [],
      blindForAuxiliar: !!b.blindForAuxiliar,
      blindForSupervisor: !!b.blindForSupervisor,
    })
    .returning();
  const audit = inserted[0]!;

  if (productIds.length > 0) {
    const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
    const byId = new Map(products.map((p) => [p.id, p]));
    const assignees = assignedTo.length > 0 ? assignedTo : [""];
    const values = productIds
      .map((pid, i) => {
        const p = byId.get(pid);
        if (!p) return null;
        return {
          auditId: audit.id,
          productId: p.id,
          assignedTo: assignees[i % assignees.length]!,
          location: audit.location || "Sin ubicación",
          systemQty: p.systemStock,
          notes: "",
          photos: [] as string[],
          status: "pendiente" as CountStatus,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
    if (values.length > 0) await db.insert(countItemsTable).values(values);
    await recomputeAudit(audit.id);
  }

  await logActivity(req, "creó la auditoría", "audit", audit.id, audit.name);
  const fresh = (await auditById(audit.id))!;
  res.status(201).json(toAuditDTO(fresh));
});

router.patch("/audits/:id", async (req, res) => {
  const b = req.body ?? {};
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["name", "warehouse", "location", "supervisorId", "lines", "categories", "blindForAuxiliar", "blindForSupervisor"]) {
    if (b[key] !== undefined) patch[key] = b[key];
  }
  const updated = await db.update(auditsTable).set(patch).where(eq(auditsTable.id, req.params.id)).returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Auditoría no encontrada." });
    return;
  }
  await logActivity(req, "editó la auditoría", "audit", req.params.id, updated[0]!.name);
  res.json(toAuditDTO(updated[0]!));
});

router.post("/audits/:id/status", async (req, res) => {
  const status = req.body?.status as AuditStatus | undefined;
  if (!status) {
    res.status(400).json({ error: "status requerido." });
    return;
  }
  const updated = await db
    .update(auditsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(auditsTable.id, req.params.id))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Auditoría no encontrada." });
    return;
  }
  await logActivity(req, `cambió el estado a ${status}`, "audit", req.params.id, updated[0]!.name);
  res.json(toAuditDTO(updated[0]!));
});

router.post("/audits/:id/assign", async (req, res) => {
  const userIds: string[] = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  const updated = await db
    .update(auditsTable)
    .set({ assignedTo: userIds, status: userIds.length > 0 ? "asignado" : "creado", updatedAt: new Date() })
    .where(eq(auditsTable.id, req.params.id))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Auditoría no encontrada." });
    return;
  }
  // redistribute items round-robin among the new assignees
  if (userIds.length > 0) {
    const items = await db.select({ id: countItemsTable.id }).from(countItemsTable).where(eq(countItemsTable.auditId, req.params.id));
    await Promise.all(
      items.map((it, i) =>
        db.update(countItemsTable).set({ assignedTo: userIds[i % userIds.length]! }).where(eq(countItemsTable.id, it.id)),
      ),
    );
  }
  await logActivity(req, "asignó auxiliares", "audit", req.params.id, `${userIds.length} usuario(s)`);
  res.json(toAuditDTO(updated[0]!));
});

router.post("/audits/:id/close", async (req, res) => {
  const updated = await db
    .update(auditsTable)
    .set({ status: "cerrado", updatedAt: new Date() })
    .where(eq(auditsTable.id, req.params.id))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Auditoría no encontrada." });
    return;
  }
  await logActivity(req, "cerró la auditoría", "audit", req.params.id, updated[0]!.name);
  res.json(toAuditDTO(updated[0]!));
});

router.post("/audits/:id/approve-all", async (req, res) => {
  await db
    .update(countItemsTable)
    .set({ status: "aprobado", reviewNotes: "Aprobado en revisión masiva" })
    .where(and(eq(countItemsTable.auditId, req.params.id), eq(countItemsTable.status, "enviado")));
  const updated = await db
    .update(auditsTable)
    .set({ status: "aprobado", updatedAt: new Date() })
    .where(eq(auditsTable.id, req.params.id))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Auditoría no encontrada." });
    return;
  }
  await logActivity(req, "aprobó todos los conteos", "audit", req.params.id, updated[0]!.name);
  res.json(toAuditDTO(updated[0]!));
});

router.post("/audits/:id/items", async (req, res) => {
  const productIds: string[] = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
  const location = String(req.body?.location ?? "");
  const assignedTo = String(req.body?.assignedTo ?? "");
  if (productIds.length === 0) {
    res.status(400).json({ error: "productIds requerido." });
    return;
  }
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const values = products.map((p) => ({
    auditId: req.params.id,
    productId: p.id,
    assignedTo,
    location: location || "Sin ubicación",
    systemQty: p.systemStock,
    notes: "",
    photos: [] as string[],
    status: "pendiente" as CountStatus,
  }));
  if (values.length > 0) await db.insert(countItemsTable).values(values);
  await recomputeAudit(req.params.id);
  await logActivity(req, "agregó productos al conteo", "audit", req.params.id, `${values.length} ítem(s)`);
  const items = await itemsWithProducts(eq(countItemsTable.auditId, req.params.id));
  res.status(201).json(items);
});

router.delete("/audits/:id", async (req, res) => {
  const deleted = await db.delete(auditsTable).where(eq(auditsTable.id, req.params.id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Auditoría no encontrada." });
    return;
  }
  await logActivity(req, "eliminó la auditoría", "audit", req.params.id, deleted[0]!.name);
  res.status(204).end();
});

export default router;

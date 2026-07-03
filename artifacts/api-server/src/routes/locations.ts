import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  localitiesTable,
  storageLocationsTable,
  warehousesTable,
} from "@workspace/db";
import { toLocalityDTO, toStorageLocationDTO, toWarehouseDTO } from "../lib/dto";

const router: IRouter = Router();

// --- read (also included in /state; this is for standalone refresh) ---------
router.get("/locations", async (_req, res) => {
  const [localities, warehouses, storageLocations] = await Promise.all([
    db.select().from(localitiesTable).orderBy(asc(localitiesTable.name)),
    db.select().from(warehousesTable).orderBy(asc(warehousesTable.name)),
    db.select().from(storageLocationsTable).orderBy(asc(storageLocationsTable.name)),
  ]);
  res.json({
    localities: localities.map(toLocalityDTO),
    warehouses: warehouses.map(toWarehouseDTO),
    storageLocations: storageLocations.map(toStorageLocationDTO),
  });
});

// --- localities -------------------------------------------------------------
router.post("/localities", async (req, res) => {
  const { name, code, active } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "El nombre es obligatorio." });
    return;
  }
  const inserted = await db
    .insert(localitiesTable)
    .values({ name: String(name), code: code ?? "", active: active ?? true })
    .returning();
  res.status(201).json(toLocalityDTO(inserted[0]!));
});

router.patch("/localities/:id", async (req, res) => {
  const { name, code, active } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (code !== undefined) patch.code = code;
  if (active !== undefined) patch.active = active;
  const updated = await db.update(localitiesTable).set(patch).where(eq(localitiesTable.id, req.params.id)).returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Localidad no encontrada." });
    return;
  }
  res.json(toLocalityDTO(updated[0]!));
});

router.delete("/localities/:id", async (req, res) => {
  const deleted = await db.delete(localitiesTable).where(eq(localitiesTable.id, req.params.id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Localidad no encontrada." });
    return;
  }
  res.status(204).end();
});

// --- warehouses -------------------------------------------------------------
router.post("/warehouses", async (req, res) => {
  const { localityId, name, code, active } = req.body ?? {};
  if (!localityId || !name) {
    res.status(400).json({ error: "Localidad y nombre son obligatorios." });
    return;
  }
  const inserted = await db
    .insert(warehousesTable)
    .values({ localityId: String(localityId), name: String(name), code: code ?? "", active: active ?? true })
    .returning();
  res.status(201).json(toWarehouseDTO(inserted[0]!));
});

router.patch("/warehouses/:id", async (req, res) => {
  const { localityId, name, code, active } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (localityId !== undefined) patch.localityId = localityId;
  if (name !== undefined) patch.name = name;
  if (code !== undefined) patch.code = code;
  if (active !== undefined) patch.active = active;
  const updated = await db.update(warehousesTable).set(patch).where(eq(warehousesTable.id, req.params.id)).returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Almacén no encontrado." });
    return;
  }
  res.json(toWarehouseDTO(updated[0]!));
});

router.delete("/warehouses/:id", async (req, res) => {
  const deleted = await db.delete(warehousesTable).where(eq(warehousesTable.id, req.params.id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Almacén no encontrado." });
    return;
  }
  res.status(204).end();
});

// --- storage locations ------------------------------------------------------
router.post("/storage-locations", async (req, res) => {
  const { warehouseId, name, code, active } = req.body ?? {};
  if (!warehouseId || !name) {
    res.status(400).json({ error: "Almacén y nombre son obligatorios." });
    return;
  }
  const inserted = await db
    .insert(storageLocationsTable)
    .values({ warehouseId: String(warehouseId), name: String(name), code: code ?? "", active: active ?? true })
    .returning();
  res.status(201).json(toStorageLocationDTO(inserted[0]!));
});

router.patch("/storage-locations/:id", async (req, res) => {
  const { warehouseId, name, code, active } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (warehouseId !== undefined) patch.warehouseId = warehouseId;
  if (name !== undefined) patch.name = name;
  if (code !== undefined) patch.code = code;
  if (active !== undefined) patch.active = active;
  const updated = await db
    .update(storageLocationsTable)
    .set(patch)
    .where(eq(storageLocationsTable.id, req.params.id))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Ubicación no encontrada." });
    return;
  }
  res.json(toStorageLocationDTO(updated[0]!));
});

router.delete("/storage-locations/:id", async (req, res) => {
  const deleted = await db
    .delete(storageLocationsTable)
    .where(eq(storageLocationsTable.id, req.params.id))
    .returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Ubicación no encontrada." });
    return;
  }
  res.status(204).end();
});

export default router;

import path from "node:path";
import { Router, type IRouter } from "express";
import multer from "multer";
import { asc, eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { toProductDTO } from "../lib/dto";
import { logActivity } from "../lib/service";
import { UPLOAD_DIR } from "../lib/uploads";

const router: IRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.get("/products", async (_req, res) => {
  const rows = await db.select().from(productsTable).orderBy(asc(productsTable.code));
  res.json(rows.map(toProductDTO));
});

router.post("/products", async (req, res) => {
  const { code, name, category, line, unit, systemStock, active } = req.body ?? {};
  if (!code || !name) {
    res.status(400).json({ error: "Código y nombre son obligatorios." });
    return;
  }
  const inserted = await db
    .insert(productsTable)
    .values({
      code: String(code),
      name: String(name),
      category: category ?? "",
      line: line ?? "",
      unit: unit ?? "PZA",
      systemStock: Number(systemStock) || 0,
      active: active ?? true,
    })
    .returning();
  const product = inserted[0]!;
  await logActivity(req, "creó un producto", "product", product.id, product.name);
  res.status(201).json(toProductDTO(product));
});

// Bulk create/update products or update stock from an imported template.
// body: { mode: "products" | "stock", rows: [{ code, name?, category?, line?, unit?, systemStock?, active? }] }
router.post("/products/bulk", async (req, res) => {
  const mode = req.body?.mode === "stock" ? "stock" : "products";
  const rows: Array<Record<string, unknown>> = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) {
    res.status(400).json({ error: "No hay filas para importar." });
    return;
  }

  let created = 0;
  let updated = 0;
  const errors: Array<{ row: number; code: string; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const code = String(r.code ?? "").trim();
    if (!code) {
      errors.push({ row: i + 1, code: "", message: "Código vacío." });
      continue;
    }
    const existing = await db.select().from(productsTable).where(eq(productsTable.code, code)).limit(1);

    if (mode === "stock") {
      if (existing.length === 0) {
        errors.push({ row: i + 1, code, message: "Código no encontrado." });
        continue;
      }
      if (r.systemStock === undefined || r.systemStock === null || Number.isNaN(Number(r.systemStock))) {
        errors.push({ row: i + 1, code, message: "Stock inválido." });
        continue;
      }
      await db
        .update(productsTable)
        .set({ systemStock: Number(r.systemStock) })
        .where(eq(productsTable.id, existing[0]!.id));
      updated++;
      continue;
    }

    // mode === "products": upsert by code
    if (existing.length > 0) {
      const patch: Record<string, unknown> = {};
      if (r.name !== undefined) patch.name = String(r.name);
      if (r.category !== undefined) patch.category = String(r.category);
      if (r.line !== undefined) patch.line = String(r.line);
      if (r.unit !== undefined) patch.unit = String(r.unit);
      if (r.systemStock !== undefined) patch.systemStock = Number(r.systemStock) || 0;
      if (r.active !== undefined) patch.active = Boolean(r.active);
      if (Object.keys(patch).length > 0) {
        await db.update(productsTable).set(patch).where(eq(productsTable.id, existing[0]!.id));
      }
      updated++;
    } else {
      if (!r.name) {
        errors.push({ row: i + 1, code, message: "Falta el nombre para crear el producto." });
        continue;
      }
      await db.insert(productsTable).values({
        code,
        name: String(r.name),
        category: r.category ? String(r.category) : "",
        line: r.line ? String(r.line) : "",
        unit: r.unit ? String(r.unit) : "PZA",
        systemStock: Number(r.systemStock) || 0,
        active: r.active === undefined ? true : Boolean(r.active),
      });
      created++;
    }
  }

  await logActivity(req, "importó productos", "product", "bulk", `${created} creados, ${updated} actualizados`);
  res.json({ created, updated, errors });
});

// Upload a product photo (multipart, field "photo"). Stored on disk, served at /uploads.
router.post("/products/:id/photo", upload.single("photo"), async (req, res) => {
  const id = String(req.params.id);
  if (!req.file) {
    res.status(400).json({ error: "No se recibió ninguna imagen." });
    return;
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  const updated = await db
    .update(productsTable)
    .set({ imageUrl })
    .where(eq(productsTable.id, id))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Producto no encontrado." });
    return;
  }
  await logActivity(req, "actualizó la foto de un producto", "product", id, updated[0]!.name);
  res.json(toProductDTO(updated[0]!));
});

router.patch("/products/:id", async (req, res) => {
  const { code, name, category, line, unit, systemStock, active, imageUrl } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (code !== undefined) patch.code = code;
  if (name !== undefined) patch.name = name;
  if (category !== undefined) patch.category = category;
  if (line !== undefined) patch.line = line;
  if (unit !== undefined) patch.unit = unit;
  if (systemStock !== undefined) patch.systemStock = Number(systemStock) || 0;
  if (active !== undefined) patch.active = active;
  if (imageUrl !== undefined) patch.imageUrl = imageUrl;

  const updated = await db.update(productsTable).set(patch).where(eq(productsTable.id, req.params.id)).returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Producto no encontrado." });
    return;
  }
  await logActivity(req, "editó un producto", "product", req.params.id, String(name ?? ""));
  res.json(toProductDTO(updated[0]!));
});

router.delete("/products/:id", async (req, res) => {
  try {
    const deleted = await db.delete(productsTable).where(eq(productsTable.id, req.params.id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Producto no encontrado." });
      return;
    }
    await logActivity(req, "eliminó un producto", "product", req.params.id, deleted[0]!.name);
    res.status(204).end();
  } catch {
    res.status(409).json({ error: "No se puede eliminar: el producto está en uso en una o más auditorías." });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { toUserDTO } from "../lib/dto";
import { logActivity } from "../lib/service";

const router: IRouter = Router();

router.get("/users", async (_req, res) => {
  const rows = await db.select().from(usersTable).orderBy(asc(usersTable.createdAt));
  res.json(rows.map(toUserDTO));
});

router.post("/users", async (req, res) => {
  const { name, email, password, role, warehouse, active } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "Nombre, correo y contraseña son obligatorios." });
    return;
  }
  const inserted = await db
    .insert(usersTable)
    .values({
      name: String(name),
      email: String(email),
      password: String(password),
      role: role ?? "auxiliar",
      warehouse: warehouse || null,
      active: active ?? true,
    })
    .returning();
  const user = inserted[0]!;
  await logActivity(req, "creó un usuario", "user", user.id, user.name);
  res.status(201).json(toUserDTO(user));
});

router.patch("/users/:id", async (req, res) => {
  const { name, email, password, role, warehouse, active } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (email !== undefined) patch.email = email;
  if (password !== undefined && password !== "") patch.password = password;
  if (role !== undefined) patch.role = role;
  if (warehouse !== undefined) patch.warehouse = warehouse || null;
  if (active !== undefined) patch.active = active;

  const updated = await db.update(usersTable).set(patch).where(eq(usersTable.id, req.params.id)).returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }
  await logActivity(req, "editó un usuario", "user", req.params.id, String(name ?? ""));
  res.json(toUserDTO(updated[0]!));
});

router.delete("/users/:id", async (req, res) => {
  const deleted = await db.delete(usersTable).where(eq(usersTable.id, req.params.id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }
  await logActivity(req, "eliminó un usuario", "user", req.params.id, deleted[0]!.name);
  res.status(204).end();
});

export default router;

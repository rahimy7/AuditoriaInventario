import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { toUserDTO } from "../lib/dto";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!email || !password) {
    res.status(400).json({ error: "Correo y contraseña son requeridos." });
    return;
  }
  const rows = await db
    .select()
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${email}`)
    .limit(1);
  const user = rows[0];
  if (!user || user.password !== password || !user.active) {
    res.status(401).json({ error: "Credenciales inválidas." });
    return;
  }
  res.json({ token: user.id, user: toUserDTO(user) });
});

export default router;

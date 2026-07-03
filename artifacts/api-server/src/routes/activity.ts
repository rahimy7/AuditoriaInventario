import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { activityTable, db } from "@workspace/db";
import { toActivityDTO } from "../lib/dto";

const router: IRouter = Router();

router.get("/activity", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const rows = await db.select().from(activityTable).orderBy(desc(activityTable.timestamp)).limit(limit);
  res.json(rows.map(toActivityDTO));
});

export default router;

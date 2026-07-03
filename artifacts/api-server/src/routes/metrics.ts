import { Router, type IRouter } from "express";
import { auditsTable, countItemsTable, db, productsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

// Aggregated dashboard metrics: data quality + inventory control indicators.
router.get("/metrics", async (_req, res) => {
  const [audits, items, products, users] = await Promise.all([
    db.select().from(auditsTable),
    db.select().from(countItemsTable),
    db.select().from(productsTable),
    db.select().from(usersTable),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const total = items.length;
  const counted = items.filter((i) => i.countedQty !== null);
  const countedN = counted.length;

  let exact = 0;
  let shortageCount = 0;
  let surplusCount = 0;
  let shortageUnits = 0;
  let surplusUnits = 0;
  let netVariance = 0;
  let absVariance = 0;

  for (const i of counted) {
    const diff = (i.countedQty as number) - i.systemQty;
    netVariance += diff;
    absVariance += Math.abs(diff);
    if (diff === 0) exact++;
    else if (diff < 0) {
      shortageCount++;
      shortageUnits += -diff;
    } else {
      surplusCount++;
      surplusUnits += diff;
    }
  }

  const withDiff = countedN - exact;
  const coveragePct = pct(countedN, total);
  const accuracyPct = pct(exact, countedN);
  const discrepancyRatePct = pct(withDiff, countedN);
  const dataQualityScore = Math.round(0.4 * coveragePct + 0.4 * accuracyPct + 0.2 * (100 - discrepancyRatePct));

  // audits by status
  const statusCounts = new Map<string, number>();
  for (const a of audits) statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1);
  const auditsByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

  // per auxiliar
  const auxMap = new Map<string, { assigned: number; counted: number; submitted: number; exact: number }>();
  for (const i of items) {
    if (!i.assignedTo) continue;
    const rec = auxMap.get(i.assignedTo) ?? { assigned: 0, counted: 0, submitted: 0, exact: 0 };
    rec.assigned++;
    if (i.countedQty !== null) {
      rec.counted++;
      if (i.countedQty === i.systemQty) rec.exact++;
    }
    if (i.status === "enviado" || i.status === "aprobado") rec.submitted++;
    auxMap.set(i.assignedTo, rec);
  }
  const byAuxiliar = Array.from(auxMap.entries())
    .map(([userId, r]) => ({
      userId,
      name: userById.get(userId)?.name ?? "Sin asignar",
      assigned: r.assigned,
      counted: r.counted,
      submitted: r.submitted,
      exact: r.exact,
      accuracyPct: pct(r.exact, r.counted),
    }))
    .sort((a, b) => b.counted - a.counted);

  // top discrepancies (by absolute diff)
  const topDiscrepancies = counted
    .map((i) => {
      const p = productById.get(i.productId);
      return {
        productId: i.productId,
        code: p?.code ?? "—",
        name: p?.name ?? "Producto eliminado",
        systemQty: i.systemQty,
        countedQty: i.countedQty as number,
        diff: (i.countedQty as number) - i.systemQty,
      };
    })
    .filter((d) => d.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 10);

  // per category
  const catMap = new Map<string, { items: number; counted: number; discrepancies: number }>();
  for (const i of items) {
    const cat = productById.get(i.productId)?.category || "Sin categoría";
    const rec = catMap.get(cat) ?? { items: 0, counted: 0, discrepancies: 0 };
    rec.items++;
    if (i.countedQty !== null) {
      rec.counted++;
      if (i.countedQty !== i.systemQty) rec.discrepancies++;
    }
    catMap.set(cat, rec);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, r]) => ({
      category,
      items: r.items,
      counted: r.counted,
      discrepancies: r.discrepancies,
      accuracyPct: pct(r.counted - r.discrepancies, r.counted),
    }))
    .sort((a, b) => b.items - a.items);

  // per warehouse (from audit)
  const auditById = new Map(audits.map((a) => [a.id, a]));
  const whMap = new Map<string, { items: number; counted: number; discrepancies: number }>();
  for (const i of items) {
    const wh = auditById.get(i.auditId)?.warehouse || "Sin almacén";
    const rec = whMap.get(wh) ?? { items: 0, counted: 0, discrepancies: 0 };
    rec.items++;
    if (i.countedQty !== null) {
      rec.counted++;
      if (i.countedQty !== i.systemQty) rec.discrepancies++;
    }
    whMap.set(wh, rec);
  }
  const byWarehouse = Array.from(whMap.entries())
    .map(([warehouse, r]) => ({ warehouse, items: r.items, counted: r.counted, discrepancies: r.discrepancies }))
    .sort((a, b) => b.items - a.items);

  res.json({
    totals: {
      audits: audits.length,
      products: products.length,
      activeProducts: products.filter((p) => p.active).length,
      countItems: total,
    },
    coveragePct,
    accuracyPct,
    discrepancyRatePct,
    dataQualityScore,
    exactCount: exact,
    shortageCount,
    surplusCount,
    shortageUnits,
    surplusUnits,
    netVarianceUnits: netVariance,
    absVarianceUnits: absVariance,
    auditsByStatus,
    byAuxiliar,
    topDiscrepancies,
    byCategory,
    byWarehouse,
  });
});

export default router;

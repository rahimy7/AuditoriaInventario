import { Router, type IRouter } from "express";
import { asc, desc } from "drizzle-orm";
import {
  activityTable,
  auditsTable,
  db,
  localitiesTable,
  productsTable,
  storageLocationsTable,
  usersTable,
  warehousesTable,
} from "@workspace/db";
import {
  toActivityDTO,
  toAuditDTO,
  toLocalityDTO,
  toProductDTO,
  toStorageLocationDTO,
  toUserDTO,
  toWarehouseDTO,
} from "../lib/dto";
import { itemsWithProducts } from "../lib/service";

const router: IRouter = Router();

// Single call the clients use to hydrate their whole store after login.
router.get("/state", async (_req, res) => {
  const [users, products, audits, countItems, activity, localities, warehouses, storageLocations] = await Promise.all([
    db.select().from(usersTable).orderBy(asc(usersTable.createdAt)),
    db.select().from(productsTable).orderBy(asc(productsTable.code)),
    db.select().from(auditsTable).orderBy(desc(auditsTable.updatedAt)),
    itemsWithProducts(),
    db.select().from(activityTable).orderBy(desc(activityTable.timestamp)).limit(500),
    db.select().from(localitiesTable).orderBy(asc(localitiesTable.name)),
    db.select().from(warehousesTable).orderBy(asc(warehousesTable.name)),
    db.select().from(storageLocationsTable).orderBy(asc(storageLocationsTable.name)),
  ]);

  res.json({
    users: users.map(toUserDTO),
    products: products.map(toProductDTO),
    audits: audits.map(toAuditDTO),
    countItems,
    activity: activity.map(toActivityDTO),
    localities: localities.map(toLocalityDTO),
    warehouses: warehouses.map(toWarehouseDTO),
    storageLocations: storageLocations.map(toStorageLocationDTO),
  });
});

export default router;

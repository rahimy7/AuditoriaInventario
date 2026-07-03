import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import stateRouter from "./state";
import usersRouter from "./users";
import productsRouter from "./products";
import auditsRouter from "./audits";
import countItemsRouter from "./countItems";
import activityRouter from "./activity";
import locationsRouter from "./locations";
import metricsRouter from "./metrics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(stateRouter);
router.use(usersRouter);
router.use(productsRouter);
router.use(auditsRouter);
router.use(countItemsRouter);
router.use(activityRouter);
router.use(locationsRouter);
router.use(metricsRouter);

export default router;

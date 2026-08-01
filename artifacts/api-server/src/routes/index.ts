import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userRouter from "./user";
import analyticsRouter from "./analytics";
import adminRouter from "./admin";
import kycRouter from "./kyc";
import tasksRouter from "./tasks";
import depositRouter from "./deposit";
import affiliatesRouter from "./affiliates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userRouter);
router.use(analyticsRouter);
router.use(adminRouter);
router.use(kycRouter);
router.use(tasksRouter);
router.use(depositRouter);
router.use(affiliatesRouter);

export default router;

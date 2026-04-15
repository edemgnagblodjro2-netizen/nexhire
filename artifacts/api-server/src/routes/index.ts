import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import authRouter from "./auth";
import stripeRouter from "./stripe";
import servicesRouter from "./services";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(authRouter);
router.use(stripeRouter);
router.use(servicesRouter);

export default router;

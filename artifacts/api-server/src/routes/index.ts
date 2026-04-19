import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import transcribeRouter from "./transcribe";
import authRouter from "./auth";
import stripeRouter from "./stripe";
import servicesRouter from "./services";
import organisationsRouter from "./organisations";
import clientsRouter from "./clients";
import appointmentsRouter from "./appointments";
import teamRouter from "./team";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(transcribeRouter);
router.use(authRouter);
router.use(stripeRouter);
router.use(servicesRouter);
router.use(organisationsRouter);
router.use(clientsRouter);
router.use(appointmentsRouter);
router.use(teamRouter);

export default router;

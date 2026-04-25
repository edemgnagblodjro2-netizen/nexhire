import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import transcribeRouter from "./transcribe";
import authRouter from "./auth";
import stripeRouter from "./stripe";
import servicesRouter from "./services";
import organisationsRouter from "./organisations";
import verificationsRouter from "./verifications";
import b2gRouter from "./b2g";
import waitRouter from "./wait";
import bugReportsRouter from "./bugReports";
import searchEventsRouter from "./searchEvents";
import referralsRouter from "./referrals";

// Pivot v1.0.33 — sensitive-data modules retired:
// `clients`, `appointments`, `team`, and the activity-feed endpoints have been
// pulled from the public surface. The route files and DB tables are kept on
// disk so the work can be revived if the product direction changes, but
// nothing routes traffic into them anymore. This eliminates AttenteZéro's
// custodianship of beneficiary case-files and lets us focus the offering on
// the public-facing directory + AI assistant + B2G dashboards.

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(transcribeRouter);
router.use(authRouter);
router.use(stripeRouter);
router.use(servicesRouter);
router.use(organisationsRouter);
router.use(verificationsRouter);
router.use(b2gRouter);
router.use(waitRouter);
router.use(bugReportsRouter);
router.use(searchEventsRouter);
router.use(referralsRouter);

export default router;

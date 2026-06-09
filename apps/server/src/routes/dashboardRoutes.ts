import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController";
import { checkAdminAccess } from "../middlewares/authMiddleware";

const router: Router = Router();

router.use(checkAdminAccess);

router.get('/stats', getDashboardStats);

export default router;
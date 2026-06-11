import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController";
import { checkAdminAccess, checkTenantAccess } from "../middlewares/authMiddleware";

const router: Router = Router();

router.use(checkAdminAccess);
router.use(checkTenantAccess);

router.get('/stats', getDashboardStats);

export default router;
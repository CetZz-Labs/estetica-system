import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { requireAuth } from "@clerk/express";
import { checkAdminAccess } from "../middlewares/authMiddleware";

const router: Router = Router();

router.get('/', AdminController.getAdmin);

export default router;
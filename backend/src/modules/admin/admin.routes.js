import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { getDashboard, listComplaints, updateComplaintStatus } from "./admin.controller.js";

const router = Router();

router.get("/dashboard", authenticate, authorize("admin"), getDashboard);
router.get("/complaints", authenticate, authorize("admin"), listComplaints);
router.patch("/complaints/:id/status", authenticate, authorize("admin"), updateComplaintStatus);

export default router;

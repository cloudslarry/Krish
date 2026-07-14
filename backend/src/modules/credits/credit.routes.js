import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { adjustCredits, getCredits } from "./credit.controller.js";

const router = Router();

router.get("/:citizenId", authenticate, authorize("admin", "citizen"), getCredits);
router.post("/:citizenId", authenticate, authorize("admin"), adjustCredits);

export default router;

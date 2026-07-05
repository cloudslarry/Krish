import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import { getDashboard, getProfile, getRewards, redeemReward, submitComplaint, updateComplaintStatus, upload } from "./citizen.controller.js";

const router = Router();

router.get("/profile", authenticate, getProfile);
router.get("/dashboard", authenticate, getDashboard);
router.get("/rewards", authenticate, getRewards);
router.post("/complaints", authenticate, upload.single("image"), submitComplaint);
router.post("/rewards/:rewardId/redeem", authenticate, redeemReward);
router.patch("/complaints/:id/status", authenticate, updateComplaintStatus);

export default router;

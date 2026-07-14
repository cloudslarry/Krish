import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import {
  deleteComplaint,
  getDashboard,
  getProfile,
  getRewards,
  listComplaints,
  redeemReward,
  submitComplaint,
  updateComplaintStatus,
} from "./citizen.controller.js";

const router = Router();

router.get("/profile", authenticate, getProfile);
router.get("/dashboard", authenticate, getDashboard);
router.get("/rewards", authenticate, getRewards);
router.get("/complaints", authenticate, listComplaints);
router.post("/complaints", authenticate, submitComplaint);
router.post("/rewards/:rewardId/redeem", authenticate, redeemReward);
router.delete("/complaints/:id", authenticate, deleteComplaint);
router.patch("/complaints/:id/status", authenticate, updateComplaintStatus);

export default router;

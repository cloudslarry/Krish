import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { createBin, getBin, listBins, patchBin } from "./bin.controller.js";

const router = Router();

router.get("/", authenticate, authorize("admin"), listBins);
router.post("/", authenticate, authorize("admin"), createBin);
router.get("/:id", authenticate, authorize("admin"), getBin);
router.patch("/:id", authenticate, authorize("admin"), patchBin);

export default router;

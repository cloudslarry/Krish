import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import {
  assignComplaintToWorker,
  createTask,
  listTasksForWorker,
  listWorkers,
  updateTaskStatus,
} from "./worker.controller.js";

const router = Router();

router.get("/workers", authenticate, authorize("admin"), listWorkers);
router.post("/tasks", authenticate, authorize("admin"), createTask);
router.get("/tasks", authenticate, authorize("worker"), listTasksForWorker);
router.patch("/tasks/:id/status", authenticate, authorize("worker"), updateTaskStatus);
router.post("/complaints/assign", authenticate, authorize("admin"), assignComplaintToWorker);

export default router;

import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as workerService from "../worker/worker.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const router = Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      const tasks = await workerService.listAllTasks();
      return ApiResponse.ok(res, "Tasks loaded", tasks);
    }

    const tasks = await workerService.listTasksForWorker({ workerId: req.user.id });
    return ApiResponse.ok(res, "Tasks loaded", tasks);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const task = await workerService.createTask({
      ...req.body,
      assignedBy: req.user.id,
    });
    ApiResponse.ok(res, "Task created", task);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", authenticate, authorize("worker"), async (req, res, next) => {
  try {
    const task = await workerService.updateTaskStatus({
      taskId: req.params.id,
      workerId: req.user.id,
      status: req.body.status,
    });
    ApiResponse.ok(res, "Task updated", task);
  } catch (error) {
    next(error);
  }
});

export default router;

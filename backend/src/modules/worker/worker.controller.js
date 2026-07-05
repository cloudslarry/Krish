import ApiResponse from "../../common/utils/api-response.js";
import * as workerService from "./worker.service.js";

const listWorkers = async (req, res, next) => {
  try {
    const workers = await workerService.listWorkers();
    ApiResponse.ok(res, "Workers loaded", workers);
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const task = await workerService.createTask({
      ...req.body,
      assignedBy: req.user?.id,
    });
    ApiResponse.ok(res, "Task created", task);
  } catch (error) {
    next(error);
  }
};

const listTasksForWorker = async (req, res, next) => {
  try {
    const tasks = await workerService.listTasksForWorker({ workerId: req.user.id });
    ApiResponse.ok(res, "Worker tasks loaded", tasks);
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
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
};

const assignComplaintToWorker = async (req, res, next) => {
  try {
    const result = await workerService.assignComplaintToWorker({
      complaintId: req.body.complaintId,
      workerId: req.body.workerId,
      adminUserId: req.user.id,
    });
    ApiResponse.ok(res, "Complaint assigned to worker", result);
  } catch (error) {
    next(error);
  }
};

export { listWorkers, createTask, listTasksForWorker, updateTaskStatus, assignComplaintToWorker };

import mongoose from "mongoose";
import ApiError from "../../common/utils/api-error.js";
import User from "../auth/auth.model.js";
import { Complaint } from "../citizen/citizen.model.js";
import { Task, TaskAuditLog } from "./worker.model.js";

const mapTask = (task) => ({
  _id: task._id,
  id: String(task._id),
  taskId: String(task._id),
  title: task.title,
  description: task.description,
  assignedDate: task.assignedDate?.toISOString() ?? null,
  completedDate: task.completedDate?.toISOString() ?? null,
  binId: task.binId,
  location: task.location,
  wasteType: task.wasteType,
  priority: task.priority,
  status: task.status,
  workerId: String(task.workerId),
  complaintId: task.complaintId ? String(task.complaintId) : null,
  assignedBy: task.assignedBy ? String(task.assignedBy) : null,
  source: task.source,
});

const listWorkers = async () => {
  const workers = await User.find({ role: { $regex: /^worker$/i } }).select("_id name role email phone").lean();
  return workers.map((worker) => ({
    _id: worker._id,
    id: String(worker._id),
    name: worker.name,
    role: String(worker.role).toLowerCase(),
    email: worker.email,
    phone: worker.phone,
  }));
};

const createTask = async ({ title, description, workerId, binId, location, wasteType, priority, complaintId, assignedBy }) => {
  const worker = await User.findById(workerId);
  if (!worker || String(worker.role).toLowerCase() !== "worker") {
    throw ApiError.notFound("Worker not found");
  }

  const task = await Task.create({
    workerId: mongoose.Types.ObjectId.isValid(workerId) ? new mongoose.Types.ObjectId(workerId) : workerId,
    complaintId: complaintId ? (mongoose.Types.ObjectId.isValid(complaintId) ? new mongoose.Types.ObjectId(complaintId) : complaintId) : null,
    title,
    description,
    binId: binId ?? "",
    location: location ?? "",
    wasteType: wasteType ?? "General",
    priority: priority ?? "Medium",
    status: "Pending",
    assignedBy: assignedBy && mongoose.Types.ObjectId.isValid(assignedBy) ? new mongoose.Types.ObjectId(assignedBy) : assignedBy,
    source: complaintId ? "complaint" : "admin",
  });

  await TaskAuditLog.create({
    taskId: task._id,
    actorId: assignedBy ?? workerId,
    actorRole: "admin",
    action: "created",
    details: `Assigned task to ${worker.name}`,
  });

  return mapTask(task);
};

const listTasksForWorker = async ({ workerId }) => {
  if (!workerId) {
    throw ApiError.badRequest("Worker ID is required");
  }

  const workerQueryId = mongoose.Types.ObjectId.isValid(workerId)
    ? mongoose.Types.ObjectId(workerId)
    : workerId;

  const tasks = await Task.find({ workerId: workerQueryId }).sort({ assignedDate: -1 }).lean();
  return tasks.map(mapTask);
};

const updateTaskStatus = async ({ taskId, workerId, status }) => {
  if (!taskId) {
    throw ApiError.badRequest("Task ID is required");
  }

  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound("Task not found");
  if (task.workerId.toString() !== String(workerId)) {
    throw ApiError.forbidden("You cannot update another worker's task");
  }

  task.status = status;
  if (status === "Completed") {
    task.completedDate = new Date();
  }
  await task.save();

  await TaskAuditLog.create({
    taskId: task._id,
    actorId: workerId,
    actorRole: "worker",
    action: "status_updated",
    details: `Task marked as ${status}`,
  });

  return mapTask(task);
};

const assignComplaintToWorker = async ({ complaintId, workerId, adminUserId }) => {
  if (!mongoose.Types.ObjectId.isValid(complaintId)) {
    throw ApiError.badRequest("Invalid complaint ID");
  }
  if (!mongoose.Types.ObjectId.isValid(workerId)) {
    throw ApiError.badRequest("Invalid worker ID");
  }

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound("Complaint not found");

  const worker = await User.findById(workerId);
  if (!worker || String(worker.role).toLowerCase() !== "worker") {
    throw ApiError.notFound("Worker not found");
  }

  const task = await Task.create({
    workerId: mongoose.Types.ObjectId(workerId),
    complaintId: mongoose.Types.ObjectId(complaintId),
    title: `Complaint: ${complaint.complaintType || "General"}`,
    description: complaint.description,
    binId: complaint.location || "",
    location: complaint.location || "",
    wasteType: complaint.complaintType || "General",
    priority: complaint.status === "Resolved" ? "Low" : "High",
    status: "Pending",
    assignedBy: mongoose.Types.ObjectId(adminUserId),
    source: "complaint",
  });

  complaint.status = "Assigned";
  await complaint.save();

  await TaskAuditLog.create({
    taskId: task._id,
    actorId: mongoose.Types.ObjectId(adminUserId),
    actorRole: "admin",
    action: "complaint_assigned",
    details: `Assigned complaint ${complaintId} to ${worker.name}`,
  });

  return { task: mapTask(task), complaint };
};

export { listWorkers, createTask, listTasksForWorker, updateTaskStatus, assignComplaintToWorker };

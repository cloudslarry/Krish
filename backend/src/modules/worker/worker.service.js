import ApiError from "../../common/utils/api-error.js";
import User from "../auth/auth.model.js";
import { Complaint } from "../citizen/citizen.model.js";
import { Task, TaskAuditLog } from "./worker.model.js";

const mapTask = (task) => ({
  _id: task._id,
  id: task._id,
  taskId: task._id,
  title: task.title,
  description: task.description,
  assignedDate: task.assignedDate,
  completedDate: task.completedDate,
  binId: task.binId,
  location: task.location,
  wasteType: task.wasteType,
  priority: task.priority,
  status: task.status,
  workerId: task.workerId,
  complaintId: task.complaintId,
  assignedBy: task.assignedBy,
  source: task.source,
});

const listWorkers = async () => {
  const workers = await User.find({ role: "worker" }).select("_id name role email phone").lean();
  return workers.map((worker) => ({
    _id: worker._id,
    id: worker._id,
    name: worker.name,
    role: worker.role,
    email: worker.email,
    phone: worker.phone,
  }));
};

const createTask = async ({ title, description, workerId, binId, location, wasteType, priority, complaintId, assignedBy }) => {
  const worker = await User.findById(workerId);
  if (!worker || worker.role !== "worker") {
    throw ApiError.notFound("Worker not found");
  }

  const task = await Task.create({
    workerId,
    complaintId: complaintId ?? null,
    title,
    description,
    binId: binId ?? "",
    location: location ?? "",
    wasteType: wasteType ?? "General",
    priority: priority ?? "Medium",
    status: "Pending",
    assignedBy: assignedBy ?? null,
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
  const tasks = await Task.find({ workerId }).sort({ assignedDate: -1 });
  return tasks.map(mapTask);
};

const updateTaskStatus = async ({ taskId, workerId, status }) => {
  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound("Task not found");
  if (task.workerId.toString() !== workerId.toString()) {
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
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound("Complaint not found");

  const worker = await User.findById(workerId);
  if (!worker || worker.role !== "worker") {
    throw ApiError.notFound("Worker not found");
  }

  const task = await Task.create({
    workerId,
    complaintId,
    title: `Complaint: ${complaint.complaintType || "General"}`,
    description: complaint.description,
    binId: complaint.location || "",
    location: complaint.location || "",
    wasteType: complaint.complaintType || "General",
    priority: complaint.status === "Resolved" ? "Low" : "High",
    status: "Pending",
    assignedBy: adminUserId,
    source: "complaint",
  });

  complaint.status = "Assigned";
  await complaint.save();

  await TaskAuditLog.create({
    taskId: task._id,
    actorId: adminUserId,
    actorRole: "admin",
    action: "complaint_assigned",
    details: `Assigned complaint ${complaintId} to ${worker.name}`,
  });

  return { task: mapTask(task), complaint };
};

export { listWorkers, createTask, listTasksForWorker, updateTaskStatus, assignComplaintToWorker };

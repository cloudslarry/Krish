import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    assignedDate: { type: Date, default: Date.now },
    completedDate: { type: Date, default: null },
    binId: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    wasteType: { type: String, trim: true, default: "General" },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "In Progress", "Completed"],
      default: "Pending",
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    source: { type: String, trim: true, default: "admin" },
  },
  { timestamps: true },
);

const taskAuditLogSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "worker"],
      required: true,
    },
    action: { type: String, required: true, trim: true },
    details: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Task = mongoose.model("Task", taskSchema);
export const TaskAuditLog = mongoose.model("TaskAuditLog", taskAuditLogSchema);

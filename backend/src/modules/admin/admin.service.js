import ApiError from "../../common/utils/api-error.js";
import User from "../auth/auth.model.js";
import { Complaint } from "../citizen/citizen.model.js";
import Bin from "../bins/bin.model.js";
import * as citizenService from "../citizen/citizen.service.js";
import { Task } from "../worker/worker.model.js";

const mapComplaint = (complaint) => ({
  _id: complaint._id,
  id: complaint._id,
  userId: complaint.userId,
  name: complaint.name,
  citizenName: complaint.name,
  complaintType: complaint.complaintType ?? "General",
  description: complaint.description,
  location: complaint.location,
  imagePath: complaint.imagePath,
  imageName: complaint.imageName,
  status: complaint.status,
  submittedAt: complaint.submittedAt,
  createdAt: complaint.submittedAt,
});

const getDashboardData = async () => {
  const [complaints, workers, tasks, bins] = await Promise.all([
    Complaint.find().sort({ submittedAt: -1 }),
    User.find({ role: { $regex: /^worker$/i } }).select("_id name role email phone").lean(),
    Task.find().sort({ assignedDate: -1 }),
    Bin.find().sort({ binId: 1 }).lean(),
  ]);

  const openComplaints = complaints.filter((item) => item.status !== "Resolved").length;

  return {
    counts: {
      totalBins: bins.length,
      totalComplaints: complaints.length,
      openComplaints,
      resolvedComplaints: complaints.length - openComplaints,
      activeWorkers: workers.length,
    },
    bins,
    complaints: complaints.map(mapComplaint),
    workers,
    tasks: tasks.map((task) => ({
      _id: task._id,
      id: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      workerId: task.workerId,
      complaintId: task.complaintId,
      assignedDate: task.assignedDate,
      completedDate: task.completedDate,
      binId: task.binId,
      location: task.location,
      wasteType: task.wasteType,
    })),
  };
};

const listComplaints = async () => {
  const complaints = await Complaint.find().sort({ submittedAt: -1 });
  return complaints.map(mapComplaint);
};

const updateComplaintStatus = async ({ complaintId, status, adminUserId }) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound("Complaint not found");

  const result = await citizenService.updateComplaintStatus({
    complaintId,
    status,
    adminUserId,
  });

  return result;
};

export { getDashboardData, listComplaints, updateComplaintStatus };

import ApiResponse from "../../common/utils/api-response.js";
import * as citizenService from "./citizen.service.js";

const getProfile = async (req, res, next) => {
  try {
    const data = await citizenService.getUserProfile(req.user.id);
    ApiResponse.ok(res, "User profile loaded", data);
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const data = await citizenService.getDashboardData(req.user.id);
    ApiResponse.ok(res, "Citizen dashboard loaded", data);
  } catch (error) {
    next(error);
  }
};

const submitComplaint = async (req, res, next) => {
  try {
    const payload = {
      userId: req.user.id,
      name: req.body.name,
      contact: req.body.contact,
      location: req.body.location,
      description: req.body.description,
      complaintType: req.body.complaintType,
      imageData: req.body.imageData,
      imageName: req.body.imageName,
      fileType: req.body.fileType,
    };

    const complaint = await citizenService.createComplaint(payload);
    ApiResponse.created(res, "Complaint submitted successfully", complaint);
  } catch (error) {
    next(error);
  }
};

const listComplaints = async (req, res, next) => {
  try {
    const complaints = await citizenService.listComplaints({
      userId: req.user.role === "admin" ? undefined : req.user.id,
    });
    ApiResponse.ok(res, "Complaints loaded", complaints);
  } catch (error) {
    next(error);
  }
};

const deleteComplaint = async (req, res, next) => {
  try {
    const result = await citizenService.deleteComplaint({
      complaintId: req.params.id,
    });
    ApiResponse.ok(res, "Complaint deleted", result);
  } catch (error) {
    next(error);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const result = await citizenService.updateComplaintStatus({
      complaintId: req.params.id,
      status: req.body.status,
      adminUserId: req.user.id,
    });
    ApiResponse.ok(res, "Complaint status updated", result);
  } catch (error) {
    next(error);
  }
};

const redeemReward = async (req, res, next) => {
  try {
    const result = await citizenService.redeemReward({
      userId: req.user.id,
      rewardId: req.params.rewardId,
    });
    ApiResponse.ok(res, "Reward redeemed successfully", result);
  } catch (error) {
    next(error);
  }
};

const getRewards = async (req, res, next) => {
  try {
    const rewards = await citizenService.getRewards();
    ApiResponse.ok(res, "Rewards loaded", rewards);
  } catch (error) {
    next(error);
  }
};

export {
  getProfile,
  getDashboard,
  submitComplaint,
  listComplaints,
  deleteComplaint,
  updateComplaintStatus,
  redeemReward,
  getRewards,
};

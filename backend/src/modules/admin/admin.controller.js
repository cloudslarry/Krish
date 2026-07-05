import ApiResponse from "../../common/utils/api-response.js";
import * as adminService from "./admin.service.js";

const getDashboard = async (req, res, next) => {
  try {
    const data = await adminService.getDashboardData();
    ApiResponse.ok(res, "Admin dashboard loaded", data);
  } catch (error) {
    next(error);
  }
};

const listComplaints = async (req, res, next) => {
  try {
    const complaints = await adminService.listComplaints();
    ApiResponse.ok(res, "Complaints loaded", complaints);
  } catch (error) {
    next(error);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const result = await adminService.updateComplaintStatus({
      complaintId: req.params.id,
      status: req.body.status,
      adminUserId: req.user.id,
    });
    ApiResponse.ok(res, "Complaint updated", result);
  } catch (error) {
    next(error);
  }
};

export { getDashboard, listComplaints, updateComplaintStatus };

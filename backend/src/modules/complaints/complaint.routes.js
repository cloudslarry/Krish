import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as citizenService from "../citizen/citizen.service.js";
import * as workerService from "../worker/worker.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const complaints = await citizenService.listComplaints({
      userId: req.user.role === "admin" ? undefined : req.user.id,
    });
    ApiResponse.ok(res, "Complaints loaded", complaints);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, upload.single("image"), async (req, res, next) => {
  try {
    const complaint = await citizenService.createComplaint({
      userId: req.user.id,
      name: req.body.name,
      contact: req.body.contact,
      location: req.body.location,
      description: req.body.description,
      complaintType: req.body.complaintType,
      imageBuffer: req.file?.buffer,
      imageName: req.file?.originalname ?? req.body.imageName,
      fileType: req.file?.mimetype,
    });
    ApiResponse.created(res, "Complaint submitted successfully", complaint);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await citizenService.deleteComplaint({
      complaintId: req.params.id,
    });
    ApiResponse.ok(res, "Complaint deleted", result);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await citizenService.updateComplaintStatus({
      complaintId: req.params.id,
      status: req.body.status,
      adminUserId: req.user.id,
    });
    ApiResponse.ok(res, "Complaint updated", result);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/assign", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await workerService.assignComplaintToWorker({
      complaintId: req.params.id,
      workerId: req.body.workerId,
      adminUserId: req.user.id,
    });
    ApiResponse.ok(res, "Complaint assigned to worker", result);
  } catch (error) {
    next(error);
  }
});

export default router;

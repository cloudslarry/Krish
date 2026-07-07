import mongoose from "mongoose";
import User from "../auth/auth.model.js";

const complaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    complaintType: { type: String, trim: true, default: "General" },
    imagePath: { type: String, required: true },
    imageName: { type: String, trim: true, default: "complaint-image" },
    status: {
      type: String,
      enum: ["Pending", "Assigned", "Under Review", "Approved", "Rejected", "Resolved"],
      default: "Pending",
    },
    creditsAwarded: { type: Number, default: 0, min: 0 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const rewardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    creditCost: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const redemptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      required: true,
    },
    creditsUsed: { type: Number, required: true, min: 0 },
    redemptionDate: { type: Date, default: Date.now },
    deliveryStatus: {
      type: String,
      enum: ["Processing", "Delivered", "Cancelled"],
      default: "Processing",
    },
  },
  { timestamps: true },
);

const cleanupEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    refreshmentInfo: { type: String, default: "Water and snacks" },
    weekLabel: { type: String, default: "4th Saturday" },
  },
  { timestamps: true },
);

export { User };
export const Complaint = mongoose.model("Complaint", complaintSchema);
export const Reward = mongoose.model("Reward", rewardSchema);
export const Redemption = mongoose.model("Redemption", redemptionSchema);
export const CleanupEvent = mongoose.model("CleanupEvent", cleanupEventSchema);

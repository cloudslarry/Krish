import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ApiError from "../../common/utils/api-error.js";
import { Complaint, CleanupEvent, Redemption, Reward, User } from "./citizen.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../../../../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    greenCredits: user.greenCredits,
    role: user.role,
    createdAt: user.createdAt,
  };
};

const getDashboardData = async (userId) => {
  const [user, complaints, rewards, redemptions, cleanupEvents] = await Promise.all([
    User.findById(userId),
    Complaint.find({ userId }).sort({ submittedAt: -1 }),
    Reward.find({ isActive: true }).sort({ creditCost: 1 }),
    Redemption.find({ userId }).sort({ redemptionDate: -1 }),
    CleanupEvent.find().sort({ date: 1 }),
  ]);

  if (!user) throw ApiError.notFound("User not found");

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      greenCredits: user.greenCredits,
      role: user.role,
    },
    complaints,
    rewards,
    redemptions,
    cleanupEvents,
  };
};

const createComplaint = async ({ userId, name, contact, location, description, imageBuffer, imageName }) => {
  if (!name?.trim()) throw ApiError.badRequest("Name cannot be empty");
  if (!contact?.trim()) throw ApiError.badRequest("Phone or email is required");
  if (!location?.trim()) throw ApiError.badRequest("Location is required");
  if (!description?.trim()) throw ApiError.badRequest("Complaint description is required");
  if (!imageBuffer || !imageName) throw ApiError.badRequest("Image upload is required");

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validPhone = /^\+?[0-9\s()-]{7,15}$/;
  if (!validEmail.test(contact) && !validPhone.test(contact)) {
    throw ApiError.badRequest("Please provide a valid phone number or email");
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentComplaint = await Complaint.findOne({
    userId,
    submittedAt: { $gte: oneWeekAgo },
  });

  if (recentComplaint) {
    throw ApiError.badRequest("You can submit only one complaint per week");
  }

  const extension = path.extname(imageName).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png"];
  if (!allowedExtensions.includes(extension)) {
    throw ApiError.badRequest("Only JPG, JPEG, and PNG images are allowed");
  }

  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  const imagePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(imagePath, imageBuffer);

  const complaint = await Complaint.create({
    userId,
    name,
    contact,
    location,
    description,
    imagePath: `/uploads/${fileName}`,
    status: "Pending",
    creditsAwarded: 0,
  });

  return complaint;
};

const updateComplaintStatus = async ({ complaintId, status, adminUserId }) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound("Complaint not found");

  const user = await User.findById(complaint.userId);
  if (!user) throw ApiError.notFound("User not found");

  if (status === "Approved" && complaint.status !== "Approved") {
    user.greenCredits = Math.max(0, (user.greenCredits || 0) + 100);
    complaint.creditsAwarded = 100;
    await user.save();
  }

  complaint.status = status;
  await complaint.save();

  return {
    complaint,
    user: {
      id: user._id,
      greenCredits: user.greenCredits,
    },
    adminUserId,
  };
};

const redeemReward = async ({ userId, rewardId }) => {
  const [user, reward] = await Promise.all([
    User.findById(userId),
    Reward.findById(rewardId),
  ]);

  if (!user) throw ApiError.notFound("User not found");
  if (!reward || !reward.isActive) throw ApiError.notFound("Reward not found");
  if (reward.stockQuantity < 1) throw ApiError.badRequest("Reward is out of stock");
  if (user.greenCredits < reward.creditCost) {
    throw ApiError.badRequest("Insufficient credits for this reward");
  }

  user.greenCredits = Math.max(0, user.greenCredits - reward.creditCost);
  reward.stockQuantity = Math.max(0, reward.stockQuantity - 1);
  await user.save();
  await reward.save();

  const redemption = await Redemption.create({
    userId,
    rewardId,
    creditsUsed: reward.creditCost,
    deliveryStatus: "Processing",
  });

  return { user, reward, redemption };
};

const getRewards = async () => {
  return Reward.find({ isActive: true }).sort({ creditCost: 1 });
};

const seedDefaultData = async () => {
  const existingRewards = await Reward.countDocuments();
  if (existingRewards === 0) {
    await Reward.insertMany([
      { name: "Boat Headphones", image: "🎧", creditCost: 450, stockQuantity: 6 },
      { name: "Bluetooth Speaker", image: "🔊", creditCost: 650, stockQuantity: 4 },
      { name: "Wireless Earbuds", image: "🎵", creditCost: 550, stockQuantity: 8 },
      { name: "Power Bank", image: "🔋", creditCost: 700, stockQuantity: 3 },
      { name: "Smart Watch", image: "⌚", creditCost: 850, stockQuantity: 2 },
    ]);
  }

  const existingEvents = await CleanupEvent.countDocuments();
  if (existingEvents === 0) {
    await CleanupEvent.insertMany([
      {
        title: "Neighborhood Cleanup Drive",
        description: "Join residents to remove litter and beautify the park this weekend.",
        location: "Green Park Community Center",
        date: "July 20, 2026",
        time: "07:30 AM",
        refreshmentInfo: "Water, gloves, and breakfast packets",
        weekLabel: "4th Saturday",
      },
    ]);
  }
};

export {
  getUserProfile,
  getDashboardData,
  createComplaint,
  updateComplaintStatus,
  redeemReward,
  getRewards,
  seedDefaultData,
};

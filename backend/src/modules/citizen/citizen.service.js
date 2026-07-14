import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ApiError from "../../common/utils/api-error.js";
import CreditTransaction from "../credits/credit.model.js";
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

const createComplaint = async ({
  userId,
  name,
  contact,
  location,
  description,
  complaintType,
  imageBuffer,
  imageData,
  imageName,
  fileType,
}) => {
  if (!name?.trim()) throw ApiError.badRequest("Name cannot be empty");
  if (!contact?.trim()) throw ApiError.badRequest("Phone or email is required");
  if (!location?.trim()) throw ApiError.badRequest("Location is required");
  if (!description?.trim()) throw ApiError.badRequest("Complaint description is required");

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

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  let imagePath = "";
  let storedImageName = imageName || "";
  let storedFileType = fileType || "";
  let mediaBuffer = imageBuffer ?? null;

  if (typeof imageData === "string" && imageData.startsWith("data:")) {
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw ApiError.badRequest("Invalid complaint media data");
    }

    storedFileType = storedFileType || match[1];
    mediaBuffer = Buffer.from(match[2], "base64");
  }

  if (mediaBuffer && imageName) {
    const extensionFromName = path.extname(imageName).toLowerCase();
    const extensionFromMime = storedFileType.includes("/")
      ? `.${storedFileType.split("/")[1]}`
      : "";
    const extension = extensionFromName || extensionFromMime || ".png";
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".webm"];
    if (!allowedExtensions.includes(extension)) {
      throw ApiError.badRequest("Only image or video uploads are allowed");
    }

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    const storedPath = path.join(uploadsDir, fileName);
    fs.writeFileSync(storedPath, mediaBuffer);
    imagePath = `/uploads/${fileName}`;
    storedImageName = imageName || fileName;
    storedFileType = storedFileType || extension.replace(".", "");
  }

  const complaint = await Complaint.create({
    userId,
    name,
    contact,
    location,
    description,
    complaintType: complaintType?.trim() || "General",
    imagePath,
    imageName: storedImageName,
    fileType: storedFileType,
    status: "Pending",
    creditsAwarded: mediaBuffer ? 100 : 0,
  });

  if (mediaBuffer) {
    user.greenCredits = Math.max(0, (user.greenCredits || 0) + 100);
    await user.save();

    await CreditTransaction.create({
      citizenId: user._id,
      amount: 100,
      balanceAfter: user.greenCredits,
      reason: "Complaint submitted with media",
      type: "award",
      metadata: { complaintId: complaint._id },
    });
  }

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
    await CreditTransaction.create({
      citizenId: user._id,
      amount: 100,
      balanceAfter: user.greenCredits,
      reason: `Complaint ${complaintId} approved`,
      type: "award",
      metadata: { complaintId },
    });
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

  await CreditTransaction.create({
    citizenId: user._id,
    amount: -reward.creditCost,
    balanceAfter: user.greenCredits,
    reason: `Redeemed ${reward.name}`,
    type: "redeem",
    metadata: { rewardId: String(reward._id) },
  });

  const redemption = await Redemption.create({
    userId,
    rewardId,
    creditsUsed: reward.creditCost,
    deliveryStatus: "Processing",
  });

  return { user, reward, redemption };
};

const listComplaints = async ({ userId } = {}) => {
  const filter = userId ? { userId } : {};
  return Complaint.find(filter).sort({ submittedAt: -1 });
};

const deleteComplaint = async ({ complaintId }) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound("Complaint not found");

  if (complaint.imagePath) {
    const resolvedPath = path.join(process.cwd(), complaint.imagePath.replace(/^\//, ""));
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  }

  await complaint.deleteOne();
  return { deleted: true, complaintId };
};

const getRewards = async () => {
  return Reward.find({ isActive: true }).sort({ creditCost: 1 });
};

const seedDefaultData = async () => {
  const existingAdmins = await User.countDocuments({ role: "admin" });
  if (existingAdmins === 0) {
    await User.create({
      name: "Super Admin",
      email: "admin@w2w.local",
      accountId: "ADM001",
      password: "admin123",
      role: "admin",
    });
  }

  const existingWorkers = await User.countDocuments({ role: "worker" });
  if (existingWorkers === 0) {
    await User.insertMany([
      {
        name: "Keval",
        email: "keval@w2w.local",
        accountId: "WKR001",
        password: "worker123",
        role: "worker",
      },
      {
        name: "Man",
        email: "man@w2w.local",
        accountId: "WKR002",
        password: "worker123",
        role: "worker",
      },
      {
        name: "Palak",
        email: "palak@w2w.local",
        accountId: "WKR003",
        password: "worker123",
        role: "worker",
      },
    ]);
  }

  const existingCitizens = await User.countDocuments({ role: "citizen" });
  if (existingCitizens === 0) {
    await User.create({
      name: "Sample Citizen",
      email: "citizen@w2w.local",
      accountId: "CIT001",
      password: "citizen123",
      role: "citizen",
      greenCredits: 200,
    });
  }

  const existingRewards = await Reward.countDocuments();
  if (existingRewards === 0) {
    await Reward.insertMany([
      { name: "Boat Headphones", image: "🎧", creditCost: 500, stockQuantity: 6 },
      { name: "Bluetooth Speaker", image: "🔊", creditCost: 800, stockQuantity: 4 },
      { name: "Wireless Earbuds", image: "🎵", creditCost: 1200, stockQuantity: 8 },
      { name: "Power Bank", image: "🔋", creditCost: 300, stockQuantity: 3 },
      { name: "Smart Watch", image: "⌚", creditCost: 1800, stockQuantity: 2 },
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
  listComplaints,
  deleteComplaint,
  getRewards,
  seedDefaultData,
};

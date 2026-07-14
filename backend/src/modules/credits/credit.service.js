import ApiError from "../../common/utils/api-error.js";
import User from "../auth/auth.model.js";
import CreditTransaction from "./credit.model.js";

const resolveCitizen = async (citizenId) => {
  const lookup = String(citizenId ?? "").trim();
  if (!lookup) {
    throw ApiError.badRequest("Citizen ID is required");
  }

  const query = lookup.includes("@")
    ? { email: lookup.toLowerCase() }
    : {
        $or: [{ accountId: lookup.toUpperCase() }, { _id: lookup }],
      };

  const user = await User.findOne(query);
  if (!user || String(user.role).toLowerCase() !== "citizen") {
    throw ApiError.notFound("Citizen not found");
  }

  return user;
};

const getCredits = async (citizenId) => {
  const user = await resolveCitizen(citizenId);
  const transactions = await CreditTransaction.find({ citizenId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  return {
    citizen: {
      id: user._id,
      accountId: user.accountId,
      name: user.name,
      email: user.email,
      greenCredits: user.greenCredits,
    },
    balance: user.greenCredits,
    transactions,
  };
};

const adjustCredits = async ({ citizenId, amount, reason, type = "adjustment", metadata = {} }) => {
  const user = await resolveCitizen(citizenId);
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    throw ApiError.badRequest("Amount must be a valid number");
  }

  const nextBalance = Math.max(0, (user.greenCredits || 0) + numericAmount);
  user.greenCredits = nextBalance;
  await user.save();

  const transaction = await CreditTransaction.create({
    citizenId: user._id,
    amount: numericAmount,
    balanceAfter: nextBalance,
    reason: reason ?? "",
    type,
    metadata,
  });

  return {
    citizen: {
      id: user._id,
      accountId: user.accountId,
      greenCredits: user.greenCredits,
    },
    transaction,
  };
};

const seedCreditLedger = async () => {
  const count = await CreditTransaction.countDocuments();
  return count;
};

export { getCredits, adjustCredits, seedCreditLedger, resolveCitizen };

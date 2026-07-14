import mongoose from "mongoose";

const creditTransactionSchema = new mongoose.Schema(
  {
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, default: "" },
    type: {
      type: String,
      enum: ["award", "redeem", "adjustment"],
      default: "adjustment",
    },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

const CreditTransaction = mongoose.model("CreditTransaction", creditTransactionSchema);

export default CreditTransaction;
export { CreditTransaction };

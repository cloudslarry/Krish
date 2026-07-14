import mongoose from "mongoose";

const binSchema = new mongoose.Schema(
  {
    binId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    area: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    type: {
      type: String,
      enum: ["Wet", "Dry", "Hazardous", "Recyclable", "Mixed"],
      default: "Mixed",
    },
    fillLevel: { type: Number, default: 0, min: 0, max: 100 },
    assignedWorker: { type: String, default: "", trim: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const Bin = mongoose.model("Bin", binSchema);

export default Bin;
export { Bin };

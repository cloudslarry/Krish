import ApiError from "../../common/utils/api-error.js";
import Bin from "./bin.model.js";

const mapBin = (bin) => ({
  _id: bin._id,
  id: bin.binId,
  binId: bin.binId,
  area: bin.area,
  location: bin.location,
  lat: bin.lat,
  lng: bin.lng,
  type: bin.type,
  fillLevel: bin.fillLevel,
  assignedWorker: bin.assignedWorker,
  lastUpdated: bin.lastUpdated,
  createdAt: bin.createdAt,
  updatedAt: bin.updatedAt,
});

const listBins = async () => {
  const bins = await Bin.find().sort({ binId: 1 });
  return bins.map(mapBin);
};

const getBinById = async (binId) => {
  const bin = await Bin.findOne({ binId: String(binId).trim().toUpperCase() });
  if (!bin) throw ApiError.notFound("Bin not found");
  return mapBin(bin);
};

const upsertBin = async ({ binId, area, location, lat, lng, type, fillLevel, assignedWorker }) => {
  if (!binId?.trim()) throw ApiError.badRequest("Bin ID is required");
  if (!area?.trim()) throw ApiError.badRequest("Area is required");
  if (!location?.trim()) throw ApiError.badRequest("Location is required");

  const resolvedBinId = String(binId).trim().toUpperCase();
  const nextBin = await Bin.findOneAndUpdate(
    { binId: resolvedBinId },
    {
      binId: resolvedBinId,
      area: String(area).trim(),
      location: String(location).trim(),
      lat: Number(lat),
      lng: Number(lng),
      type: type ?? "Mixed",
      fillLevel: Math.max(0, Math.min(100, Number(fillLevel ?? 0))),
      assignedWorker: String(assignedWorker ?? "").trim(),
      lastUpdated: new Date(),
    },
    { new: true, upsert: true, runValidators: true },
  );

  return mapBin(nextBin);
};

const updateBin = async (binId, updates = {}) => {
  const bin = await Bin.findOne({ binId: String(binId).trim().toUpperCase() });
  if (!bin) throw ApiError.notFound("Bin not found");

  if (updates.area !== undefined) bin.area = String(updates.area).trim();
  if (updates.location !== undefined) bin.location = String(updates.location).trim();
  if (updates.lat !== undefined) bin.lat = Number(updates.lat);
  if (updates.lng !== undefined) bin.lng = Number(updates.lng);
  if (updates.type !== undefined) bin.type = updates.type;
  if (updates.fillLevel !== undefined) {
    bin.fillLevel = Math.max(0, Math.min(100, Number(updates.fillLevel)));
  }
  if (updates.assignedWorker !== undefined) bin.assignedWorker = String(updates.assignedWorker).trim();
  bin.lastUpdated = new Date();
  await bin.save();

  return mapBin(bin);
};

const seedBins = async () => {
  const count = await Bin.countDocuments();
  if (count > 0) {
    return;
  }

  await Bin.insertMany([
    {
      binId: "BIN001",
      area: "Varachha",
      location: "Near Nehru Garden",
      lat: 21.2049,
      lng: 72.8331,
      type: "Wet",
      fillLevel: 88,
      assignedWorker: "WKR001",
    },
    {
      binId: "BIN002",
      area: "Athwa",
      location: "City Light Road",
      lat: 21.1708,
      lng: 72.7886,
      type: "Dry",
      fillLevel: 64,
      assignedWorker: "WKR002",
    },
    {
      binId: "BIN003",
      area: "Adajan",
      location: "School Road Junction",
      lat: 21.2151,
      lng: 72.7700,
      type: "Hazardous",
      fillLevel: 92,
      assignedWorker: "WKR003",
    },
    {
      binId: "BIN004",
      area: "Katargam",
      location: "Community Center",
      lat: 21.2287,
      lng: 72.8337,
      type: "Recyclable",
      fillLevel: 24,
      assignedWorker: "",
    },
    {
      binId: "BIN005",
      area: "Udhna",
      location: "Bus Depot",
      lat: 21.1579,
      lng: 72.8417,
      type: "Mixed",
      fillLevel: 81,
      assignedWorker: "WKR001",
    },
  ]);
};

export { listBins, getBinById, upsertBin, updateBin, seedBins, mapBin };

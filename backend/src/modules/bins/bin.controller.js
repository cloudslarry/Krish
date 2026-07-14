import ApiResponse from "../../common/utils/api-response.js";
import * as binService from "./bin.service.js";

const listBins = async (req, res, next) => {
  try {
    const bins = await binService.listBins();
    ApiResponse.ok(res, "Bins loaded", bins);
  } catch (error) {
    next(error);
  }
};

const getBin = async (req, res, next) => {
  try {
    const bin = await binService.getBinById(req.params.id);
    ApiResponse.ok(res, "Bin loaded", bin);
  } catch (error) {
    next(error);
  }
};

const createBin = async (req, res, next) => {
  try {
    const bin = await binService.upsertBin(req.body);
    ApiResponse.created(res, "Bin saved", bin);
  } catch (error) {
    next(error);
  }
};

const patchBin = async (req, res, next) => {
  try {
    const bin = await binService.updateBin(req.params.id, req.body);
    ApiResponse.ok(res, "Bin updated", bin);
  } catch (error) {
    next(error);
  }
};

export { listBins, getBin, createBin, patchBin };

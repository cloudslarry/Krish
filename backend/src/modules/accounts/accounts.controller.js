import ApiResponse from "../../common/utils/api-response.js";
import * as accountsService from "./accounts.service.js";

const listCitizens = async (req, res, next) => {
  try {
    const citizens = await accountsService.listByRole("citizen");
    ApiResponse.ok(res, "Citizens loaded", citizens);
  } catch (error) {
    next(error);
  }
};

const listAdmins = async (req, res, next) => {
  try {
    const admins = await accountsService.listByRole("admin");
    ApiResponse.ok(res, "Admins loaded", admins);
  } catch (error) {
    next(error);
  }
};

const listWorkers = async (req, res, next) => {
  try {
    const workers = await accountsService.listByRole("worker");
    ApiResponse.ok(res, "Workers loaded", workers);
  } catch (error) {
    next(error);
  }
};

const createCitizen = async (req, res, next) => {
  try {
    const citizen = await accountsService.createCitizen(req.body);
    ApiResponse.created(res, "Citizen created", citizen);
  } catch (error) {
    next(error);
  }
};

const createWorker = async (req, res, next) => {
  try {
    const worker = await accountsService.createWorker(req.body);
    ApiResponse.created(res, "Worker created", worker);
  } catch (error) {
    next(error);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const admin = await accountsService.createAdmin(req.body);
    ApiResponse.created(res, "Admin created", admin);
  } catch (error) {
    next(error);
  }
};

export {
  listCitizens,
  listAdmins,
  listWorkers,
  createCitizen,
  createWorker,
  createAdmin,
};

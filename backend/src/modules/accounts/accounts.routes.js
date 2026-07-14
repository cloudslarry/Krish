import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import {
  createAdmin,
  createCitizen,
  createWorker,
  listAdmins,
  listCitizens,
  listWorkers,
} from "./accounts.controller.js";

const citizensRouter = Router();
citizensRouter.get("/", authenticate, authorize("admin"), listCitizens);
citizensRouter.post("/", createCitizen);

const adminsRouter = Router();
adminsRouter.get("/", authenticate, authorize("admin"), listAdmins);
adminsRouter.post("/", createAdmin);

const workersRouter = Router();
workersRouter.get("/", authenticate, authorize("admin"), listWorkers);
workersRouter.post("/", createWorker);

export { citizensRouter, adminsRouter, workersRouter };

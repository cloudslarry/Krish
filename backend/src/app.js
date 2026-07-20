import path from "path";
import cookieParser from "cookie-parser";
import express from "express";
import ApiError from "./common/utils/api-error.js";
import ApiResponse from "./common/utils/api-response.js";
import authRoute from "./modules/auth/auth.routes.js";
import adminRoute from "./modules/admin/admin.routes.js";
import { adminsRouter, citizensRouter, workersRouter } from "./modules/accounts/accounts.routes.js";
import binRoute from "./modules/bins/bin.routes.js";
import complaintRoute from "./modules/complaints/complaint.routes.js";
import creditRoute from "./modules/credits/credit.routes.js";
import citizenRoute from "./modules/citizen/citizen.routes.js";
import taskRoute from "./modules/tasks/task.routes.js";
import workerRoute from "./modules/worker/worker.routes.js";

const app = express();

const frontendOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000,https://w2w1.vercel.app").split(",").map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = new Set(frontendOrigins);
const defaultOrigin = frontendOrigins[0] || "http://localhost:3000";

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
  } else {
    res.header("Access-Control-Allow-Origin", defaultOrigin);
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (req, res) => {
  ApiResponse.ok(res, "Backend is running", {
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/admins", adminsRouter);
app.use("/api/citizens", citizensRouter);
app.use("/api/citizen", citizenRoute);
app.use("/api/complaints", complaintRoute);
app.use("/api/credits", creditRoute);
app.use("/api/tasks", taskRoute);
app.use("/api/bins", binRoute);
app.use("/api/workers", workersRouter);
app.use("/api/worker", workerRoute);

// Catch-all for undefined routes
app.all("{*path}", (req, res) => {
  throw ApiError.notFound(`Route ${req.originalUrl} not found`);
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error?.statusCode ?? 500;
  const message = error?.message ?? "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
});
export default app;

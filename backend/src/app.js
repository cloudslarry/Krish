import cookieParser from "cookie-parser";
import express from "express";
import ApiError from "./common/utils/api-error.js";
import ApiResponse from "./common/utils/api-response.js";
import authRoute from "./modules/auth/auth.routes.js";

const app = express();

const frontendOrigin = process.env.FRONTEND_URL ?? "http://localhost:3000";

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin && requestOrigin === frontendOrigin) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
  } else {
    res.header("Access-Control-Allow-Origin", frontendOrigin);
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  ApiResponse.ok(res, "Backend is running", {
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoute);

// Catch-all for undefined routes
app.all("{*path}", (req, res) => {
  throw ApiError.notFound(`Route ${req.originalUrl} not found`);
});
export default app;

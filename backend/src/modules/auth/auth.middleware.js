import ApiError from "../../common/utils/api-error.js";
import { verifyAccessToken } from "../../common/utils/jwt.utils.js";
import User from "./auth.model.js";

// Authenticates using the short-lived access token (header or cookie)
const authenticate = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) throw ApiError.unauthorized("Not authenticated");

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized("User no longer exists");

  const normalizedRole = String(user.role ?? "").toLowerCase();

  req.user = {
    id: user._id,
    role: normalizedRole,
    name: user.name,
    email: user.email,
  };
  next();
};

// Higher-order function — returns middleware configured with allowed roles
const authorize = (...roles) => {
  const normalizedRoles = roles.map((role) => String(role).toLowerCase());
  return (req, res, next) => {
    if (!normalizedRoles.includes(String(req.user.role).toLowerCase())) {
      throw ApiError.forbidden(
        "You do not have permission to perform this action",
      );
    }
    next();
  };
};

export { authenticate, authorize };

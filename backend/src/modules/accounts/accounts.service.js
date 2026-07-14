import ApiError from "../../common/utils/api-error.js";
import User from "../auth/auth.model.js";
import { register, normalizeRole, nextAccountId } from "../auth/auth.service.js";

const MASTER_KEY = process.env.ADMIN_MASTER_KEY ?? "W2W-MASTER-2025";

const mapUser = (user) => ({
  _id: user._id,
  id: user._id,
  accountId: user.accountId,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  greenCredits: user.greenCredits,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const listByRole = async (role) => {
  const normalizedRole = normalizeRole(role);
  const users = await User.find({ role: normalizedRole }).sort({ createdAt: -1 });
  return users.map(mapUser);
};

const createCitizen = async ({ id, name, contact, pwd, email, password }) => {
  const resolvedPassword = pwd ?? password;
  if (!resolvedPassword) throw ApiError.badRequest("Password is required");

  return register({
    name,
    email: email ?? (contact && contact.includes("@") ? contact : undefined),
    contact,
    password: resolvedPassword,
    role: "citizen",
    accountId: id || await nextAccountId("citizen"),
  });
};

const createWorker = async ({ id, name, contact, pwd, email, password }) => {
  const resolvedPassword = pwd ?? password;
  if (!resolvedPassword) throw ApiError.badRequest("Password is required");

  return register({
    name,
    email: email ?? (contact && contact.includes("@") ? contact : undefined),
    contact,
    password: resolvedPassword,
    role: "worker",
    accountId: id || await nextAccountId("worker"),
  });
};

const createAdmin = async ({ id, name, contact, pwd, email, password, masterKey }) => {
  if (String(masterKey ?? "").trim() !== MASTER_KEY) {
    throw ApiError.forbidden("Invalid master key");
  }

  const resolvedPassword = pwd ?? password;
  if (!resolvedPassword) throw ApiError.badRequest("Password is required");

  return register({
    name,
    email: email ?? (contact && contact.includes("@") ? contact : undefined),
    contact,
    password: resolvedPassword,
    role: "admin",
    accountId: id || await nextAccountId("admin"),
  });
};

export {
  listByRole,
  createCitizen,
  createWorker,
  createAdmin,
  mapUser,
  MASTER_KEY,
};

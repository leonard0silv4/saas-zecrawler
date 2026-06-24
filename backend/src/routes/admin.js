import { Router } from "express";
import { adminAuth } from "../middleware/admin.js";
import AdminController from "../controllers/AdminController.js";

const r = Router();

// Public: authenticate as admin
r.post("/login", AdminController.login);

// Protected: require valid admin JWT
r.get("/stats",               adminAuth, AdminController.stats);
r.get("/customers",           adminAuth, AdminController.customers);
r.post("/impersonate/:userId", adminAuth, AdminController.impersonate);

export default r;

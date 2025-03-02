import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import passport from "passport";
import { loginSchema, users } from "@shared/schema";
import bcrypt from "bcrypt";
import { authenticator } from "otplib";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Add GET /api/admin endpoint to get current admin info
  app.get("/api/admin", (req, res) => {
    console.log("\n=== /api/admin Request ===");
    console.log("Session ID:", req.sessionID);
    console.log("Auth status:", req.isAuthenticated());
    console.log("Session:", JSON.stringify(req.session, null, 2));
    console.log("User:", req.user);
    console.log("=======================\n");

    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      console.log("\n=== Login Attempt ===");
      console.log("Username:", req.body.username);
      console.log("Session ID:", req.sessionID);
      const { username, password, totpCode } = loginSchema.parse(req.body);

      passport.authenticate("local", (error: Error | null, admin: Express.User | false, info: { message?: string; requires2FA?: boolean }) => {
        if (error) {
          console.error("Authentication error:", error);
          return next(error);
        }
        if (!admin) {
          console.log("Authentication failed:", info.message);
          return res.status(401).json({ message: info.message });
        }

        req.login(admin, async (err) => {
          if (err) {
            console.error("Login error:", err);
            return next(err);
          }

          await storage.logActivity({
            adminId: admin.id,
            action: "login",
            ipAddress: req.ip || null,
            timestamp: new Date(),
            details: `Admin ${admin.username} logged in`
          });

          console.log("Login successful:", admin.username);
          console.log("New Session ID:", req.sessionID);
          res.json(admin);
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login route error:", error);
      next(error);
    }
  });

  app.post("/api/logout", async (req, res, next) => {
    if (req.user) {
      await storage.logActivity({
        adminId: req.user.id,
        action: "logout",
        ipAddress: req.ip || null,
        timestamp: new Date(),
        details: `Admin ${req.user.username} logged out`
      });
    }

    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.post("/api/change-password", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { currentPassword, newPassword } = req.body;
    const admin = await storage.getAdminByUsername(req.user.username);

    if (!admin || !(await bcrypt.compare(currentPassword, admin.password))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await storage.updateAdmin(admin.id, {
      password: hashedPassword,
      isFirstLogin: false,
    });

    await storage.logActivity({
      adminId: admin.id,
      action: "password_change",
      ipAddress: req.ip || null,
      timestamp: new Date(),
      details: `Admin ${admin.username} changed password`
    });

    res.sendStatus(200);
  });

  app.post("/api/setup-2fa", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const secret = authenticator.generateSecret();
    await storage.updateAdmin(req.user.id, {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
    });

    await storage.logActivity({
      adminId: req.user.id,
      action: "2fa_enabled",
      ipAddress: req.ip || null,
      timestamp: new Date(),
      details: `Admin ${req.user.username} enabled 2FA`
    });

    res.json({ secret });
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const users = await db.select().from(users).orderBy(users.createdAt);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
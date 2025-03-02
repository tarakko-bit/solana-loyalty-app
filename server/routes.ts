import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import passport from "passport";
import { loginSchema, users, pointsLedger } from "@shared/schema"; // Added pointsLedger import
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

  // Add user registration endpoint after existing routes
  app.post("/api/users/register", async (req, res) => {
    try {
      const { walletAddress, referredBy } = req.body;

      // Check if user already exists
      const existing = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Generate a unique referral code based on wallet address
      const referralCode = walletAddress.slice(0, 8).toUpperCase();

      // Create new user
      const [user] = await db.insert(users)
        .values({
          walletAddress,
          referralCode,
          referredBy: referredBy || null,
          createdAt: new Date()
        })
        .returning();

      // If this user was referred, add points to referrer
      if (referredBy) {
        const referrer = await db.select()
          .from(users)
          .where(eq(users.referralCode, referredBy))
          .limit(1);

        if (referrer.length > 0) {
          await db.insert(pointsLedger)
            .values({
              userId: referrer[0].id,
              points: "100", // Changed to string to match schema
              source: 'referral',
              timestamp: new Date()
            });
        }
      }

      res.status(201).json(user);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Add this endpoint after the existing /api/users/register endpoint
  app.get("/api/users/me", async (req, res) => {
    try {
      const walletAddress = req.query.wallet as string;
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      const [user] = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import passport from "passport";
import { loginSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { authenticator } from "otplib";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.post("/api/login", async (req, res, next) => {
    try {
      const { username, password, totpCode } = loginSchema.parse(req.body);

      passport.authenticate("local", (error: Error | null, admin: Express.User | false, info: { message?: string; requires2FA?: boolean }) => {
        if (error) return next(error);
        if (!admin) return res.status(401).json({ message: info.message });

        if (info?.requires2FA) {
          if (!totpCode) {
            return res.status(401).json({ requires2FA: true });
          }

          const isValidTotp = authenticator.verify({
            token: totpCode,
            secret: admin.twoFactorSecret!,
          });

          if (!isValidTotp) {
            return res.status(401).json({ message: "Invalid 2FA code" });
          }
        }

        req.login(admin, async (err) => {
          if (err) return next(err);

          await storage.logActivity({
            adminId: admin.id,
            action: "login",
            ipAddress: req.ip || null,
            timestamp: new Date(),
            details: `Admin ${admin.username} logged in`
          });

          res.json(admin);
        });
      })(req, res, next);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
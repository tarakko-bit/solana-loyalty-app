import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { authenticator } from "otplib";
import { storage } from "./storage";
import { Admin } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends Admin {}
  }
}

export async function setupAuth(app: Express) {
  console.log("Setting up authentication...");

  // Initialize session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      httpOnly: true,
      path: '/'
    },
  };

  console.log("Configuring session middleware...");
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  console.log("Session middleware configured");

  passport.use(
    new LocalStrategy(async (username: string, password: string, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const admin = await storage.getAdminByUsername(username);

        if (!admin) {
          console.log(`Admin not found: ${username}`);
          return done(null, false, { message: "Invalid credentials" });
        }

        if (admin.lockedUntil && admin.lockedUntil > new Date()) {
          console.log(`Account locked: ${username}`);
          return done(null, false, { message: "Account is locked" });
        }

        const isValid = await bcrypt.compare(password, admin.password);
        console.log(`Password validation for ${username}: ${isValid}`);

        if (!isValid) {
          const failedAttempts = (admin.failedAttempts || 0) + 1;
          const updates: Partial<Admin> = { failedAttempts };

          if (failedAttempts >= 5) {
            updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          }

          await storage.updateAdmin(admin.id, updates);
          console.log(`Failed login attempt for ${username}. Attempts: ${failedAttempts}`);
          return done(null, false, { message: "Invalid credentials" });
        }

        // Reset failed attempts on successful login
        await storage.updateAdmin(admin.id, {
          failedAttempts: 0,
          lastLogin: new Date(),
        });

        console.log(`Login successful for ${username}`);
        return done(null, admin);
      } catch (error) {
        console.error("Login error:", error);
        return done(error as Error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user ID: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const admin = await storage.getAdmin(id);
      if (admin) {
        console.log(`Deserialized admin: ${admin.username}`);
      } else {
        console.log(`Failed to deserialize user ID: ${id}`);
      }
      done(null, admin);
    } catch (error) {
      console.error("Deserialize error:", error);
      done(error as Error);
    }
  });

  console.log("Authentication setup completed");
}
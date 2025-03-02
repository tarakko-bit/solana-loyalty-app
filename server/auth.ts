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
      sameSite: 'lax'
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
        console.log(`Attempting login for username: ${username}`);
        const admin = await storage.getAdminByUsername(username);

        if (!admin) {
          console.log("Admin not found");
          return done(null, false, { message: "Invalid credentials" });
        }

        if (admin.lockedUntil && admin.lockedUntil > new Date()) {
          console.log("Account is locked");
          return done(null, false, { message: "Account is locked" });
        }

        const isValid = await bcrypt.compare(password, admin.password);
        console.log(`Password validation result: ${isValid}`);

        if (!isValid) {
          const failedAttempts = (admin.failedAttempts || 0) + 1;
          const updates: Partial<Admin> = { failedAttempts };

          if (failedAttempts >= 5) {
            updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          }

          await storage.updateAdmin(admin.id, updates);
          return done(null, false, { message: "Invalid credentials" });
        }

        if (admin.twoFactorEnabled) {
          console.log("2FA is enabled, requiring additional verification");
          return done(null, admin, { requires2FA: true } as any);
        }

        await storage.updateAdmin(admin.id, {
          failedAttempts: 0,
          lastLogin: new Date(),
        });

        console.log("Login successful");
        return done(null, admin);
      } catch (error) {
        console.error("Login error:", error);
        return done(error as Error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const admin = await storage.getAdmin(id);
      console.log("Deserialized admin:", admin ? "found" : "not found");
      done(null, admin);
    } catch (error) {
      console.error("Deserialize error:", error);
      done(error as Error);
    }
  });

  console.log("Authentication setup completed");
}

const PREDEFINED_ADMINS = {
  nginx: "#Nx2025@Admin$",
  asmaa: "@As2025#Secure!",
  tarak: "$Tr2025@Panel#",
  hamza: "#Hz2025$Admin@",
  dokho: "@Dk2025#Panel$",
};

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}
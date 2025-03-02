import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin table for dashboard access
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isFirstLogin: boolean("is_first_login").default(true),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  lastLogin: timestamp("last_login"),
  failedAttempts: integer("failed_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
});

// User table for Phantom wallet users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  telegramId: text("telegram_id").unique(),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  lastVerification: timestamp("last_verification"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Points tracking table
export const pointsLedger = pgTable("points_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  points: decimal("points").notNull(),
  source: text("source").notNull(), // 'holding', 'referral', 'bonus'
  timestamp: timestamp("timestamp").defaultNow(),
});

// Wallet verification table
export const walletVerifications = pgTable("wallet_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cloneBalance: decimal("clone_balance").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Conversion requests table
export const conversionRequests = pgTable("conversion_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pointsAmount: decimal("points_amount").notNull(),
  solanaAmount: decimal("solana_amount").notNull(),
  status: text("status").notNull(), // 'pending', 'approved', 'completed', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"), // admin id
});

// Activity logs for auditing
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  action: text("action").notNull(),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
  details: text("details"),
});

// Schema for admin registration
export const insertAdminSchema = createInsertSchema(admins).pick({
  username: true,
  password: true,
});

// Schema for user registration
export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  telegramId: true,
});

// Schema for login
export const loginSchema = insertAdminSchema.extend({
  totpCode: z.string().optional(),
});

// Schema for conversion request
export const conversionRequestSchema = createInsertSchema(conversionRequests).pick({
  pointsAmount: true,
});

// Export types
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Admin = typeof admins.$inferSelect;
export type User = typeof users.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type PointsLedger = typeof pointsLedger.$inferSelect;
export type WalletVerification = typeof walletVerifications.$inferSelect;
export type ConversionRequest = typeof conversionRequests.$inferSelect;
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { initializeAdmins } from "./init-admins";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session setup before routes
const sessionMiddleware = session({
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
  }
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (req.user) {
        logLine += ` [User: ${(req.user as any).username}]`;
      }
      logLine += ` [Session ID: ${req.sessionID}]`;

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log("Starting server initialization...");

  // Initialize admin accounts
  console.log("Initializing admin accounts...");
  await initializeAdmins();
  console.log("Admin accounts initialized");

  // Register routes after middleware setup
  console.log("Registering routes...");
  const server = await registerRoutes(app);
  console.log("Routes registered");

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error("Server error:", err);
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
  } else {
    console.log("Setting up Vite development server...");
    await setupVite(app, server);
    console.log("Vite development server configured");
  }

  // Use Replit's port or fallback to 5000
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server started and listening on port ${port}`);
  });
})();
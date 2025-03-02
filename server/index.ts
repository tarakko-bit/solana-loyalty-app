import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { initializeAdmins } from "./init-admins";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import path from "path";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure PostgreSQL session store
const PostgresStore = connectPgSimple(session);
const sessionStore = new PostgresStore({
  pool,
  createTableIfMissing: true,
  tableName: 'user_sessions'
});

// Session setup before routes
const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "super-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    httpOnly: true,
    path: '/'
  },
  name: 'solana_loyalty_sid'
});

app.set('trust proxy', 1);
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

  // Register routes first to ensure API endpoints take precedence
  console.log("Registering routes...");
  const server = await registerRoutes(app);
  console.log("Routes registered");

  // Error handling middleware for API routes
  app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("API Error:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === 'production') {
    // Serve static files from the correct dist path
    const distPath = path.join(process.cwd(), 'dist', 'public');
    console.log('Serving static files from:', distPath);
    app.use(express.static(distPath));

    // Handle client-side routing - this must come after API routes
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      console.log('Serving index.html from:', indexPath);
      if (!require('fs').existsSync(indexPath)) {
        console.error('index.html not found at:', indexPath);
        return res.status(404).send('index.html not found');
      }
      res.sendFile(indexPath);
    });
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
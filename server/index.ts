import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log, serveStatic } from "./vite";
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

// Add CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' " + (process.env.NODE_ENV === 'development' ? 'ws:' : 'wss:')
  );
  next();
});

// Configure PostgreSQL session store with proper error handling
const PostgresStore = connectPgSimple(session);
const sessionStore = new PostgresStore({
  pool,
  createTableIfMissing: true,
  tableName: 'user_sessions',
  pruneSessionInterval: 60
});

sessionStore.on('error', function(error) {
  console.error('Session store error:', error);
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

// Debug logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  console.log(`\n=== Request Started ===`);
  console.log(`Path: ${path}`);
  console.log(`Session ID: ${req.sessionID}`);
  console.log(`Auth Status: ${req.isAuthenticated()}`);
  console.log(`User: ${req.user ? JSON.stringify(req.user) : 'Not authenticated'}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`\n=== Request Completed ===`);
    console.log(`${req.method} ${path} ${res.statusCode} ${duration}ms [Session: ${req.sessionID}]`);
    console.log(`========================\n`);
  });

  next();
});

(async () => {
  try {
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

      // Handle client-side routing for all non-API routes
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
  } catch (error) {
    console.error("Server initialization error:", error);
    process.exit(1);
  }
})();
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log, serveStatic } from "./vite";
import { initializeAdmins } from "./init-admins";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import path from "path";
import fs from "fs";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Trust first proxy in production
app.set('trust proxy', 1);

// Configure PostgreSQL session store with proper error handling
const PostgresStore = connectPgSimple(session);
const sessionStore = new PostgresStore({
  pool,
  createTableIfMissing: true,
  tableName: 'user_sessions',
  pruneSessionInterval: 60
});

sessionStore.on('error', function (error) {
  console.error('Session store error:', error);
});

// Session setup with secure settings for production
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

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Debug logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  console.log(`\n=== Request Started ===`);
  console.log(`Path: ${path}`);
  console.log(`Method: ${req.method}`);
  console.log(`Session ID: ${req.sessionID}`);
  console.log(`Auth Status: ${req.isAuthenticated()}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`\n=== Request Completed ===`);
    console.log(`${req.method} ${path} ${res.statusCode} ${duration}ms [Session: ${req.sessionID}]`);
    if (res.statusCode >= 400) {
      console.error(`Error response for ${path}:`, {
        status: res.statusCode,
        duration,
        session: req.sessionID
      });
    }
    console.log(`========================\n`);
  });

  next();
});

// Add CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' " + (process.env.NODE_ENV === 'development' ? 'ws:' : 'wss:')
  );
  next();
});

(async () => {
  try {
    console.log("Starting server initialization...");

    // Initialize admin accounts
    console.log("Initializing admin accounts...");
    await initializeAdmins();
    console.log("Admin accounts initialized");

    // Register API routes first
    console.log("Registering routes...");
    const server = await registerRoutes(app);
    console.log("Routes registered");

    if (process.env.NODE_ENV === 'production') {
      // Configure production static file serving
      const distPath = path.join(process.cwd(), 'dist', 'public');
      console.log('Production mode: Serving static files from:', distPath);

      if (!fs.existsSync(distPath)) {
        throw new Error(`Production build directory not found: ${distPath}`);
      }

      // Serve static files with aggressive caching
      app.use(express.static(distPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        index: false // Don't serve index.html automatically
      }));

      // Handle client-side routing
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next();
        }

        res.sendFile(path.join(distPath, 'index.html'), err => {
          if (err) {
            console.error('Error serving index.html:', err);
            next(err);
          }
        });
      });
    } else {
      console.log("Setting up Vite development server...");
      await setupVite(app, server);
      console.log("Vite development server configured");
    }

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Server error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        sessionId: req.sessionID
      });

      // Send appropriate error response
      if (req.path.startsWith('/api')) {
        res.status(500).json({ 
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message 
        });
      } else {
        res.status(500).send('Internal Server Error');
      }
    });

    // Start server
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
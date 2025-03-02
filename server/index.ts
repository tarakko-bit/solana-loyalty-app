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

// Add CSP headers after session setup
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' " + (process.env.NODE_ENV === 'development' ? 'ws:' : 'wss:')
  );
  next();
});

// Debug logging middleware - now after session setup
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  console.log(`\n=== Request Started ===`);
  console.log(`Path: ${path}`);
  console.log(`Method: ${req.method}`);
  console.log(`Session ID: ${req.sessionID}`);
  console.log(`Auth Status: ${req.isAuthenticated()}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Headers:`, req.headers);

  // Capture the original response methods
  const originalEnd = res.end;
  const originalSend = res.send;
  const originalJson = res.json;

  res.end = function (chunk, ...args) {
    console.log(`Response ended with status: ${res.statusCode}`);
    return originalEnd.apply(res, [chunk, ...args]);
  };

  res.send = function (body) {
    console.log(`Response sent with status: ${res.statusCode}`);
    return originalSend.apply(res, [body]);
  };

  res.json = function (body) {
    console.log(`JSON response sent with status: ${res.statusCode}`);
    return originalJson.apply(res, [body]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`\n=== Request Completed ===`);
    console.log(`${req.method} ${path} ${res.statusCode} ${duration}ms [Session: ${req.sessionID}]`);
    if (res.statusCode >= 400) {
      console.error(`Error response for ${path}:`, {
        status: res.statusCode,
        duration,
        session: req.sessionID,
        headers: req.headers
      });
    }
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

    if (process.env.NODE_ENV === 'production') {
      // Serve static files from the correct dist path
      const distPath = path.join(process.cwd(), 'dist', 'public');
      console.log('Production mode: Serving static files from:', distPath);

      // Check if the dist directory exists
      if (!require('fs').existsSync(distPath)) {
        console.error('Error: Production build directory not found:', distPath);
        console.error('Please ensure you have run `npm run build` before starting the server in production mode');
        process.exit(1);
      }

      // Serve static files with proper caching
      app.use(express.static(distPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true
      }));

      // Handle client-side routing for all non-API routes
      app.get('*', (req, res, next) => {
        // Skip this middleware for API routes
        if (req.path.startsWith('/api')) {
          return next();
        }

        const indexPath = path.join(distPath, 'index.html');
        console.log('Serving index.html for client route:', req.path);
        console.log('From path:', indexPath);

        // Verify index.html exists
        if (!require('fs').existsSync(indexPath)) {
          console.error('Critical Error: index.html not found at:', indexPath);
          return res.status(500).send('Server configuration error: index.html not found');
        }

        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('Error loading application');
          }
        });
      });
    } else {
      console.log("Setting up Vite development server...");
      await setupVite(app, server);
      console.log("Vite development server configured");
    }

    // Error handling middleware for API routes
    app.use('/api', (err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', {
        error: err,
        stack: err.stack,
        path: req.path,
        method: req.method,
        sessionId: req.sessionID,
        headers: req.headers,
        body: req.body
      });

      const message = err.message || 'Internal Server Error';
      const status = err instanceof Error ? 500 : (err as any).status || 500;

      res.status(status).json({ message });
    });

    // Final error handler for unhandled errors
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', {
        error: err,
        stack: err.stack,
        path: req.path,
        method: req.method,
        headers: req.headers,
        body: req.body
      });

      // Don't expose internal error details in production
      const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error';

      res.status(500).json({ message });
    });

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
import "dotenv/config";
import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { apiRouter } from './server/routes.js';
import { setupGateway } from './server/gateway/index.js';
import { ensureDatabaseSchema } from './server/initDb.js';
import { isAllowedOrigin } from './server/cors.js';
import { startAutonomousEvolutionService } from './server/autonomousEvolutionEngine.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Start 24/7 Autonomous Self-Evolution Engine
try {
  startAutonomousEvolutionService();
} catch (evoErr: any) {
  console.warn('⚠️ [EVOLUTION SERVICE] Init note:', evoErr?.message);
}

// Auto-sync database schema on startup (non-blocking)
if (process.env.RUN_DB_MIGRATIONS === 'true' && process.env.VERCEL !== '1') {
  ensureDatabaseSchema().catch((dbErr: any) => {
    console.warn('⚠️ [SERVER INIT] DB schema migration note:', dbErr?.message);
  });
}

app.set('trust proxy', 1);

// Standard production security headers (allow iframe embedding for AI Studio preview)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Credentialed browser requests are restricted to the deployed application origins.
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';
  const isAllowed = isAllowedOrigin(origin, isProduction);

  if (origin) res.vary('Origin');
  if (origin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-auth-token, X-Requested-With, Accept, Origin, Cache-Control, Pragma'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// High-Performance Response Timing Middleware
app.use((req, res, next) => {
  const startHrTime = process.hrtime();
  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    if (!res.headersSent) {
      try { res.setHeader('Server-Timing', `total;dur=${elapsedTimeInMs}`); } catch {}
    }
  });
  next();
});

// Enable Gzip/Deflate Payload Compression with optimized threshold
app.use(
  compression({
    level: 6,
    threshold: 1024, // Compress responses above 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  }) as any
);

app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Attach UNX API Gateway (Request ID tracing, client headers, structured logging, status, /api/v1 router)
setupGateway(app);

// API health check
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    time: new Date().toISOString(),
    platform: process.env.CLOUDFLARE_WORKER ? 'cloudflare-worker' : 'node-server',
  });
});

// Mount main backend API routes
app.use('/api', apiRouter);

// Explicit 404 for unhandled API routes to prevent Vite SPA fallback returning HTML
app.all(['/api/*', '/api'], (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Vite middleware for development vs production static serving
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          host: '0.0.0.0',
          port: 3000,
          hmr: false,
          allowedHosts: true,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Vite middleware setup error:', err);
    }
  } else if (!process.env.CLOUDFLARE_WORKER && !process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
      app.use(
        express.static(distPath, {
          maxAge: '1d',
          etag: true,
          lastModified: true,
        })
      );
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // Global Error Recovery Middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('🛡️ [EXPRESS ROUTE ERROR]:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      });
    }
  });

  if (!process.env.VERCEL && !process.env.CLOUDFLARE_WORKER) {
    const serverInstance = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎮 Unx Games Always-On Full-Stack Server running at http://0.0.0.0:${PORT}`);
    });

    serverInstance.on('error', (err: any) => {
      console.error('⚠️ [SERVER SOCKET ERROR]:', err?.message || err);
    });


  }
}

if (!process.env.VERCEL) initServer();

export { app, PORT, initServer };
export default app;

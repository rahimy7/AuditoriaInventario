import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { UPLOAD_DIR } from "./lib/uploads";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// 5 mb allows bulk product imports; photos go through multipart, not JSON.
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Serve uploaded product photos from the local uploads directory.
app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api", router);

// Return 404 JSON for unknown /api routes (prevents SPA fallback from catching them)
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// Serve the compiled web frontend when its dist directory exists (production / Railway)
const webDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "web", "dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  // SPA fallback — serve index.html for all client-side routes
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

// JSON error handler — Express 5 forwards rejected async handlers here.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log?.error({ err }, "Unhandled request error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Error interno del servidor." });
});

export default app;

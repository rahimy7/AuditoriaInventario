import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

// Local, in-project file storage for uploaded images. Served statically at /uploads.
// Ephemeral in containerized deploys — acceptable per product decision.
export const UPLOAD_DIR = process.env["UPLOAD_DIR"]
  ? path.resolve(process.env["UPLOAD_DIR"])
  : path.resolve(process.cwd(), "uploads");

export function ensureUploadDir(): void {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

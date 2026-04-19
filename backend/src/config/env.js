import "dotenv/config";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BACKEND_DIR = resolve(__dirname, "../..");
const ROOT_DIR = resolve(BACKEND_DIR, "..");

function parseBoolean(value, defaultValue) {
  if (value == null) {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
}

function parseInteger(value, defaultValue) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseList(value, fallback) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseString(value, fallback = null) {
  if (value == null) {
    return fallback;
  }

  const trimmed = String(value).trim();
  return trimmed || fallback;
}

function resolveFromBackend(relativeOrAbsolutePath, fallback = null) {
  const targetPath = parseString(relativeOrAbsolutePath, fallback);

  if (!targetPath) {
    return null;
  }

  return resolve(BACKEND_DIR, targetPath);
}

export const env = {
  host: parseString(process.env.HOST, "0.0.0.0"),
  port: parseInteger(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  databasePath: resolveFromBackend(
    process.env.DATABASE_PATH,
    "./data/cron-dashboard.sqlite",
  ),
  staticDir: resolveFromBackend(process.env.STATIC_DIR),
  allowUnsafeCommands: parseBoolean(process.env.ALLOW_UNSAFE_COMMANDS, false),
  allowedExecutables: parseList(process.env.ALLOWED_EXECUTABLES, [
    "node",
    "echo",
    "date",
    "python",
    "python3",
    "npm",
    "pnpm",
    "yarn",
  ]),
  defaultCommandTimeoutMs: parseInteger(
    process.env.DEFAULT_COMMAND_TIMEOUT_MS,
    30_000,
  ),
  maxOutputBytes: parseInteger(process.env.MAX_OUTPUT_BYTES, 50_000),
  seedDemoData: parseBoolean(process.env.SEED_DEMO_DATA, true),
  commandWorkdir: resolve(BACKEND_DIR, process.env.COMMAND_WORKDIR ?? ".."),
  rootDir: ROOT_DIR,
  backendDir: BACKEND_DIR,
};

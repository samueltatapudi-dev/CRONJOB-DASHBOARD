import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
  BrowserWindow,
  Menu,
  Tray,
  app,
  nativeImage,
} from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRODUCT_NAME = "Cron Job Dashboard";
const DEFAULT_DESKTOP_PORT = "4100";
const BACKGROUND_FLAG = "--background";

let tray = null;
let mainWindow = null;
let backendRuntime = null;
let isQuitting = false;
let shutdownStarted = false;

function isBackgroundLaunch() {
  return process.argv.includes(BACKGROUND_FLAG);
}

function isDesktopDev() {
  return Boolean(process.env.DESKTOP_DEV_SERVER_URL);
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect x="8" y="10" width="48" height="44" rx="12" fill="#1f6feb"/>
      <path d="M20 42h24M20 32h10M34 32h10M20 22h24" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    </svg>
  `;

  return nativeImage
    .createFromDataURL(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    )
    .resize({ width: 24, height: 24 });
}

function escapeDesktopExec(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function resolveAutostartExecPath() {
  return process.env.APPIMAGE ?? process.execPath;
}

async function ensureLinuxAutostartEntry() {
  if (!app.isPackaged || process.platform !== "linux") {
    return;
  }

  const autostartDir = join(os.homedir(), ".config", "autostart");
  const autostartFile = join(autostartDir, "cron-job-dashboard.desktop");
  const execPath = escapeDesktopExec(resolveAutostartExecPath());
  const desktopEntry = [
    "[Desktop Entry]",
    "Type=Application",
    "Version=1.0",
    `Name=${PRODUCT_NAME}`,
    "Comment=Run Cron Job Dashboard in the background",
    `Exec=${execPath} ${BACKGROUND_FLAG}`,
    `TryExec=${execPath}`,
    "Terminal=false",
    "StartupNotify=false",
    "X-GNOME-Autostart-enabled=true",
    "",
  ].join("\n");

  await mkdir(autostartDir, { recursive: true });
  await writeFile(autostartFile, desktopEntry, "utf8");
}

function applyDesktopEnvironmentDefaults() {
  const userDataDir = app.getPath("userData");

  process.env.HOST ??= "127.0.0.1";
  process.env.PORT ??= DEFAULT_DESKTOP_PORT;
  process.env.DATABASE_PATH ??= join(
    userDataDir,
    "data",
    "cron-dashboard.sqlite",
  );
  process.env.COMMAND_WORKDIR ??= os.homedir();
  process.env.ALLOW_UNSAFE_COMMANDS ??= "false";

  if (app.isPackaged) {
    process.env.SEED_DEMO_DATA ??= "false";
  }

  if (isDesktopDev()) {
    process.env.CLIENT_ORIGIN ??= process.env.DESKTOP_DEV_SERVER_URL;
    delete process.env.STATIC_DIR;
    return;
  }

  process.env.STATIC_DIR ??= resolve(__dirname, "../frontend/dist");
  process.env.CLIENT_ORIGIN ??= `http://127.0.0.1:${process.env.PORT}`;
}

async function ensureBackendStarted() {
  if (backendRuntime) {
    return backendRuntime;
  }

  const { startServer } = await import("../backend/src/server.js");
  backendRuntime = await startServer();
  return backendRuntime;
}

async function stopBackend() {
  if (!backendRuntime) {
    return;
  }

  const { stopServer } = await import("../backend/src/server.js");
  await stopServer();
  backendRuntime = null;
}

async function getWindowUrl() {
  if (isDesktopDev()) {
    return process.env.DESKTOP_DEV_SERVER_URL;
  }

  const runtime = await ensureBackendStarted();
  return runtime.url;
}

async function showMainWindow() {
  const window = await ensureWindow({ show: true });

  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Open Dashboard",
      click: () => {
        void showMainWindow();
      },
    },
    {
      type: "separator",
    },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function ensureTray() {
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
    return tray;
  }

  tray = new Tray(createTrayIcon());
  tray.setToolTip(PRODUCT_NAME);
  tray.setContextMenu(buildTrayMenu());
  tray.on("double-click", () => {
    void showMainWindow();
  });

  return tray;
}

async function ensureWindow({ show } = { show: true }) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (show) {
      mainWindow.show();
    }

    return mainWindow;
  }

  const windowUrl = await getWindowUrl();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1100,
    minHeight: 760,
    show: false,
    title: PRODUCT_NAME,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(windowUrl);

  if (show) {
    mainWindow.show();
  }

  return mainWindow;
}

function registerElectronLifecycle() {
  const hasLock = app.requestSingleInstanceLock();

  if (!hasLock) {
    app.quit();
    return false;
  }

  app.on("second-instance", () => {
    void app.whenReady().then(() => showMainWindow());
  });

  app.on("activate", () => {
    void app.whenReady().then(() => showMainWindow());
  });

  app.on("window-all-closed", () => {
    // Intentionally keep the app alive in the tray so scheduled jobs continue
    // to run for the current user session.
  });

  app.on("before-quit", (event) => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;
    event.preventDefault();

    void stopBackend()
      .catch((error) => {
        console.error("Failed to stop the local API cleanly.", error);
      })
      .finally(() => {
        app.exit(0);
      });
  });

  return true;
}

async function bootstrap() {
  if (!registerElectronLifecycle()) {
    return;
  }

  await app.whenReady();
  app.setName(PRODUCT_NAME);

  applyDesktopEnvironmentDefaults();
  await ensureBackendStarted();
  ensureTray();
  await ensureLinuxAutostartEntry();

  if (!isBackgroundLaunch()) {
    await ensureWindow({ show: true });
  }
}

bootstrap().catch((error) => {
  console.error("Failed to launch Cron Job Dashboard desktop runtime.", error);
  app.exit(1);
});

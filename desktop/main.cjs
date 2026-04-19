const { appendFileSync, mkdirSync } = require("node:fs");
const { lstat, mkdir, readlink, rm, writeFile } = require("node:fs/promises");
const { dirname, join, resolve } = require("node:path");
const os = require("node:os");
const { kill } = require("node:process");

const {
  BrowserWindow,
  Menu,
  Tray,
  app,
  nativeImage,
} = require("electron");

const PRODUCT_NAME = "Cron Job Dashboard";
const DEFAULT_DESKTOP_PORT = "4100";
const BACKGROUND_ENV_KEY = "CRON_JOB_DASHBOARD_BACKGROUND";

let tray = null;
let mainWindow = null;
let backendRuntime = null;
let isQuitting = false;
let shutdownStarted = false;
let lifecycleRegistered = false;

function isBackgroundLaunch() {
  return process.env[BACKGROUND_ENV_KEY] === "1";
}

function isDesktopDev() {
  return Boolean(process.env.DESKTOP_DEV_SERVER_URL);
}

function writeDesktopLog(message, details) {
  try {
    const logDirectory = join(app.getPath("userData"), "logs");
    const detailsSuffix = details ? ` ${JSON.stringify(details)}` : "";

    mkdirSync(logDirectory, { recursive: true });
    appendFileSync(
      join(logDirectory, "desktop.log"),
      `${new Date().toISOString()} ${message}${detailsSuffix}\n`,
      "utf8",
    );
  } catch {
    // Logging should never block app startup.
  }
}

function getSingletonPaths() {
  const userDataDir = app.getPath("userData");

  return {
    userDataDir,
    cookiePath: join(userDataDir, "SingletonCookie"),
    lockPath: join(userDataDir, "SingletonLock"),
    socketPath: join(userDataDir, "SingletonSocket"),
  };
}

function parseSingletonPid(lockTarget) {
  const match = /-(\d+)$/.exec(lockTarget);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function isProcessAlive(pid) {
  try {
    kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function readSymlinkTarget(linkPath) {
  try {
    const linkStats = await lstat(linkPath);

    if (!linkStats.isSymbolicLink()) {
      return null;
    }

    return await readlink(linkPath);
  } catch {
    return null;
  }
}

async function clearStaleSingletonArtifacts() {
  const { userDataDir, cookiePath, lockPath, socketPath } = getSingletonPaths();
  const lockTarget = await readSymlinkTarget(lockPath);
  const socketTarget = await readSymlinkTarget(socketPath);
  const cookieTarget = await readSymlinkTarget(cookiePath);

  if (!lockTarget && !socketTarget && !cookieTarget) {
    return false;
  }

  const lockPid = lockTarget ? parseSingletonPid(lockTarget) : null;

  if (lockPid != null && isProcessAlive(lockPid)) {
    writeDesktopLog("singleton:lock-owned", { lockPid, lockTarget });
    return false;
  }

  const resolvedSocketTarget = socketTarget
    ? resolve(userDataDir, socketTarget)
    : null;
  const cleanupTargets = [
    cookiePath,
    lockPath,
    socketPath,
    cookieTarget ? resolve(userDataDir, cookieTarget) : null,
    lockTarget ? resolve(userDataDir, lockTarget) : null,
    resolvedSocketTarget,
    resolvedSocketTarget ? dirname(resolvedSocketTarget) : null,
  ].filter(Boolean);

  await Promise.allSettled(
    cleanupTargets.map((targetPath) => rm(targetPath, { force: true, recursive: true })),
  );
  writeDesktopLog("singleton:cleared-stale-artifacts", {
    lockTarget,
    socketTarget,
    cookieTarget,
  });

  return true;
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
    `Exec=/usr/bin/env ${BACKGROUND_ENV_KEY}=1 ${execPath}`,
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

  writeDesktopLog("backend:start-requested");
  const { startServer } = await import("../backend/src/server.js");
  backendRuntime = await startServer();
  writeDesktopLog("backend:started", { url: backendRuntime.url });
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
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  writeDesktopLog("window:created", { show });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("closed", () => {
    writeDesktopLog("window:closed");
    mainWindow = null;
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    writeDesktopLog("window:did-fail-load", {
      errorCode,
      errorDescription,
      validatedURL,
    });
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeDesktopLog("window:render-process-gone", details);
  });

  await mainWindow.loadURL(windowUrl);
  writeDesktopLog("window:loaded", { windowUrl });

  if (show) {
    mainWindow.show();
    writeDesktopLog("window:shown");
  }

  return mainWindow;
}

function registerElectronLifecycle() {
  if (lifecycleRegistered) {
    return;
  }

  lifecycleRegistered = true;

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
}

async function acquireSingleInstanceLock() {
  if (app.requestSingleInstanceLock()) {
    writeDesktopLog("singleton:lock-acquired");
    return true;
  }

  writeDesktopLog("singleton:lock-missed");
  const clearedArtifacts = await clearStaleSingletonArtifacts();

  if (!clearedArtifacts) {
    writeDesktopLog("singleton:lock-held-by-active-instance");
    app.quit();
    return false;
  }

  if (app.requestSingleInstanceLock()) {
    writeDesktopLog("singleton:lock-reacquired-after-cleanup");
    return true;
  }

  writeDesktopLog("singleton:lock-retry-failed");
  app.quit();
  return false;
}

async function bootstrap() {
  writeDesktopLog("bootstrap:start", {
    background: isBackgroundLaunch(),
    packaged: app.isPackaged,
  });

  if (!(await acquireSingleInstanceLock())) {
    return;
  }

  registerElectronLifecycle();
  await app.whenReady();
  writeDesktopLog("bootstrap:ready");
  app.setName(PRODUCT_NAME);

  applyDesktopEnvironmentDefaults();
  writeDesktopLog("bootstrap:environment-applied", {
    host: process.env.HOST,
    port: process.env.PORT,
    staticDir: process.env.STATIC_DIR,
  });
  await ensureBackendStarted();
  ensureTray();
  writeDesktopLog("bootstrap:tray-ready");
  await ensureLinuxAutostartEntry();
  writeDesktopLog("bootstrap:autostart-ready");

  if (!isBackgroundLaunch()) {
    await ensureWindow({ show: true });
  }

  writeDesktopLog("bootstrap:complete");
}

bootstrap().catch((error) => {
  writeDesktopLog("bootstrap:failed", {
    message: error?.message,
    stack: error?.stack,
  });
  console.error("Failed to launch Cron Job Dashboard desktop runtime.", error);
  app.exit(1);
});

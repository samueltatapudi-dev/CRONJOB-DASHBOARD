# Cron Job Dashboard

Cron Job Dashboard is a local Linux application for creating, scheduling, running, and monitoring cron jobs from a simple desktop dashboard.

It runs jobs on the user's own machine, stores jobs and logs locally with SQLite, and keeps the scheduler running in the background after the window is closed.

## Install

The recommended Linux installer is the generated `.deb` package:

```bash
sudo apt install ./release/cron-job-dashboard_<version>_amd64.deb
```

After installation, open `Cron Job Dashboard` from your app menu.

You can also use the portable `AppImage` build:

```bash
chmod +x "release/Cron Job Dashboard-<version>.AppImage"
./release/Cron\ Job\ Dashboard-<version>.AppImage
```

## Build The Installer From Source

If you are building the installer yourself:

```bash
npm install
npm run dist:linux
```

The generated Linux packages are written to `release/`.

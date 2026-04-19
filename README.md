# Cron Job Dashboard

Cron Job Dashboard is a local Linux app for creating, scheduling, running, and monitoring cron jobs from a desktop dashboard.

Jobs run on the user's own machine, logs are stored locally, and the scheduler keeps running in the background after the window is closed.

## Install on Linux

1. Open a terminal in this project folder.
2. Install the Debian package:

```bash
sudo apt install ./release/cron-job-dashboard_1.0.0_amd64.deb
```

3. Open `Cron Job Dashboard` from your app menu.

## AppImage Fallback

If you do not want to install the `.deb`, run the portable AppImage instead:

```bash
chmod +x "release/Cron Job Dashboard-1.0.0.AppImage"
./release/Cron\ Job\ Dashboard-1.0.0.AppImage
```

## Maintainer Note

To generate the Linux installer files from source:

```bash
npm install
npm run dist:linux
```

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("cronDashboardDesktop", {
  isDesktop: true,
  platform: process.platform,
});

import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("cronDashboardDesktop", {
  isDesktop: true,
  platform: process.platform,
});

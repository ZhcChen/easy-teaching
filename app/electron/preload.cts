import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("easyTeachingDesktop", {
  platform: process.platform,
  isDesktop: true
});

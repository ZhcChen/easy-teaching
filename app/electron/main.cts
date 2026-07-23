import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, nativeImage } from "electron";

const DEV_RENDERER_URL = "http://127.0.0.1:57001";
const LOCAL_SERVER_HOST = "127.0.0.1";
const WINDOW_BACKGROUND = "#f4f7fb";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

let staticServerUrl: string | null = null;
let staticServerCloser: (() => Promise<void>) | null = null;

function resolveRendererEntry() {
  return process.env.ELECTRON_RENDERER_URL ?? null;
}

function resolveDevIconPath() {
  return path.resolve(
    __dirname,
    "../../shared-assets/brand/logo/logo-mark-512.png"
  );
}

function resolveStaticDistDir() {
  return path.resolve(__dirname, "../dist");
}

function resolveMimeType(filePath: string) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function applyRuntimeBrandIcon() {
  if (app.isPackaged) {
    return;
  }

  const icon = nativeImage.createFromPath(resolveDevIconPath());
  if (icon.isEmpty()) {
    return;
  }

  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(icon);
  }
}

async function resolveRequestFilePath(urlPathname: string) {
  const distDir = resolveStaticDistDir();
  const decodedPath = decodeURIComponent(urlPathname);
  const safeRelativePath = decodedPath === "/" ? "/index.html" : decodedPath;
  const hasExtension = path.extname(safeRelativePath) !== "";
  let requestedPath = path.resolve(distDir, `.${safeRelativePath}`);
  const requestedRelativePath = path.relative(distDir, requestedPath);

  if (
    requestedRelativePath.startsWith("..") ||
    path.isAbsolute(requestedRelativePath)
  ) {
    return null;
  }

  try {
    const requestedStat = await stat(requestedPath);
    if (requestedStat.isDirectory()) {
      requestedPath = path.join(requestedPath, "index.html");
    }

    return requestedPath;
  } catch {
    if (hasExtension) {
      return null;
    }

    return path.join(distDir, "index.html");
  }
}

async function handleStaticRequest(
  request: IncomingMessage,
  response: ServerResponse
) {
  const requestUrl = new URL(request.url ?? "/", `http://${LOCAL_SERVER_HOST}`);
  const requestedFilePath = await resolveRequestFilePath(requestUrl.pathname);

  if (!requestedFilePath) {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Not Found");
    return;
  }

  try {
    const content = await readFile(requestedFilePath);

    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": resolveMimeType(requestedFilePath)
    });
    response.end(content);
  } catch (error) {
    console.error("读取桌面静态资源失败:", error);
    response.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Internal Server Error");
  }
}

async function ensureStaticServer() {
  if (staticServerUrl) {
    return staticServerUrl;
  }

  const distDir = resolveStaticDistDir();
  await stat(distDir);

  const server = createServer((request, response) => {
    void handleStaticRequest(request, response);
  });

  const url = await new Promise<string>((resolve, reject) => {
    const handleError = (error: Error) => {
      server.off("listening", handleListening);
      reject(error);
    };

    const handleListening = () => {
      server.off("error", handleError);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("无法解析桌面静态服务地址"));
        return;
      }

      resolve(`http://${LOCAL_SERVER_HOST}:${address.port}`);
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(0, LOCAL_SERVER_HOST);
  });

  staticServerCloser = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

  staticServerUrl = url;
  return staticServerUrl;
}

async function createMainWindow() {
  const windowIcon = app.isPackaged ? undefined : resolveDevIconPath();
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    title: "Easy Teaching",
    backgroundColor: WINDOW_BACKGROUND,
    ...(windowIcon ? { icon: windowIcon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  const rendererUrl = resolveRendererEntry() ?? (app.isPackaged ? await ensureStaticServer() : DEV_RENDERER_URL);
  await window.loadURL(rendererUrl);
  return window;
}

app.whenReady()
  .then(async () => {
    applyRuntimeBrandIcon();
    await createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow();
      }
    });
  })
  .catch((error) => {
    console.error("Electron 启动失败:", error);
    app.quit();
  });

app.on("before-quit", () => {
  if (staticServerCloser) {
    void staticServerCloser();
    staticServerCloser = null;
    staticServerUrl = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

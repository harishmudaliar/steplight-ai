import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  ipcMain,
  screen,
  shell,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

interface DesktopState {
  bounds: WindowBounds;
  isMaximized: boolean;
  compactMode: boolean;
  nativeNotificationsEnabled: boolean;
}

function readDimension(name: string, fallback: number, minimum: number, maximum: number): number {
  const configured = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(configured)) return fallback;
  return Math.max(minimum, Math.min(configured, maximum));
}

const DEFAULT_BOUNDS: WindowBounds = {
  width: readDimension('WINDOW_WIDTH', 1366, 360, 3840),
  height: readDimension('WINDOW_HEIGHT', 768, 480, 2160),
};
const COMPACT_BOUNDS: WindowBounds = { width: 520, height: 720 };
const MIN_WINDOW_SIZE = {
  width: readDimension('WINDOW_MIN_WIDTH', 900, 320, 3840),
  height: readDimension('WINDOW_MIN_HEIGHT', 600, 400, 2160),
};
const MIN_COMPACT_SIZE = { width: 360, height: 480 };
const APP_NAME = process.env.DESKTOP_APP_NAME || 'Steplight AI';
const STATE_FILE = 'desktop-state.json';

if (!app.isPackaged) {
  const rootEnvPath = path.resolve(__dirname, '../../..', '.env');
  if (fs.existsSync(rootEnvPath)) {
    const dotenvResult = require('dotenv').config({ path: rootEnvPath }) as {
      error?: Error;
    };
    if (dotenvResult.error) throw dotenvResult.error;
  }
}

// Optional isolated development profile for native persistence/auth smoke tests.
// Packaged applications keep their normal user-data location.
if (!app.isPackaged && process.env.DESKTOP_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.DESKTOP_USER_DATA_DIR));
}

function getDevServerUrl(): URL {
  const configuredUrl = process.env.DESKTOP_DEV_SERVER_URL || 'http://localhost:5173';
  const url = new URL(configuredUrl);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error('DESKTOP_DEV_SERVER_URL must be a local HTTP development server URL.');
  }
  return url;
}

const devServerUrl = !app.isPackaged ? getDevServerUrl() : null;
const packagedRendererPath = path.resolve(process.resourcesPath, 'web', 'index.html');
const developmentRendererPath = path.resolve(__dirname, '../../web/dist/index.html');
const statePath = () => path.join(app.getPath('userData'), STATE_FILE);

let mainWindow: BrowserWindow | null = null;
let desktopState: DesktopState = {
  bounds: DEFAULT_BOUNDS,
  isMaximized: false,
  compactMode: false,
  nativeNotificationsEnabled: false,
};
let persistTimer: NodeJS.Timeout | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function loadDesktopState(): DesktopState {
  const filePath = statePath();
  if (!fs.existsSync(filePath)) return desktopState;

  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!isRecord(parsed)) throw new Error('Desktop settings must be a JSON object.');
    const boundsValue = parsed.bounds;
    const bounds = isRecord(boundsValue) ? boundsValue : {};
    const width = Number(bounds.width);
    const height = Number(bounds.height);
    return {
      bounds: {
        width: Number.isFinite(width) ? Math.max(360, Math.min(width, 3840)) : DEFAULT_BOUNDS.width,
        height: Number.isFinite(height) ? Math.max(480, Math.min(height, 2160)) : DEFAULT_BOUNDS.height,
        ...(Number.isFinite(Number(bounds.x)) ? { x: Number(bounds.x) } : {}),
        ...(Number.isFinite(Number(bounds.y)) ? { y: Number(bounds.y) } : {}),
      },
      isMaximized: parsed.isMaximized === true,
      compactMode: parsed.compactMode === true,
      nativeNotificationsEnabled: parsed.nativeNotificationsEnabled === true,
    };
  } catch (error: unknown) {
    console.error('Could not read saved desktop settings; using defaults.', error);
    return desktopState;
  }
}

function persistDesktopState(): void {
  const filePath = statePath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(desktopState, null, 2), 'utf8');
  } catch (error: unknown) {
    console.error('Could not save desktop settings.', error);
  }
}

function scheduleStateSave(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = undefined;
    persistDesktopState();
  }, 250);
}

function getSafeBounds(bounds: WindowBounds): WindowBounds {
  const display = screen.getDisplayMatching({
    x: bounds.x ?? 0,
    y: bounds.y ?? 0,
    width: bounds.width,
    height: bounds.height,
  });
  const workArea = display.workArea;
  const compact = desktopState.compactMode;
  const minSize = compact ? MIN_COMPACT_SIZE : MIN_WINDOW_SIZE;
  const width = Math.max(Math.min(minSize.width, workArea.width), Math.min(bounds.width, workArea.width));
  const height = Math.max(Math.min(minSize.height, workArea.height), Math.min(bounds.height, workArea.height));
  const x = Math.min(
    Math.max(bounds.x ?? workArea.x, workArea.x),
    workArea.x + workArea.width - width
  );
  const y = Math.min(
    Math.max(bounds.y ?? workArea.y, workArea.y),
    workArea.y + workArea.height - height
  );
  return { x, y, width, height };
}

function isAllowedAppUrl(rawUrl: string): boolean {
  try {
    const target = new URL(rawUrl);
    if (target.protocol === 'file:') {
      const allowedFilePath = app.isPackaged ? packagedRendererPath : developmentRendererPath;
      return path.resolve(fileURLToPath(target)) === path.resolve(allowedFilePath);
    }
    return Boolean(devServerUrl && target.origin === devServerUrl.origin);
  } catch {
    return false;
  }
}

function openExternalHttps(rawUrl: string): void {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return;
    void shell.openExternal(url.toString()).catch((error: unknown) => {
      console.error('Could not open the external HTTPS link.', error);
    });
  } catch {
    console.error('Blocked an invalid external URL.');
  }
}

function applyWindowMode(): void {
  if (!mainWindow) return;
  const mode = desktopState.compactMode ? COMPACT_BOUNDS : DEFAULT_BOUNDS;
  const minSize = desktopState.compactMode ? MIN_COMPACT_SIZE : MIN_WINDOW_SIZE;
  mainWindow.setMinimumSize(minSize.width, minSize.height);
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  mainWindow.setBounds(getSafeBounds({ ...desktopState.bounds, width: mode.width, height: mode.height }));
  desktopState.bounds = mainWindow.getBounds();
  scheduleStateSave();
}

function installApplicationMenu(): void {
  const menu = Menu.buildFromTemplate([
    {
      label: 'View',
      submenu: [
        {
          label: 'Compact window',
          type: 'checkbox',
          checked: desktopState.compactMode,
          accelerator: 'Ctrl+Shift+C',
          click: () => {
            if (!mainWindow) return;
            desktopState.compactMode = !desktopState.compactMode;
            applyWindowMode();
            installApplicationMenu();
          },
        },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

function registerDesktopIpc(): void {
  const isTrustedIpcSender = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) =>
    event.sender === mainWindow?.webContents &&
    Boolean(
      event.senderFrame &&
      event.senderFrame === event.sender.mainFrame &&
      isAllowedAppUrl(event.senderFrame.url)
    );

  ipcMain.handle('desktop:get-settings', (event) => {
    if (!isTrustedIpcSender(event)) throw new Error('Blocked an untrusted desktop settings request.');
    return {
      nativeNotificationsEnabled: desktopState.nativeNotificationsEnabled,
      notificationsSupported: Notification.isSupported(),
    };
  });

  ipcMain.handle('desktop:set-notifications-enabled', (event, enabled: unknown) => {
    if (!isTrustedIpcSender(event)) throw new Error('Blocked an untrusted notification settings request.');
    if (typeof enabled !== 'boolean') throw new TypeError('Notification preference must be a boolean.');
    if (enabled && !Notification.isSupported()) {
      throw new Error('Native notifications are not supported on this device.');
    }
    desktopState.nativeNotificationsEnabled = enabled;
    persistDesktopState();
    return { nativeNotificationsEnabled: enabled, notificationsSupported: Notification.isSupported() };
  });

  ipcMain.on('desktop:step-completed', (event) => {
    if (!isTrustedIpcSender(event)) {
      console.error('Blocked an untrusted step-completion notification request.');
      return;
    }
    if (!desktopState.nativeNotificationsEnabled || !Notification.isSupported()) return;
    if (mainWindow?.isVisible() && mainWindow.isFocused()) return;
    try {
      new Notification({
        title: APP_NAME,
        body: 'One step is saved. Your next small action will be here when you are ready.',
      }).show();
    } catch (error: unknown) {
      console.error('Could not show the native step-completion notification.', error);
    }
  });
}

function createWindow(): void {
  const initialBounds = getSafeBounds(desktopState.bounds);
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    ...initialBounds,
    minWidth: desktopState.compactMode ? MIN_COMPACT_SIZE.width : MIN_WINDOW_SIZE.width,
    minHeight: desktopState.compactMode ? MIN_COMPACT_SIZE.height : MIN_WINDOW_SIZE.height,
    backgroundColor: '#f7f9fc',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalHttps(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedAppUrl(url)) return;
    event.preventDefault();
    openExternalHttps(url);
  });
  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (!isAllowedAppUrl(url)) event.preventDefault();
  });

  const rendererPath = app.isPackaged ? packagedRendererPath : developmentRendererPath;
  if (app.isPackaged || !devServerUrl) {
    if (!fs.existsSync(rendererPath)) {
      console.error('Built renderer files not found at:', rendererPath);
      return;
    }
    void mainWindow.loadFile(rendererPath).catch((error: unknown) => {
      console.error('Could not load the packaged renderer.', error);
    });
  } else {
    void mainWindow.loadURL(devServerUrl.toString()).catch((error: unknown) => {
      console.error('Could not load the local Vite renderer.', error);
      if (fs.existsSync(developmentRendererPath)) {
        void mainWindow?.loadFile(developmentRendererPath).catch((fallbackError: unknown) => {
          console.error('Could not load the built development renderer.', fallbackError);
        });
      }
    });
  }

  const activeWindow = mainWindow;
  activeWindow.on('resize', scheduleStateSave);
  activeWindow.on('move', scheduleStateSave);
  activeWindow.on('maximize', () => {
    desktopState.isMaximized = true;
    scheduleStateSave();
  });
  activeWindow.on('unmaximize', () => {
    desktopState.isMaximized = false;
    scheduleStateSave();
  });
  activeWindow.on('close', () => {
    if (!activeWindow.isMaximized()) desktopState.bounds = activeWindow.getBounds();
    desktopState.isMaximized = activeWindow.isMaximized();
    if (persistTimer) clearTimeout(persistTimer);
    persistDesktopState();
  });
  activeWindow.on('closed', () => {
    mainWindow = null;
  });

  if (desktopState.isMaximized) activeWindow.maximize();
}

const gotTheLock = (!app.isPackaged && Boolean(process.env.DESKTOP_USER_DATA_DIR)) || app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    desktopState = loadDesktopState();
    registerDesktopIpc();
    installApplicationMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }).catch((error: unknown) => {
    console.error('Electron failed to initialize.', error);
    app.quit();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

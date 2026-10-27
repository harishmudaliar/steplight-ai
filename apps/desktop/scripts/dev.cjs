const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '../..');
const webRoot = path.join(projectRoot, 'apps', 'web');
const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const rootEnvPath = path.join(projectRoot, '.env');
const rootEnv = fs.existsSync(rootEnvPath)
  ? require('dotenv').parse(fs.readFileSync(rootEnvPath))
  : {};
const configuredUrl = process.env.DESKTOP_DEV_SERVER_URL || rootEnv.DESKTOP_DEV_SERVER_URL || 'http://localhost:5173';
const rendererUrl = new URL(configuredUrl);

if (
  rendererUrl.protocol !== 'http:' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(rendererUrl.hostname) ||
  rendererUrl.username ||
  rendererUrl.password
) {
  throw new Error('DESKTOP_DEV_SERVER_URL must point to a local HTTP development server.');
}

if (!rendererUrl.port) rendererUrl.port = '5173';
rendererUrl.pathname = '/';
rendererUrl.search = '';
rendererUrl.hash = '';

let viteProcess = null;
let electronProcess = null;
let shuttingDown = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function viteIsReady() {
  try {
    const response = await fetch(new URL('/@vite/client', rendererUrl), {
      signal: AbortSignal.timeout(750),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function stopChildren() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (electronProcess && electronProcess.exitCode === null) electronProcess.kill();
  if (viteProcess && viteProcess.exitCode === null) viteProcess.kill();
}

function setExitCode(code) {
  process.exitCode = code;
}

process.on('SIGINT', () => { stopChildren(); });
process.on('SIGTERM', () => { stopChildren(); });

async function start() {
  if (!(await viteIsReady())) {
    if (!fs.existsSync(viteCli)) {
      throw new Error('Vite is not installed in the project workspace. Run npm install first.');
    }

    const port = rendererUrl.port || '80';
    viteProcess = spawn(process.execPath, [
      viteCli,
      '--host', rendererUrl.hostname,
      '--port', port,
      '--strictPort',
    ], {
      cwd: webRoot,
      env: process.env,
      stdio: 'inherit',
    });

    viteProcess.once('error', (error) => {
      console.error('Could not start the shared web renderer for Electron.', error);
      setExitCode(1);
      stopChildren();
    });

    let ready = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (viteProcess.exitCode !== null) break;
      if (await viteIsReady()) {
        ready = true;
        break;
      }
      await wait(250);
    }
    if (!ready) {
      throw new Error('The shared web renderer did not start at the configured local URL.');
    }
  }

  if (shuttingDown) return;
  console.log(`Electron is using the shared renderer at ${rendererUrl.origin}`);
  const env = {
    ...process.env,
    DESKTOP_USE_DEV_SERVER: 'true',
    DESKTOP_DEV_SERVER_URL: rendererUrl.origin,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  electronProcess = spawn(require('electron'), ['.'], {
    cwd: desktopRoot,
    env,
    stdio: 'inherit',
  });
  electronProcess.once('error', (error) => {
    console.error('Could not launch Electron.', error);
    setExitCode(1);
    stopChildren();
  });
  electronProcess.once('exit', (code) => {
    setExitCode(code ?? 1);
    stopChildren();
  });
}

start().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Could not start Electron development mode.');
  setExitCode(1);
  stopChildren();
});

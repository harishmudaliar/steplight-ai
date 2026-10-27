// Developer shells can inherit this flag from Node-based editor hosts.
// Electron must launch in app mode; the renderer uses root VITE_API_BASE_URL.
const { spawn } = require('node:child_process');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), ['.'], { env, stdio: 'inherit' });
child.on('error', (error) => {
  console.error('Could not launch Electron:', error);
  process.exitCode = 1;
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });

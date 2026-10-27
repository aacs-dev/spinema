// Starts the real Worker locally (`wrangler dev` on 8787, token from worker/.dev.vars) and `ng serve`.
// Needs the Worker's dependencies once: cd worker && npm ci
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerDir = join(root, 'worker');
const wranglerBin = join(workerDir, 'node_modules/wrangler/bin/wrangler.js');

if (!existsSync(wranglerBin)) {
  console.error('Wrangler is not installed. Run: cd worker && npm ci');
  process.exit(1);
}
if (!existsSync(join(workerDir, '.dev.vars'))) {
  console.error('worker/.dev.vars is missing. Create it with: TMDB_READ_TOKEN=<your read access token>');
  process.exit(1);
}

const children = [
  spawn(process.execPath, [wranglerBin, 'dev', '--port', '8787'], { cwd: workerDir, stdio: 'inherit' }),
  spawn(process.execPath, [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'serve'], { cwd: root, stdio: 'inherit' }),
];

// When either one stops, stop the other.
for (const child of children) {
  child.on('exit', (code) => {
    for (const other of children) if (other !== child && other.exitCode === null) other.kill();
    process.exit(code ?? 0);
  });
}

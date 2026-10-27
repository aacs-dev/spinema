// Starts the mock API and `ng serve` with the mock configuration in one command.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './mock-api.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ng = spawn(process.execPath, [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'serve', '--configuration', 'mock'], {
  cwd: root,
  stdio: 'inherit',
});
ng.on('exit', (code) => process.exit(code ?? 0));

// `ng serve` against the published Worker (production environment), so real TMDB data works locally
// without running the Worker, including on networks whose proxy blocks the local Worker.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ng = spawn(process.execPath, [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'serve', '--configuration', 'production'], {
  cwd: root,
  stdio: 'inherit',
});
ng.on('exit', (code) => process.exit(code ?? 0));

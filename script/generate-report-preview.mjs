// node script/generate-report-preview.mjs
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(`${root}tmp/pdfs`, { recursive: true });
mkdirSync(`${root}output/pdf`, { recursive: true });
await build({ entryPoints: [`${root}script/generate-report-preview.ts`], outfile: `${root}tmp/pdfs/preview.cjs`, bundle: true, platform: 'node', format: 'cjs', logLevel: 'warning' });
const result = spawnSync(process.execPath, [`${root}tmp/pdfs/preview.cjs`, `${root}output/pdf/informe-operativo-demostracion.pdf`, process.argv[2] ?? ''], { cwd: root, stdio: 'inherit' });
process.exitCode = result.status ?? 1;

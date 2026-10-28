import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = resolve(root, 'src');
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
const sliced = new Set(['pages', 'widgets', 'features', 'entities']);
const errors = [];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.(ts|tsx)$/.test(path) ? [path] : [];
  }));
  return nested.flat();
}

for (const file of [...await files(sourceRoot), ...await files(resolve(root, 'app'))]) {
  const from = relative(sourceRoot, file).split('/');
  const fromLayer = from[0] === '..' ? 'app' : from[0];
  const contents = await readFile(file, 'utf8');
  for (const match of contents.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue;
    const target = specifier.startsWith('@/') ? resolve(sourceRoot, specifier.slice(2)) : resolve(dirname(file), specifier);
    const to = relative(sourceRoot, target).split('/');
    const message = (reason) => errors.push(`${relative(root, file)} → ${specifier}: ${reason}`);
    if (!layers.includes(to[0])) {
      if (from[0] !== '..') message('source modules may only import FSD layers');
      continue;
    }
    if (layers.indexOf(to[0]) < layers.indexOf(fromLayer)) message('import points to an upper layer');
    const sameSlice = fromLayer === to[0] && from[1] === to[1];
    if (sliced.has(fromLayer) && fromLayer === to[0] && !sameSlice) message('sibling slices must stay independent');
    if (sliced.has(to[0]) && !sameSlice && to.length > 2) {
      const serverEntry = to.length === 3 && to[2] === 'server' && relative(root, file).startsWith('app/api/');
      if (!serverEntry) message('use the slice public API');
    }
    if (specifier.endsWith('/server') && !relative(root, file).startsWith('app/api/')) message('server entry points belong in route handlers');
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('FSD boundaries and public APIs are valid.');

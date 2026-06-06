import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['build-tests/tests', 'build-tests/src'];
const extensions = ['.js', '.jsx'];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (extensions.some((extension) => path.endsWith(extension))) fix(path);
  }
}

function fix(path) {
  let source = readFileSync(path, 'utf8');
  source = source.replace(/from '(\.\.?\/[^']+)'/g, (match, specifier) => {
    if (/\.[cm]?jsx?$/.test(specifier)) return match;
    return `from '${specifier}.js'`;
  });
  writeFileSync(path, source);
}

for (const root of roots) walk(root);

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', 'src/**/*.ts', 'src/**/*.tsx', 'scripts/**/*.mjs', 'tests/**/*.ts', 'tests/**/*.tsx'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const failures = files.filter((file) => /[ \t]$/m.test(readFileSync(file, 'utf8')));

if (failures.length) {
  console.error(`Trailing whitespace found in:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(`Format check passed for ${files.length} files.`);

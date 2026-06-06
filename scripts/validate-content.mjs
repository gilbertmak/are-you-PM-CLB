import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

execFileSync('npx', ['tsc', '-p', 'tsconfig.test.json'], { stdio: 'inherit' });
const { terms } = await import('../build-tests/src/data/terms.js');

const requiredStringFields = ['id', 'english', 'simplified', 'pinyin', 'category', 'level', 'domain', 'partOfSpeech', 'usageNote', 'formalRegister'];
const requiredArrayFields = ['collocations', 'exampleSentences', 'commonMistakes', 'relatedTerms'];
const ids = new Set();
const english = new Set();
const failures = [];

for (const [index, term] of terms.entries()) {
  const label = term.id || `term at index ${index}`;

  for (const field of requiredStringFields) {
    if (typeof term[field] !== 'string' || !term[field].trim()) failures.push(`${label}: missing ${field}`);
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(term[field]) || term[field].length === 0) failures.push(`${label}: ${field} must be a non-empty array`);
  }

  if (ids.has(term.id)) failures.push(`${label}: duplicate id`);
  ids.add(term.id);

  const englishKey = `${term.category}::${String(term.english || '').trim().toLowerCase()}`;
  if (english.has(englishKey)) failures.push(`${label}: duplicate English term within ${term.category} "${term.english}"`);
  english.add(englishKey);

  for (const [exampleIndex, example] of (term.exampleSentences || []).entries()) {
    for (const field of ['english', 'chinese', 'pinyin']) {
      if (typeof example[field] !== 'string' || !example[field].trim()) failures.push(`${label}: example ${exampleIndex + 1} missing ${field}`);
    }
  }
}

if (failures.length) {
  console.error(`Content QA failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (existsSync('build-tests')) rmSync('build-tests', { recursive: true, force: true });
console.log(`Content QA passed for ${terms.length} terms: schema completeness and duplicate checks are clean.`);

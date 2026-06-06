import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAttempt } from '../src/lib/answerValidation';
import { importProgress, migrateLegacyProgress, PROGRESS_CACHE_KEY } from '../src/lib/persistence';
import { rateCard } from '../src/lib/spacedRepetition';
import { DEFAULT_GLOSSARY_FILTERS, STORAGE_KEY, getFilteredTerms, type ProgressMap } from '../src/lib/studySession';
import { terms } from '../src/data/terms';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  },
});

beforeEach(() => store.clear());

test('filters terms by category, domain, query, and due status', () => {
  const aiTerms = getFilteredTerms(
    terms,
    { ...DEFAULT_GLOSSARY_FILTERS, category: 'ai', domain: 'AI', dueNow: true },
    'model',
    {},
    1000,
  );

  assert.ok(aiTerms.length > 0);
  assert.ok(aiTerms.every((term) => term.category === 'ai'));
  assert.ok(aiTerms.every((term) => term.domain === 'AI'));
  assert.ok(aiTerms.some((term) => `${term.english} ${term.usageNote}`.toLowerCase().includes('model')));
});

test('schedules correct and incorrect card ratings with review history', () => {
  const term = terms[0];
  const first = rateCard(term, true, {}, { state: 'exact', feedback: 'Exact', normalizedAttempt: term.simplified, matchedAgainst: term.simplified });
  const firstRecord = first[term.id];

  assert.equal(firstRecord.correct, 1);
  assert.equal(firstRecord.streak, 1);
  assert.ok(firstRecord.dueAt > (firstRecord.lastReviewedAt ?? 0));

  const second = rateCard(term, false, first);
  const secondRecord = second[term.id];

  assert.equal(secondRecord.incorrect, 1);
  assert.equal(secondRecord.streak, 0);
  assert.equal(secondRecord.history?.length, 2);
});

test('validates exact characters, pinyin aliases, and unrelated attempts', () => {
  const term = terms.find((candidate) => Array.isArray((candidate as { acceptedAliases?: readonly string[] }).acceptedAliases)) ?? terms[0];

  assert.equal(validateAttempt(term, term.simplified).state, 'exact');
  assert.notEqual(validateAttempt(term, term.pinyin).state, 'empty-or-unrelated');
  assert.equal(validateAttempt(term, 'definitely unrelated answer').state, 'empty-or-unrelated');
});

test('migrates legacy progress and accepts current progress exports', () => {
  const term = terms[0];
  const legacy: ProgressMap = {
    [term.id]: {
      attempts: 2,
      correct: 1,
      incorrect: 1,
      streak: 0,
      ease: 2.3,
      intervalHours: 1,
      dueAt: 123,
      lastResult: 'left',
      lastReviewedAt: 111,
      pronunciationAttempts: 0,
      pronunciationGood: 0,
      pronunciationNeedsPractice: 0,
    },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

  const migrated = migrateLegacyProgress(999);
  assert.equal(migrated?.migratedFrom, STORAGE_KEY);
  assert.equal(migrated?.reviews.length, 2);

  const imported = importProgress(JSON.stringify({ version: 4, progress: legacy, reviews: migrated?.reviews ?? [] }));
  assert.equal(imported.progress[term.id].attempts, 2);
  assert.ok(localStorage.getItem(PROGRESS_CACHE_KEY));
});

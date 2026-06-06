import type { ProgressMap, ProgressRecord } from './studySession';
import { STORAGE_KEY } from './studySession';

export type ValidationResult = 'correct' | 'incorrect';
export type ReviewKind = 'vocabulary' | 'pronunciation';
export type SelfRating = 'got-it' | 'needs-review';

export interface ReviewEvent {
  termId: string;
  attempt: string;
  validationResult: ValidationResult;
  selfRating: SelfRating;
  reviewedAt: number;
  nextDueAt: number;
  kind?: ReviewKind;
  pronunciationResult?: 'good' | 'needs-practice';
  feedback?: string;
}

export interface ProgressSnapshot {
  version: 4;
  progress: ProgressMap;
  reviews: ReviewEvent[];
  migratedFrom?: string;
  migratedAt?: number;
}

export interface ProgressApi {
  getProgress(): Promise<ProgressSnapshot>;
  saveProgress(snapshot: ProgressSnapshot): Promise<void>;
  saveReview(review: ReviewEvent, state: ProgressRecord): Promise<void>;
  patchProgress(termId: string, state: ProgressRecord): Promise<void>;
}

export const SNAPSHOT_VERSION = 4;
export const PROGRESS_CACHE_KEY = 'pm_mandarin_flashcard_progress_v4';
export const AUTH_TOKEN_KEY = 'pm_mandarin_auth_token';

const EMPTY_SNAPSHOT: ProgressSnapshot = {
  version: SNAPSHOT_VERSION,
  progress: {},
  reviews: [],
};

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeProgressRecord(value: unknown): ProgressRecord | null {
  if (!isRecord(value)) return null;

  return {
    termId: typeof value.termId === 'string' ? value.termId : undefined,
    attempts: Number(value.attempts) || 0,
    correct: Number(value.correct) || 0,
    incorrect: Number(value.incorrect) || 0,
    streak: Number(value.streak) || 0,
    ease: Number(value.ease) || 2.5,
    intervalHours: Number(value.intervalHours) || 0,
    dueAt: Number(value.dueAt) || 0,
    lastResult: value.lastResult === 'right' || value.lastResult === 'left' ? value.lastResult : 'new',
    lastReviewedAt: Number(value.lastReviewedAt) || undefined,
    history: Array.isArray(value.history) ? value.history as ProgressRecord['history'] : undefined,
    pronunciationAttempts: Number(value.pronunciationAttempts) || 0,
    pronunciationGood: Number(value.pronunciationGood) || 0,
    pronunciationNeedsPractice: Number(value.pronunciationNeedsPractice) || 0,
    pronunciationHistory: Array.isArray(value.pronunciationHistory) ? value.pronunciationHistory as ProgressRecord['pronunciationHistory'] : undefined,
  };
}

function normalizeProgressMap(value: unknown): ProgressMap {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce<ProgressMap>((acc, [termId, record]) => {
    const normalized = normalizeProgressRecord(record);
    if (normalized) acc[termId] = { ...normalized, termId: normalized.termId ?? termId };
    return acc;
  }, {});
}

function normalizeReviewEvent(value: unknown): ReviewEvent | null {
  if (!isRecord(value) || typeof value.termId !== 'string') return null;

  const validationResult = value.validationResult === 'incorrect' ? 'incorrect' : 'correct';
  const selfRating = value.selfRating === 'needs-review' ? 'needs-review' : 'got-it';

  return {
    termId: value.termId,
    attempt: typeof value.attempt === 'string' ? value.attempt : '',
    validationResult,
    selfRating,
    reviewedAt: Number(value.reviewedAt) || Date.now(),
    nextDueAt: Number(value.nextDueAt) || 0,
    kind: value.kind === 'pronunciation' ? 'pronunciation' : 'vocabulary',
    pronunciationResult: value.pronunciationResult === 'needs-practice' ? 'needs-practice' : value.pronunciationResult === 'good' ? 'good' : undefined,
    feedback: typeof value.feedback === 'string' ? value.feedback : undefined,
  };
}

function normalizeSnapshot(value: unknown): ProgressSnapshot | null {
  if (!isRecord(value)) return null;

  const progress = normalizeProgressMap(value.progress);
  const reviews = Array.isArray(value.reviews)
    ? value.reviews.map(normalizeReviewEvent).filter((review): review is ReviewEvent => Boolean(review))
    : [];

  return {
    version: SNAPSHOT_VERSION,
    progress,
    reviews,
    migratedFrom: typeof value.migratedFrom === 'string' ? value.migratedFrom : undefined,
    migratedAt: Number(value.migratedAt) || undefined,
  };
}

function synthesizeLegacyReviews(progress: ProgressMap, migratedAt: number): ReviewEvent[] {
  return Object.entries(progress).flatMap(([termId, record]) => {
    const totalAttempts = Math.max(record.attempts || 0, (record.correct || 0) + (record.incorrect || 0));
    if (!totalAttempts) return [];

    const reviewedAt = record.lastReviewedAt || migratedAt;
    const correctCount = record.correct || 0;

    return Array.from({ length: totalAttempts }, (_, index) => {
      const wasCorrect = index < correctCount;
      return {
        termId,
        attempt: `Migrated legacy aggregate attempt ${index + 1}`,
        validationResult: wasCorrect ? 'correct' : 'incorrect',
        selfRating: wasCorrect ? 'got-it' : 'needs-review',
        reviewedAt,
        nextDueAt: record.dueAt || reviewedAt,
      } satisfies ReviewEvent;
    });
  });
}

export function migrateLegacyProgress(now = Date.now()): ProgressSnapshot | null {
  const legacyProgress = normalizeProgressMap(parseJson<unknown>(localStorage.getItem(STORAGE_KEY)));
  if (!Object.keys(legacyProgress).length) return null;

  return {
    version: SNAPSHOT_VERSION,
    progress: legacyProgress,
    reviews: synthesizeLegacyReviews(legacyProgress, now),
    migratedFrom: STORAGE_KEY,
    migratedAt: now,
  };
}

export function readCachedProgress(): ProgressSnapshot {
  const cached = normalizeSnapshot(parseJson<unknown>(localStorage.getItem(PROGRESS_CACHE_KEY)));
  if (cached) return cached;

  const migrated = migrateLegacyProgress();
  if (migrated) {
    localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  return { ...EMPTY_SNAPSHOT };
}

export function writeCachedProgress(snapshot: ProgressSnapshot) {
  localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify({ ...snapshot, version: SNAPSHOT_VERSION }));
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) throw new Error(`Progress API request failed: ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function createProgressApi(): ProgressApi {
  const authenticated = Boolean(getAuthToken());

  if (!authenticated) {
    return {
      async getProgress() {
        return readCachedProgress();
      },
      async saveProgress(snapshot) {
        writeCachedProgress(snapshot);
      },
      async saveReview(review, state) {
        const snapshot = readCachedProgress();
        const next = {
          ...snapshot,
          progress: { ...snapshot.progress, [review.termId]: state },
          reviews: [...snapshot.reviews, review],
        };
        writeCachedProgress(next);
      },
      async patchProgress(termId, state) {
        const snapshot = readCachedProgress();
        writeCachedProgress({
          ...snapshot,
          progress: { ...snapshot.progress, [termId]: state },
        });
      },
    };
  }

  return {
    async getProgress() {
      const remote = normalizeSnapshot(await requestJson<unknown>('/api/progress')) ?? { ...EMPTY_SNAPSHOT };
      const migrated = migrateLegacyProgress();
      const merged = migrated
        ? {
            ...remote,
            progress: { ...migrated.progress, ...remote.progress },
            reviews: [...migrated.reviews, ...remote.reviews],
            migratedFrom: migrated.migratedFrom,
            migratedAt: migrated.migratedAt,
          }
        : remote;
      writeCachedProgress(merged);
      return merged;
    },
    async saveProgress(snapshot) {
      writeCachedProgress(snapshot);
      await Promise.all(Object.entries(snapshot.progress).map(([termId, state]) => (
        requestJson<void>(`/api/progress/${encodeURIComponent(termId)}`, {
          method: 'PATCH',
          body: JSON.stringify(state),
        })
      )));
    },
    async saveReview(review, state) {
      const snapshot = readCachedProgress();
      writeCachedProgress({
        ...snapshot,
        progress: { ...snapshot.progress, [review.termId]: state },
        reviews: [...snapshot.reviews, review],
      });
      await requestJson<void>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(review),
      });
      await requestJson<void>(`/api/progress/${encodeURIComponent(review.termId)}`, {
        method: 'PATCH',
        body: JSON.stringify(state),
      });
    },
    async patchProgress(termId, state) {
      const snapshot = readCachedProgress();
      writeCachedProgress({ ...snapshot, progress: { ...snapshot.progress, [termId]: state } });
      await requestJson<void>(`/api/progress/${encodeURIComponent(termId)}`, {
        method: 'PATCH',
        body: JSON.stringify(state),
      });
    },
  };
}

export function exportProgressJson(snapshot: ProgressSnapshot) {
  return JSON.stringify(snapshot, null, 2);
}

function csvValue(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function exportProgressCsv(snapshot: ProgressSnapshot) {
  const header = ['termId', 'kind', 'attempt', 'validationResult', 'selfRating', 'pronunciationResult', 'feedback', 'reviewedAt', 'nextDueAt'];
  const rows = snapshot.reviews.map((review) => [
    review.termId,
    review.kind ?? 'vocabulary',
    review.attempt,
    review.validationResult,
    review.selfRating,
    review.pronunciationResult ?? '',
    review.feedback ?? '',
    new Date(review.reviewedAt).toISOString(),
    new Date(review.nextDueAt).toISOString(),
  ]);

  return [header, ...rows].map((row) => row.map(csvValue).join(',')).join('\n');
}

export function importProgress(payload: string): ProgressSnapshot {
  const snapshot = normalizeSnapshot(parseJson<unknown>(payload));
  if (!snapshot) throw new Error('Imported progress must be a JSON export from this app.');
  writeCachedProgress(snapshot);
  return snapshot;
}

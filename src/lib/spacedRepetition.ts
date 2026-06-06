import type { ReviewEvent } from './persistence';
import type { ProgressMap, ProgressRecord, Term } from './studySession';
import { getProgress, termId } from './studySession';

export interface ScheduleResult {
  ease: number;
  streak: number;
  intervalHours: number;
  dueAt: number;
}

export interface RateCardResult {
  progress: ProgressMap;
  review: ReviewEvent;
}

export function scheduleFromResult(prev: ProgressRecord, gotIt: boolean, now = Date.now()): ScheduleResult {
  const ease = Math.max(1.3, Math.min(3.2, (prev.ease || 2.5) + (gotIt ? 0.12 : -0.2)));
  const streak = gotIt ? (prev.streak || 0) + 1 : 0;
  let intervalHours: number;

  if (!gotIt) {
    intervalHours = 0.25;
  } else if ((prev.correct || 0) === 0) {
    intervalHours = 4;
  } else if ((prev.streak || 0) <= 1) {
    intervalHours = 24;
  } else {
    intervalHours = Math.max(24, Math.round((prev.intervalHours || 24) * ease));
  }

  return { ease, streak, intervalHours, dueAt: now + intervalHours * 3600 * 1000 };
}

export function rateCard(
  term: Term,
  gotIt: boolean,
  progress: ProgressMap,
  attempt = '',
  now = Date.now(),
): RateCardResult {
  const id = termId(term);
  const prev = getProgress(term, progress);
  const next = scheduleFromResult(prev, gotIt, now);
  const state: ProgressRecord = {
    termId: id,
    attempts: (prev.attempts || 0) + 1,
    correct: (prev.correct || 0) + (gotIt ? 1 : 0),
    incorrect: (prev.incorrect || 0) + (gotIt ? 0 : 1),
    streak: next.streak,
    ease: next.ease,
    intervalHours: next.intervalHours,
    dueAt: next.dueAt,
    lastResult: gotIt ? 'right' : 'left',
    lastReviewedAt: now,
  };

  return {
    progress: {
      ...progress,
      [id]: state,
    },
    review: {
      termId: id,
      attempt,
      validationResult: gotIt ? 'correct' : 'incorrect',
      selfRating: gotIt ? 'got-it' : 'needs-review',
      reviewedAt: now,
      nextDueAt: next.dueAt,
    },
  };
}

export type Category = 'all' | 'pm' | 'ai' | 'rc';
export type TermCategory = Exclude<Category, 'all'>;
export type ExampleType = 'short_sentence' | 'meeting_sentence' | 'slack_email' | 'negotiation_escalation';
export type Scenario = 'roadmap_review' | 'sprint_planning' | 'compliance_escalation' | 'AI_feature_review' | 'risk_committee';

export interface ExampleSentence {
  type: ExampleType;
  scenario: Scenario;
  zh: string;
  pinyin: string;
  en: string;
  literalBreakdown: string;
}

export type Term = readonly [
  english: string,
  mandarin: string,
  pinyin: string,
  category: TermCategory,
  exampleSentences: readonly ExampleSentence[],
];

export interface ProgressRecord {
  attempts: number;
  correct: number;
  incorrect: number;
  streak: number;
  ease: number;
  intervalHours: number;
  dueAt: number;
  lastResult: 'new' | 'right' | 'left';
  lastReviewedAt?: number;
}

export type ProgressMap = Record<string, ProgressRecord>;

export const STORAGE_KEY = 'pm_mandarin_flashcard_progress_v3';

export function termId(term: Term) {
  return `${term[3]}::${term[0]}`;
}

export function getCategoryName(category: Category | TermCategory) {
  if (category === 'pm') return 'Product Management';
  if (category === 'ai') return 'Generative AI';
  if (category === 'rc') return 'Risk & Compliance';
  return 'Main';
}

export function getProgress(term: Term, progress: ProgressMap): ProgressRecord {
  return progress[termId(term)] || {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    streak: 0,
    ease: 2.5,
    intervalHours: 0,
    dueAt: 0,
    lastResult: 'new',
  };
}

export function filterTerms(terms: readonly Term[], category: Category, query: string) {
  const q = query.trim().toLowerCase();
  return terms.filter((term) => {
    const [english, mandarin, pinyin, termCategory] = term;
    if (category !== 'all' && termCategory !== category) return false;
    if (!q) return true;
    return `${english} ${mandarin} ${pinyin}`.toLowerCase().includes(q);
  });
}

export function buildDeck(terms: readonly Term[], progress: ProgressMap, now = Date.now()) {
  const due: Term[] = [];
  const upcoming: Term[] = [];

  terms.forEach((term) => {
    const termProgress = getProgress(term, progress);
    if (!termProgress.dueAt || termProgress.dueAt <= now) due.push(term);
    else upcoming.push(term);
  });

  due.sort((a, b) => {
    const pa = getProgress(a, progress);
    const pb = getProgress(b, progress);
    return pa.streak - pb.streak || pa.attempts - pb.attempts;
  });

  upcoming.sort((a, b) => getProgress(a, progress).dueAt - getProgress(b, progress).dueAt);
  return due.length ? due : upcoming.slice(0, Math.min(20, upcoming.length));
}

export function getDueCount(terms: readonly Term[], progress: ProgressMap, now = Date.now()) {
  return terms.filter((term) => {
    const termProgress = getProgress(term, progress);
    return !termProgress.dueAt || termProgress.dueAt <= now;
  }).length;
}

export function getMasteredCount(terms: readonly Term[], progress: ProgressMap) {
  return terms.filter((term) => {
    const termProgress = getProgress(term, progress);
    return termProgress.streak >= 3 && termProgress.intervalHours >= 24;
  }).length;
}

export function getNextReviewLabel(terms: readonly Term[], progress: ProgressMap, now = Date.now()) {
  const dueCandidates = terms
    .map((term) => getProgress(term, progress).dueAt)
    .filter((value) => value && value > now)
    .sort((a, b) => a - b);

  if (!dueCandidates.length) return 'Now';
  const diffMs = dueCandidates[0] - now;
  const diffHours = Math.round(diffMs / 36e5);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.round(diffHours / 24)}d`;
}

export function generateExample(term: Term) {
  return term[4][0];
}

export function getExampleSentences(term: Term) {
  return term[4];
}

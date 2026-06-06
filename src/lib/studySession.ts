export type Category = 'all' | 'pm' | 'ai' | 'rc';
export type TermCategory = Exclude<Category, 'all'>;
export type TermLevel = 'beginner' | 'working' | 'advanced';
export type TermDomain = 'product' | 'AI' | 'risk' | 'compliance' | 'meetings' | 'metrics';
export type FormalRegister = 'casual' | 'business' | 'regulatory' | 'technical';
export type MasteryFilter = 'all' | 'mastered' | 'unmastered';
export type PronunciationDifficulty = 'easy' | 'medium' | 'hard';
export type WorkplaceScenario = 'product-planning' | 'stakeholder-meetings' | 'metrics-review' | 'ai-product-conversations' | 'risk-escalation' | 'compliance-review';
export type SortOption = 'alphabetical' | 'due-date' | 'weakest' | 'most-reviewed' | 'newest';

export interface GlossaryFilters {
  category: Category;
  domain: 'all' | TermDomain;
  level: 'all' | TermLevel;
  mastery: MasteryFilter;
  dueNow: boolean;
  pronunciation: 'all' | PronunciationDifficulty;
  scenario: 'all' | WorkplaceScenario;
  sortBy: SortOption;
}

export const DEFAULT_GLOSSARY_FILTERS: GlossaryFilters = {
  category: 'all',
  domain: 'all',
  level: 'all',
  mastery: 'all',
  dueNow: false,
  pronunciation: 'all',
  scenario: 'all',
  sortBy: 'alphabetical',
};

export interface ExampleSentence {
  english: string;
  chinese: string;
  pinyin: string;
  literalGloss?: string;
  audioUrl: string;
}

export interface Term {
  id: string;
  english: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  category: TermCategory;
  level: TermLevel;
  domain: TermDomain;
  partOfSpeech: string;
  usageNote: string;
  formalRegister: FormalRegister;
  collocations: readonly string[];
  exampleSentences: readonly ExampleSentence[];
  commonMistakes: readonly string[];
  relatedTerms: readonly string[];
  acceptedAliases?: readonly string[];
  audioUrl: string;
}

export interface ProgressHistoryEntry {
  reviewedAt: number;
  rating: 'right' | 'left';
  validationState?: 'exact' | 'close-pinyin' | 'character-mismatch' | 'empty-or-unrelated';
  feedback?: string;
  normalizedAttempt?: string;
  matchedAgainst?: string;
}

export interface PronunciationHistoryEntry {
  attemptedAt: number;
  result: 'good' | 'needs-practice';
  feedback?: string;
  mode: 'recording' | 'tone-drill' | 'listening';
}


export interface ProgressRecord {
  termId?: string;
  attempts: number;
  correct: number;
  incorrect: number;
  streak: number;
  ease: number;
  intervalHours: number;
  dueAt: number;
  lastResult: 'new' | 'right' | 'left';
  lastReviewedAt?: number;
  history?: ProgressHistoryEntry[];
  pronunciationAttempts: number;
  pronunciationGood: number;
  pronunciationNeedsPractice: number;
  pronunciationHistory?: PronunciationHistoryEntry[];
}

export type ProgressMap = Record<string, ProgressRecord>;

export const STORAGE_KEY = 'pm_mandarin_flashcard_progress_v3';

export function termId(term: Term) {
  return term.id;
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
    pronunciationAttempts: 0,
    pronunciationGood: 0,
    pronunciationNeedsPractice: 0,
  };
}

export function isMastered(record: ProgressRecord) {
  return record.streak >= 3 && record.intervalHours >= 24;
}

export function isDue(record: ProgressRecord, now = Date.now()) {
  return !record.dueAt || record.dueAt <= now;
}

export function getPronunciationDifficulty(term: Term): PronunciationDifficulty {
  const syllables = term.pinyin.split(/\s+|-+/).filter(Boolean).length;
  const hasZhChShR = /zh|ch|sh|r/i.test(term.pinyin);
  const hasDifficultVowel = /ü|ǖ|ǘ|ǚ|ǜ|x|q/i.test(term.pinyin);

  if (syllables >= 5 || (syllables >= 4 && (hasZhChShR || hasDifficultVowel))) return 'hard';
  if (syllables >= 3 || hasZhChShR || hasDifficultVowel) return 'medium';
  return 'easy';
}

export function getWorkplaceScenario(term: Term): WorkplaceScenario {
  if (term.domain === 'AI') return 'ai-product-conversations';
  if (term.domain === 'compliance') return 'compliance-review';
  if (term.domain === 'risk') return 'risk-escalation';
  if (term.domain === 'metrics') return 'metrics-review';
  if (term.domain === 'meetings') return 'stakeholder-meetings';
  return 'product-planning';
}

export function getScenarioName(scenario: 'all' | WorkplaceScenario) {
  if (scenario === 'product-planning') return 'Product planning';
  if (scenario === 'stakeholder-meetings') return 'Stakeholder meetings';
  if (scenario === 'metrics-review') return 'Metrics review';
  if (scenario === 'ai-product-conversations') return 'AI product conversations';
  if (scenario === 'risk-escalation') return 'Risk escalation';
  if (scenario === 'compliance-review') return 'Compliance review';
  return 'All scenarios';
}

function getSearchableText(term: Term) {
  return [
    term.id,
    term.english,
    term.simplified,
    term.traditional,
    term.pinyin,
    ...(term.acceptedAliases ?? []),
    term.category,
    term.level,
    term.domain,
    term.partOfSpeech,
    term.usageNote,
    term.formalRegister,
    ...term.collocations,
    ...term.commonMistakes,
    ...term.relatedTerms,
    ...term.exampleSentences.flatMap((example) => [
      example.english,
      example.chinese,
      example.pinyin,
      example.literalGloss,
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getFilteredTerms(
  terms: readonly Term[],
  filters: GlossaryFilters,
  query: string,
  progress: ProgressMap = {},
  now = Date.now(),
) {
  const q = query.trim().toLowerCase();
  const originalOrder = new Map(terms.map((term, index) => [term.id, index]));

  return terms
    .filter((term) => {
      const record = getProgress(term, progress);
      if (filters.category !== 'all' && term.category !== filters.category) return false;
      if (filters.domain !== 'all' && term.domain !== filters.domain) return false;
      if (filters.level !== 'all' && term.level !== filters.level) return false;
      if (filters.mastery === 'mastered' && !isMastered(record)) return false;
      if (filters.mastery === 'unmastered' && isMastered(record)) return false;
      if (filters.dueNow && !isDue(record, now)) return false;
      if (filters.pronunciation !== 'all' && getPronunciationDifficulty(term) !== filters.pronunciation) return false;
      if (filters.scenario !== 'all' && getWorkplaceScenario(term) !== filters.scenario) return false;
      return !q || getSearchableText(term).includes(q);
    })
    .sort((a, b) => {
      const pa = getProgress(a, progress);
      const pb = getProgress(b, progress);
      if (filters.sortBy === 'due-date') return (pa.dueAt || 0) - (pb.dueAt || 0) || a.english.localeCompare(b.english);
      if (filters.sortBy === 'weakest') {
        const accuracyA = pa.attempts ? pa.correct / pa.attempts : 0;
        const accuracyB = pb.attempts ? pb.correct / pb.attempts : 0;
        return pa.streak - pb.streak || accuracyA - accuracyB || pb.incorrect - pa.incorrect || a.english.localeCompare(b.english);
      }
      if (filters.sortBy === 'most-reviewed') return pb.attempts - pa.attempts || a.english.localeCompare(b.english);
      if (filters.sortBy === 'newest') return (originalOrder.get(b.id) ?? 0) - (originalOrder.get(a.id) ?? 0);
      return a.english.localeCompare(b.english);
    });
}

export function filterTerms(terms: readonly Term[], category: Category, query: string) {
  return getFilteredTerms(terms, { ...DEFAULT_GLOSSARY_FILTERS, category }, query);
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

export function getExampleSentences(term: Term) {
  return term.exampleSentences.length ? term.exampleSentences : [generateExample(term)];
}

export function generateExample(term: Term) {
  const example = term.exampleSentences[0];
  if (example) return example;

  return {
    english: `In a work context, the team discussed "${term.english}".`,
    chinese: `在工作场景中，团队讨论了“${term.simplified}”。`,
    pinyin: `Zài gōngzuò chǎngjǐng zhōng, tuánduì tǎolùn le ${term.pinyin}.`,
    audioUrl: '',
  };
}

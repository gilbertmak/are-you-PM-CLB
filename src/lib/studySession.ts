export type Category = 'all' | 'pm' | 'ai' | 'rc';
export type TermCategory = Exclude<Category, 'all'>;
export type TermLevel = 'beginner' | 'working' | 'advanced';
export type TermDomain = 'product' | 'AI' | 'risk' | 'compliance' | 'meetings' | 'metrics';
export type FormalRegister = 'casual' | 'business' | 'regulatory' | 'technical';

export interface ExampleSentence {
  english: string;
  chinese: string;
  pinyin: string;
  literalGloss?: string;
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
  audioUrl: string;
}

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
  };
}

export function filterTerms(terms: readonly Term[], category: Category, query: string) {
  const q = query.trim().toLowerCase();
  return terms.filter((term) => {
    if (category !== 'all' && term.category !== category) return false;
    if (!q) return true;
    const searchableText = [
      term.id,
      term.english,
      term.simplified,
      term.traditional,
      term.pinyin,
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

    return searchableText.includes(q);
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
  const example = term.exampleSentences[0];
  if (example) return example;

  return {
    english: `In a work context, the team discussed "${term.english}".`,
    chinese: `在工作场景中，团队讨论了“${term.simplified}”。`,
    pinyin: `Zài gōngzuò chǎngjǐng zhōng, tuánduì tǎolùn le ${term.pinyin}.`,
  };
}

export function getExampleSentences(term: Term) {
  return term.exampleSentences.length ? term.exampleSentences : [generateExample(term)];
}

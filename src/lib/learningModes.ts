import type { Term } from './studySession';

export type StudyRoute = '/' | '/study' | '/study/flashcards' | '/study/listening' | '/study/scenarios' | '/glossary' | '/progress' | `/terms/${string}`;

export type LearningModeId =
  | 'recognition'
  | 'production'
  | 'pinyin'
  | 'tone-drill'
  | 'listening'
  | 'sentence'
  | 'scenario'
  | 'meeting'
  | 'role-play';

export interface LearningModeConfig {
  id: LearningModeId;
  label: string;
  route: StudyRoute;
  shortLabel: string;
  description: string;
}

export const STUDY_ROUTES: Array<{ path: StudyRoute; label: string; description: string }> = [
  { path: '/', label: 'Home', description: 'Production-ready Mandarin PM study dashboard.' },
  { path: '/study', label: 'Study', description: 'Start with due flashcards and focused study modes.' },
  { path: '/study/flashcards', label: 'Flashcards', description: 'Recognition, production, pinyin, and sentence drills.' },
  { path: '/study/listening', label: 'Listening', description: 'Hear workplace Mandarin, drill tone patterns, and record pronunciation.' },
  { path: '/study/scenarios', label: 'Scenarios', description: 'Practice meetings, stakeholder responses, and role-play.' },
  { path: '/glossary', label: 'Glossary', description: 'Search the full Mandarin PM vocabulary table.' },
  { path: '/progress', label: 'Progress', description: 'Import, export, and sync study progress.' },
];

export const LEARNING_MODES: LearningModeConfig[] = [
  {
    id: 'recognition',
    label: 'Recognition mode',
    route: '/study/flashcards',
    shortLabel: 'Recognition',
    description: 'Show Chinese and ask for the English workplace meaning.',
  },
  {
    id: 'production',
    label: 'Production mode',
    route: '/study/flashcards',
    shortLabel: 'Production',
    description: 'Show an English PM prompt and ask for Mandarin characters.',
  },
  {
    id: 'pinyin',
    label: 'Pinyin mode',
    route: '/study/flashcards',
    shortLabel: 'Pinyin',
    description: 'Show characters and ask for tone-marked Hanyu Pinyin.',
  },
  {
    id: 'listening',
    label: 'Listening mode',
    route: '/study/listening',
    shortLabel: 'Listening',
    description: 'Play audio or browser speech and ask learners to identify or type the term.',
  },
  {
    id: 'tone-drill',
    label: 'Tone-drill mode',
    route: '/study/listening',
    shortLabel: 'Tone drill',
    description: 'Practice confusing tone-number patterns across similar workplace terms.',
  },
  {
    id: 'sentence',
    label: 'Sentence mode',
    route: '/study/flashcards',
    shortLabel: 'Sentence',
    description: 'Fill missing vocabulary inside a realistic workplace sentence.',
  },
  {
    id: 'scenario',
    label: 'Scenario mode',
    route: '/study/scenarios',
    shortLabel: 'Scenario',
    description: 'Choose or compose an appropriate Mandarin response to a workplace situation.',
  },
  {
    id: 'meeting',
    label: 'Meeting mode',
    route: '/study/scenarios',
    shortLabel: 'Meeting',
    description: 'Group vocabulary into product review, sprint planning, compliance review, and AI launch sequences.',
  },
  {
    id: 'role-play',
    label: 'Role-play mode',
    route: '/study/scenarios',
    shortLabel: 'Role-play',
    description: 'Simulate PM conversations with engineering, design, legal, risk, and leadership stakeholders.',
  },
];

export const DEFAULT_ROUTE: StudyRoute = '/';

export function normalizeRoute(pathname: string): StudyRoute {
  if (pathname === '/' || pathname === '/study' || pathname === '/study/flashcards') return pathname;
  if (pathname === '/study/listening') return '/study/listening';
  if (pathname === '/study/scenarios') return '/study/scenarios';
  if (pathname === '/glossary') return '/glossary';
  if (pathname === '/progress') return '/progress';
  if (/^\/terms\/[^/]+$/.test(pathname)) return pathname as `/terms/${string}`;
  return DEFAULT_ROUTE;
}

export function getDefaultModeForRoute(route: StudyRoute): LearningModeId {
  if (route === '/study/listening') return 'listening';
  if (route === '/study/scenarios') return 'scenario';
  return 'recognition';
}

export function getCanonicalStudyRoute(route: StudyRoute): StudyRoute {
  if (route === '/' || route === '/study') return '/study/flashcards';
  return route;
}

export function getModesForRoute(route: StudyRoute) {
  const canonicalRoute = getCanonicalStudyRoute(route);
  if (canonicalRoute === '/glossary' || canonicalRoute === '/progress' || canonicalRoute.startsWith('/terms/')) return [];
  return LEARNING_MODES.filter((mode) => mode.route === canonicalRoute);
}

export function getTermAt(terms: readonly Term[], index: number) {
  if (!terms.length) return null;
  return terms[index % terms.length] ?? terms[0];
}

export function getDistractors(currentTerm: Term, terms: readonly Term[], field: 'english' | 'simplified') {
  const distractors = terms
    .filter((term) => term.id !== currentTerm.id)
    .slice(0, 20)
    .sort((a, b) => a.english.localeCompare(b.english))
    .slice(0, 3)
    .map((term) => term[field]);

  return [...distractors, currentTerm[field]].sort((a, b) => a.localeCompare(b));
}

export function blankTermInSentence(sentence: string, termText: string) {
  if (!sentence || !termText) return sentence || 'The team discussed ______ before launch.';
  return sentence.replace(termText, '______');
}

export function getMeetingSequenceLabel(term: Term) {
  if (term.domain === 'AI') return 'AI launch readiness';
  if (term.domain === 'risk' || term.domain === 'compliance') return 'Compliance review';
  if (term.domain === 'meetings') return 'Sprint planning';
  return 'Product review';
}

export function getStakeholderForTerm(term: Term) {
  if (term.category === 'ai') return 'engineering and leadership';
  if (term.category === 'rc') return 'legal, risk, and compliance';
  if (term.domain === 'metrics') return 'leadership';
  return 'engineering and design';
}

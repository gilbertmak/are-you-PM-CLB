import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from './components/Banner';
import { CategoryTabs } from './components/CategoryTabs';
import { FlashcardStudy } from './components/FlashcardStudy';
import { GlossaryTable } from './components/GlossaryTable';
import { LearningModeStudy } from './components/LearningModeStudy';
import { SearchControls } from './components/SearchControls';
import { StudyNav } from './components/StudyNav';
import { terms } from './data/terms';
import type { AttemptValidationResult } from './lib/answerValidation';
import { rateCard } from './lib/spacedRepetition';
import {
  createProgressApi,
  exportProgressCsv,
  exportProgressJson,
  importProgress,
  readCachedProgress,
} from './lib/persistence';
import type { ProgressSnapshot, ReviewEvent } from './lib/persistence';
import type { Category, GlossaryFilters, ProgressMap, Term } from './lib/studySession';
import {
  DEFAULT_GLOSSARY_FILTERS,
  buildDeck,
  getCategoryName,
  getDueCount,
  getFilteredTerms,
  getMasteredCount,
  getNextReviewLabel,
  termId,
} from './lib/studySession';
import './styles.css';

function createSnapshot(progress: ProgressMap, reviews: ReviewEvent[] = []): ProgressSnapshot {
  return {
    version: 4,
    progress,
    reviews,
  };
}

function download(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getInitialRoute() {
  return normalizeRoute(window.location.pathname);
}

export default function App() {
  const progressApi = useMemo(() => createProgressApi(), []);
  const cachedSnapshot = useMemo(() => readCachedProgress(), []);
  const [filters, setFilters] = useState<GlossaryFilters>(DEFAULT_GLOSSARY_FILTERS);
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<ProgressMap>(cachedSnapshot.progress);
  const [reviews, setReviews] = useState<ReviewEvent[]>(cachedSnapshot.reviews);
  const [deck, setDeck] = useState<Term[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [syncStatus, setSyncStatus] = useState('Progress cache ready.');

  const filteredTerms = useMemo(() => getFilteredTerms(terms, filters, query, progress), [filters, progress, query]);

  const navigateTo = useCallback((route: StudyRoute) => {
    window.history.pushState({}, '', route);
    setActiveRoute(route);
  }, []);

  useEffect(() => {
    const handlePopState = () => setActiveRoute(normalizeRoute(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const refreshDeck = useCallback((sourceTerms: readonly Term[] = filteredTerms, sourceProgress: ProgressMap = progress) => {
    setDeck(buildDeck(sourceTerms, sourceProgress));
    setCurrentIndex(0);
    setSessionReviewed(0);
    setSessionCorrect(0);
  }, [filteredTerms, progress]);

  useEffect(() => {
    let active = true;

    progressApi.getProgress()
      .then((snapshot) => {
        if (!active) return;
        setProgress(snapshot.progress);
        setReviews(snapshot.reviews);
        setDeck(buildDeck(getFilteredTerms(terms, filters, query, snapshot.progress), snapshot.progress));
        setSyncStatus(snapshot.migratedFrom ? 'Migrated legacy progress and cached it for sync.' : 'Progress loaded.');
      })
      .catch(() => {
        if (!active) return;
        setSyncStatus('Offline cache loaded; backend progress API is unavailable.');
      });

    return () => {
      active = false;
    };
  }, [progressApi]);

  useEffect(() => {
    refreshDeck(filteredTerms, progress);
  }, [filters, query]);

  const handleRate = useCallback((gotIt: boolean, validation?: AttemptValidationResult) => {
    const term = deck[currentIndex];
    if (!term) return;

    const nextProgress = rateCard(term, gotIt, progress, validation);
    const nextState = nextProgress[termId(term)];
    const review: ReviewEvent = {
      termId: termId(term),
      attempt: validation?.normalizedAttempt || validation?.matchedAgainst || '',
      validationResult: gotIt ? 'correct' : 'incorrect',
      selfRating: gotIt ? 'got-it' : 'needs-review',
      reviewedAt: nextState.lastReviewedAt || Date.now(),
      nextDueAt: nextState.dueAt,
    };

    setProgress(nextProgress);
    setReviews((currentReviews) => [...currentReviews, review]);
    setSessionReviewed((count) => count + 1);
    if (gotIt) setSessionCorrect((count) => count + 1);
    setCurrentIndex((index) => index + 1);
    setSyncStatus('Saving review history…');

    progressApi.saveReview(review, nextState)
      .then(() => setSyncStatus('Review saved.'))
      .catch(() => {
        progressApi.saveProgress(createSnapshot(nextProgress, [...reviews, review])).catch(() => undefined);
        setSyncStatus('Review cached offline; it will sync when the API is available.');
      });
  }, [currentIndex, deck, progress, progressApi, reviews]);

  const dueCount = getDueCount(filteredTerms, progress);
  const masteredCount = getMasteredCount(filteredTerms, progress);
  const nextReviewLabel = getNextReviewLabel(filteredTerms, progress);
  const snapshot = createSnapshot(progress, reviews);

  const handleExportJson = () => download('pm-mandarin-progress.json', exportProgressJson(snapshot), 'application/json');
  const handleExportCsv = () => download('pm-mandarin-reviews.csv', exportProgressCsv(snapshot), 'text/csv');
  const handleImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = importProgress(await file.text());
      setProgress(imported.progress);
      setReviews(imported.reviews);
      setDeck(buildDeck(filteredTerms, imported.progress));
      await progressApi.saveProgress(imported);
      setSyncStatus('Imported progress saved.');
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Unable to import progress.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <>
      <Banner />
      <main>
        <StudyNav activeRoute={activeRoute} onNavigate={navigateTo} />
        <CategoryTabs activeCategory={activeCategory} onChange={setActiveCategory} />
        <SearchControls
          count={filteredTerms.length}
          dueCount={dueCount}
          filters={filters}
          onFiltersChange={setFilters}
          onQueryChange={setQuery}
          onSavedListSelect={(listId) => {
            if (listId === 'weekly-product-review') {
              setQuery('');
              setFilters({ ...DEFAULT_GLOSSARY_FILTERS, domain: 'product', level: 'working', sortBy: 'weakest' });
            } else {
              setQuery('');
              setFilters({ ...DEFAULT_GLOSSARY_FILTERS, category: 'ai', scenario: 'ai-product-conversations', sortBy: 'newest' });
            }
          }}
          query={query}
          scopeLabel={getCategoryName(filters.category)}
        />
        <FlashcardStudy
          category={filters.category}
          currentIndex={currentIndex}
          deck={deck}
          masteredCount={masteredCount}
          nextReviewLabel={nextReviewLabel}
          onRate={handleRate}
          onRefreshDeck={() => refreshDeck()}
          reviewedCount={sessionReviewed}
          sessionCorrect={sessionCorrect}
        />
        <section className="panel progress-tools" aria-label="Progress import and export tools">
          <div>
            <h2>Progress portability</h2>
            <p>{syncStatus} Export your review history as JSON for backup or CSV for analysis.</p>
          </div>
          <div className="action-row">
            <button className="btn btn-neutral" onClick={handleExportJson} type="button">Download JSON</button>
            <button className="btn btn-refresh" onClick={handleExportCsv} type="button">Download CSV</button>
            <label className="btn btn-import">
              Import JSON
              <input accept="application/json" onChange={handleImportJson} type="file" />
            </label>
          </div>
        </section>
        <GlossaryTable
          terms={filteredTerms}
          allTerms={terms}
          progress={progress}
          onCurriculumSelect={(level) => {
            setQuery('');
            if (level === 1) setFilters({ ...DEFAULT_GLOSSARY_FILTERS, category: 'pm', domain: 'product', level: 'beginner' });
            if (level === 2) setFilters({ ...DEFAULT_GLOSSARY_FILTERS, domain: 'meetings', sortBy: 'alphabetical' });
            if (level === 3) setFilters({ ...DEFAULT_GLOSSARY_FILTERS, category: 'ai', scenario: 'ai-product-conversations' });
            if (level === 4) setFilters({ ...DEFAULT_GLOSSARY_FILTERS, category: 'rc', scenario: 'risk-escalation' });
          }}
        />
      </main>
      <footer className="footer">Anonymous progress is cached locally; signed-in learners sync through /api/progress, /api/reviews, and /api/progress/:termId.</footer>
    </>
  );
}

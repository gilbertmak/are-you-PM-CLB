import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from './components/Banner';
import { CategoryTabs } from './components/CategoryTabs';
import { FlashcardStudy } from './components/FlashcardStudy';
import { GlossaryTable } from './components/GlossaryTable';
import { SearchControls } from './components/SearchControls';
import { terms } from './data/terms';
import {
  createProgressApi,
  exportProgressCsv,
  exportProgressJson,
  importProgress,
  readCachedProgress,
  type ProgressSnapshot,
  type ReviewEvent,
} from './lib/persistence';
import { rateCard } from './lib/spacedRepetition';
import type { Category, ProgressMap, Term } from './lib/studySession';
import {
  buildDeck,
  filterTerms,
  getCategoryName,
  getDueCount,
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

export default function App() {
  const progressApi = useMemo(() => createProgressApi(), []);
  const cachedSnapshot = useMemo(() => readCachedProgress(), []);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<ProgressMap>(cachedSnapshot.progress);
  const [reviews, setReviews] = useState<ReviewEvent[]>(cachedSnapshot.reviews);
  const [deck, setDeck] = useState<Term[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [syncStatus, setSyncStatus] = useState('Progress cache ready.');

  const filteredTerms = useMemo(() => filterTerms(terms, activeCategory, query), [activeCategory, query]);

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
        setDeck(buildDeck(filteredTerms, snapshot.progress));
        setSyncStatus(snapshot.migratedFrom ? 'Migrated legacy progress and cached it for sync.' : 'Progress loaded.');
      })
      .catch(() => {
        if (!active) return;
        setSyncStatus('Offline cache loaded; backend progress API is unavailable.');
      });

    return () => {
      active = false;
    };
  }, [filteredTerms, progressApi]);

  useEffect(() => {
    refreshDeck(filteredTerms, progress);
  }, [activeCategory, query]);

  const handleRate = useCallback((gotIt: boolean, attempt: string) => {
    const term = deck[currentIndex];
    if (!term) return;

    const { progress: nextProgress, review } = rateCard(term, gotIt, progress, attempt);
    const nextState = nextProgress[termId(term)];
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
        <CategoryTabs activeCategory={activeCategory} onChange={setActiveCategory} />
        <SearchControls
          count={filteredTerms.length}
          dueCount={dueCount}
          onQueryChange={setQuery}
          query={query}
          scopeLabel={getCategoryName(activeCategory)}
        />
        <FlashcardStudy
          category={activeCategory}
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
        <GlossaryTable terms={filteredTerms} />
      </main>
      <footer className="footer">Anonymous progress is cached locally; signed-in learners sync through /api/progress, /api/reviews, and /api/progress/:termId.</footer>
    </>
  );
}

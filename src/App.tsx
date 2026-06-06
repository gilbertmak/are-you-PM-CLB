import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from './components/Banner';
import { CategoryTabs } from './components/CategoryTabs';
import { FlashcardStudy } from './components/FlashcardStudy';
import { GlossaryTable } from './components/GlossaryTable';
import { SearchControls } from './components/SearchControls';
import { terms } from './data/terms';
import type { AttemptValidationResult } from './lib/answerValidation';
import { rateCard } from './lib/spacedRepetition';
import type { Category, ProgressMap, Term } from './lib/studySession';
import {
  STORAGE_KEY,
  buildDeck,
  filterTerms,
  getCategoryName,
  getDueCount,
  getMasteredCount,
  getNextReviewLabel,
} from './lib/studySession';
import './styles.css';

function loadProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as ProgressMap;
  } catch {
    return {};
  }
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());
  const [deck, setDeck] = useState<Term[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  const filteredTerms = useMemo(() => filterTerms(terms, activeCategory, query), [activeCategory, query]);

  const refreshDeck = useCallback((sourceTerms: readonly Term[] = filteredTerms, sourceProgress: ProgressMap = progress) => {
    setDeck(buildDeck(sourceTerms, sourceProgress));
    setCurrentIndex(0);
    setSessionReviewed(0);
    setSessionCorrect(0);
  }, [filteredTerms, progress]);

  useEffect(() => {
    refreshDeck(filteredTerms, progress);
  }, [activeCategory, query]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const handleRate = useCallback((gotIt: boolean, validation?: AttemptValidationResult) => {
    const term = deck[currentIndex];
    if (!term) return;

    setProgress((currentProgress) => rateCard(term, gotIt, currentProgress, validation));
    setSessionReviewed((count) => count + 1);
    if (gotIt) setSessionCorrect((count) => count + 1);
    setCurrentIndex((index) => index + 1);
  }, [currentIndex, deck]);

  const dueCount = getDueCount(filteredTerms, progress);
  const masteredCount = getMasteredCount(filteredTerms, progress);
  const nextReviewLabel = getNextReviewLabel(filteredTerms, progress);

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
        <GlossaryTable terms={filteredTerms} />
      </main>
      <footer className="footer">Progress is saved locally in your browser for future review sessions.</footer>
    </>
  );
}

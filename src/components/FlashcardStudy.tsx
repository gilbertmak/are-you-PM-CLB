import { useEffect, useMemo, useState } from 'react';
import type { Category, Term } from '../lib/studySession';
import { getCategoryName, getExampleSentences } from '../lib/studySession';
import { StudyStats } from './StudyStats';

interface FlashcardStudyProps {
  category: Category;
  currentIndex: number;
  deck: readonly Term[];
  masteredCount: number;
  nextReviewLabel: string;
  reviewedCount: number;
  sessionCorrect: number;
  onRate: (gotIt: boolean) => void;
  onRefreshDeck: () => void;
}

export function FlashcardStudy({
  category,
  currentIndex,
  deck,
  masteredCount,
  nextReviewLabel,
  reviewedCount,
  sessionCorrect,
  onRate,
  onRefreshDeck,
}: FlashcardStudyProps) {
  const [attempt, setAttempt] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showLiteralBreakdown, setShowLiteralBreakdown] = useState(false);
  const currentTerm = deck[currentIndex] ?? null;
  const examples = useMemo(() => (currentTerm ? getExampleSentences(currentTerm) : []), [currentTerm]);
  const example = examples[exampleIndex] ?? examples[0] ?? null;

  useEffect(() => {
    setAttempt('');
    setRevealed(false);
    setExampleIndex(0);
    setShowLiteralBreakdown(false);
  }, [currentTerm]);

  useEffect(() => {
    if (exampleIndex >= examples.length) setExampleIndex(0);
  }, [exampleIndex, examples.length]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase() ?? '';
      const typing = activeTag === 'textarea' || activeTag === 'input';

      if (event.key === 'Enter' && !event.shiftKey && !revealed && attempt.trim()) {
        event.preventDefault();
        setRevealed(true);
        return;
      }

      if (!revealed) return;
      if (typing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) event.preventDefault();
      if (event.key === 'ArrowLeft') onRate(false);
      if (event.key === 'ArrowRight') onRate(true);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [attempt, onRate, revealed]);

  const sessionLabel = deck.length ? `${Math.min(currentIndex + 1, deck.length)} / ${deck.length}` : '0 / 0';
  const completionText = deck.length
    ? `You reviewed ${deck.length} cards in ${getCategoryName(category)}. Right swipes: ${sessionCorrect}. Left swipes: ${deck.length - sessionCorrect}.`
    : 'No cards match this filter. Try another tab or clear your search.';

  return (
    <section className="panel" aria-label="Flashcard study mode">
      <div className="flashcard-shell">
        <div className="flashcard-content">
          <div className="study-top">
            <div className="study-title">
              <h2>Swipe Study Mode</h2>
              <p>Type your answer attempt first, reveal the answer, then use ← if you were not confident and → if you got it right.</p>
            </div>
            <StudyStats
              masteredCount={masteredCount}
              nextReviewLabel={nextReviewLabel}
              reviewedCount={reviewedCount}
              sessionLabel={sessionLabel}
            />
          </div>

          {currentTerm ? (
            <div className="flashcard">
              <div className="deck-meta">
                <span>{deck.length ? `Due cards first · ${deck.length} in this review queue` : 'No cards in queue'}</span>
                <span>Keyboard: Enter reveal, ← review, → got it</span>
              </div>
              <span className="prompt-tag">{getCategoryName(currentTerm[3])} prompt</span>
              <div className="prompt-box">
                <div className="prompt-label">English term</div>
                <div className="prompt-term">{currentTerm[0]}</div>
              </div>
              <div className="attempt-box">
                <textarea
                  onChange={(event) => setAttempt(event.target.value)}
                  placeholder="Type your Mandarin characters, pinyin, or your best guess before revealing the answer"
                  value={attempt}
                />
                <div className="attempt-help">Answer attempt is required before reveal. Your text is not graded yet; it primes recall.</div>
              </div>
              <div className="action-row">
                <button className="btn btn-neutral" disabled={!attempt.trim() || revealed} onClick={() => setRevealed(true)} type="button">
                  Reveal answer
                </button>
                <button className="btn btn-refresh" onClick={onRefreshDeck} type="button">Refresh study deck</button>
              </div>
              <div className={`answer-panel ${revealed ? 'visible' : ''}`}>
                <div className="answer-line"><span className="label">Mandarin</span><span className="value cn">{currentTerm[1]}</span></div>
                <div className="answer-line"><span className="label">Hanyu Pinyin</span><span className="value">{currentTerm[2]}</span></div>
                <div className="example-box">
                  <div className="example-header">
                    <div>
                      <div className="example-label">Curated product-context example</div>
                      <div className="example-meta">
                        <span>{example?.type.replace(/_/g, ' ')}</span>
                        <span>{example?.scenario.replace(/_/g, ' ')}</span>
                        <span>{examples.length ? `${exampleIndex + 1} / ${examples.length}` : '0 / 0'}</span>
                      </div>
                    </div>
                    <div className="example-controls" aria-label="Example sentence controls">
                      <button
                        className="mini-btn"
                        disabled={examples.length <= 1}
                        onClick={() => setExampleIndex((index) => (index + examples.length - 1) % examples.length)}
                        type="button"
                      >
                        Previous
                      </button>
                      <button
                        className="mini-btn"
                        disabled={examples.length <= 1}
                        onClick={() => setExampleIndex((index) => (index + 1) % examples.length)}
                        type="button"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  <div className="en">{example?.en}</div>
                  <div className="zh">{example?.zh}</div>
                  <div className="pinyin">{example?.pinyin}</div>
                  <label className="literal-toggle">
                    <input
                      checked={showLiteralBreakdown}
                      onChange={(event) => setShowLiteralBreakdown(event.target.checked)}
                      type="checkbox"
                    />
                    Show literal breakdown
                  </label>
                  {showLiteralBreakdown ? <div className="literal-breakdown">{example?.literalBreakdown}</div> : null}
                </div>
              </div>
              <div className={`swipe-row ${revealed ? 'visible' : ''}`}>
                <div>
                  <button aria-label="Not confident" className="swipe-btn swipe-left" onClick={() => onRate(false)} type="button">←</button>
                  <div className="swipe-caption">Need review</div>
                </div>
                <div>
                  <button aria-label="Got it right" className="swipe-btn swipe-right" onClick={() => onRate(true)} type="button">→</button>
                  <div className="swipe-caption">Got it</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="completion visible">
              <h3>Session complete</h3>
              <p>{completionText}</p>
              <div className="action-row completion-actions">
                <button className="btn btn-neutral" onClick={onRefreshDeck} type="button">Start another review round</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

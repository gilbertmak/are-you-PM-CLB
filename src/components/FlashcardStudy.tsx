import { useEffect, useMemo, useState } from 'react';
import { validateAttempt } from '../lib/answerValidation';
import { formatPinyin, type PinyinDisplayMode } from '../lib/pronunciation';
import type { AttemptValidationResult } from '../lib/answerValidation';
import type { Category, Term } from '../lib/studySession';
import { getCategoryName, getExampleSentences } from '../lib/studySession';
import { AudioPlayButton } from './AudioPlayButton';
import { PinyinDisplayToggle } from './PinyinDisplayToggle';
import { StudyStats } from './StudyStats';

interface FlashcardStudyProps {
  category: Category;
  currentIndex: number;
  deck: readonly Term[];
  masteredCount: number;
  nextReviewLabel: string;
  reviewedCount: number;
  sessionCorrect: number;
  onRate: (gotIt: boolean, validation?: AttemptValidationResult) => void;
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
  const [pinyinMode, setPinyinMode] = useState<PinyinDisplayMode>('tone-marks');
  const currentTerm = deck[currentIndex] ?? null;
  const examples = useMemo(() => (currentTerm ? getExampleSentences(currentTerm) : []), [currentTerm]);
  const example = examples[exampleIndex] ?? examples[0] ?? null;
  const validation = useMemo(() => (currentTerm ? validateAttempt(currentTerm, attempt) : null), [attempt, currentTerm]);

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

      if (event.key === 'Enter' && !event.shiftKey && !revealed) {
        event.preventDefault();
        setRevealed(true);
        return;
      }

      if (!revealed) return;
      if (typing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) event.preventDefault();
      if (event.key === 'ArrowLeft') onRate(false, validation ?? undefined);
      if (event.key === 'ArrowRight') onRate(true, validation ?? undefined);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onRate, revealed, validation]);

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
              <span className="prompt-tag">{getCategoryName(currentTerm.category)} prompt</span>
              <div className="prompt-box">
                <div className="prompt-label">English term</div>
                <div className="prompt-term">{currentTerm.english}</div>
              </div>
              <div className="attempt-box">
                <textarea
                  onChange={(event) => setAttempt(event.target.value)}
                  placeholder="Type your Mandarin characters, pinyin, or your best guess before revealing the answer"
                  value={attempt}
                />
                <div className="attempt-help">Reveal checks characters, tone-mark pinyin, numbered pinyin, and accepted aliases. Self-rating remains your override.</div>
              </div>
              <div className="action-row">
                <button className="btn btn-neutral" disabled={revealed} onClick={() => setRevealed(true)} type="button">
                  Reveal answer
                </button>
                <button className="btn btn-refresh" onClick={onRefreshDeck} type="button">Refresh study deck</button>
              </div>
              {revealed && validation ? (
                <div className={`attempt-feedback ${validation.state}`}>
                  <div className="attempt-feedback-label">Attempt check · {validation.state.replace(/-/g, ' ')}</div>
                  <div>{validation.feedback}</div>
                </div>
              ) : null}
              <div className={`answer-panel ${revealed ? 'visible' : ''}`}>
                <div className="answer-line"><span className="label">Mandarin</span><span className="value cn mandarin-with-audio">{currentTerm.simplified}<AudioPlayButton audioUrl={currentTerm.audioUrl} label="Play term" text={currentTerm.simplified} /></span></div>
                {currentTerm.traditional ? <div className="answer-line"><span className="label">Traditional</span><span className="value cn">{currentTerm.traditional}</span></div> : null}
                <div className="answer-line"><span className="label">Hanyu Pinyin</span><span className="value"><PinyinDisplayToggle mode={pinyinMode} onChange={setPinyinMode} />{formatPinyin(currentTerm.pinyin, pinyinMode)}</span></div>
                <div className="answer-line"><span className="label">Domain</span><span className="value">{currentTerm.domain} · {currentTerm.level}</span></div>
                <div className="answer-line"><span className="label">Usage</span><span className="value">{currentTerm.usageNote}</span></div>
                <div className="example-box">
                  <div className="example-label">Work-context example</div>
                  <div className="en">{example?.english}</div>
                  <div className="zh mandarin-with-audio">{example?.chinese}{example ? <AudioPlayButton audioUrl={example.audioUrl} label="Play example" text={example.chinese} /> : null}</div>
                  <div className="pinyin">{example ? formatPinyin(example.pinyin, pinyinMode) : ''}</div>
                  {example?.literalGloss ? <div className="literal">Literal: {example.literalGloss}</div> : null}
                </div>
              </div>
              <div className={`swipe-row ${revealed ? 'visible' : ''}`}>
                <div>
                  <button aria-label="Not confident" className="swipe-btn swipe-left" onClick={() => onRate(false, validation ?? undefined)} type="button">←</button>
                  <div className="swipe-caption">Need review</div>
                </div>
                <div>
                  <button aria-label="Got it right" className="swipe-btn swipe-right" onClick={() => onRate(true, validation ?? undefined)} type="button">→</button>
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

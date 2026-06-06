import { useEffect, useMemo, useState } from 'react';
import {
  LEARNING_MODES,
  blankTermInSentence,
  getDistractors,
  getMeetingSequenceLabel,
  getModesForRoute,
  getStakeholderForTerm,
  getTermAt,
  type LearningModeId,
  type StudyRoute,
} from '../lib/learningModes';
import { buildToneDrills, formatPinyin, getTonePattern, type PinyinDisplayMode } from '../lib/pronunciation';
import type { Term } from '../lib/studySession';
import { getCategoryName, getExampleSentences } from '../lib/studySession';
import { AudioPlayButton } from './AudioPlayButton';
import { PinyinDisplayToggle } from './PinyinDisplayToggle';
import { PronunciationRecorder } from './PronunciationRecorder';

interface LearningModeStudyProps {
  route: StudyRoute;
  terms: readonly Term[];
  onPronunciationAttempt: (term: Term, result: 'good' | 'needs-practice', mode: 'recording' | 'tone-drill' | 'listening', feedback?: string) => void;
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`mode-chip ${active ? 'active' : ''}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export function LearningModeStudy({ onPronunciationAttempt, route, terms }: LearningModeStudyProps) {
  const routeModes = useMemo(() => getModesForRoute(route), [route]);
  const [activeMode, setActiveMode] = useState<LearningModeId>(routeModes[0]?.id ?? 'recognition');
  const [termIndex, setTermIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [pinyinMode, setPinyinMode] = useState<PinyinDisplayMode>('tone-marks');
  const currentTerm = getTermAt(terms, termIndex);
  const example = currentTerm ? getExampleSentences(currentTerm)[0] : null;
  const activeModeConfig = LEARNING_MODES.find((mode) => mode.id === activeMode);
  const toneDrills = useMemo(() => buildToneDrills(terms), [terms]);
  const activeToneDrill = toneDrills[termIndex % Math.max(1, toneDrills.length)] ?? null;

  useEffect(() => {
    const nextMode = routeModes[0]?.id ?? 'recognition';
    setActiveMode((current) => (routeModes.some((mode) => mode.id === current) ? current : nextMode));
  }, [route, routeModes]);

  useEffect(() => {
    setAnswer('');
    setRevealed(false);
    setSelectedOption('');
  }, [activeMode, termIndex]);

  const recognitionOptions = useMemo(() => (currentTerm ? getDistractors(currentTerm, terms, 'english') : []), [currentTerm, terms]);
  const listeningOptions = useMemo(() => (currentTerm ? getDistractors(currentTerm, terms, 'simplified') : []), [currentTerm, terms]);

  if (!routeModes.length) return null;

  const goNext = () => {
    setTermIndex((index) => (terms.length ? (index + 1) % terms.length : 0));
  };

  const responseTemplate = currentTerm
    ? `我建议我们先确认${currentTerm.simplified}，然后同步下一步行动。`
    : '';

  return (
    <section className="panel learning-panel" aria-label="Learning modes">
      <div className="learning-header">
        <div>
          <p className="eyebrow">Learning mode</p>
          <h2>{activeModeConfig?.label}</h2>
          <p>{activeModeConfig?.description}</p>
        </div>
        <div className="mode-picker" aria-label="Available modes for this route">
          {routeModes.map((mode) => (
            <ModeButton
              active={activeMode === mode.id}
              key={mode.id}
              label={mode.shortLabel}
              onClick={() => setActiveMode(mode.id)}
            />
          ))}
        </div>
      </div>

      {currentTerm ? (
        <div className="mode-card">
          <div className="mode-meta">
            <span>{getCategoryName(currentTerm.category)}</span>
            <span>{currentTerm.domain} · {currentTerm.level}</span>
            <span>{termIndex + 1} / {terms.length}</span>
          </div>

          {activeMode === 'recognition' ? (
            <>
              <div className="prompt-box compact"><div className="prompt-label">What does this mean?</div><div className="prompt-term cn">{currentTerm.simplified}</div><PinyinDisplayToggle mode={pinyinMode} onChange={setPinyinMode} /><div>{formatPinyin(currentTerm.pinyin, pinyinMode)}</div></div>
              <div className="option-grid">
                {recognitionOptions.map((option) => (
                  <button className={`option-btn ${selectedOption === option ? 'selected' : ''}`} key={option} onClick={() => setSelectedOption(option)} type="button">{option}</button>
                ))}
              </div>
            </>
          ) : null}

          {activeMode === 'production' ? (
            <>
              <div className="prompt-box compact"><div className="prompt-label">Say this in Mandarin</div><div className="prompt-term">{currentTerm.english}</div><p>{currentTerm.usageNote}</p></div>
              <textarea className="mode-answer" onChange={(event) => setAnswer(event.target.value)} placeholder="Type Mandarin characters here" value={answer} />
            </>
          ) : null}

          {activeMode === 'pinyin' ? (
            <>
              <div className="prompt-box compact"><div className="prompt-label">Add tone-marked pinyin</div><div className="prompt-term cn">{currentTerm.simplified}</div><PinyinDisplayToggle mode={pinyinMode} onChange={setPinyinMode} /></div>
              <input className="mode-input" onChange={(event) => setAnswer(event.target.value)} placeholder="Example: Chǎnpǐn lùxiàntú" value={answer} />
            </>
          ) : null}

          {activeMode === 'listening' ? (
            <>
              <div className="listening-box">
                {currentTerm.audioUrl ? <audio controls src={currentTerm.audioUrl}>Audio playback is unavailable.</audio> : null}
                <AudioPlayButton audioUrl={currentTerm.audioUrl} text={currentTerm.simplified} />
                <p>Use recorded audio when available, otherwise the browser Mandarin speech voice is used as a fallback.</p>
              </div>
              <div className="option-grid">
                {listeningOptions.map((option) => (
                  <button className={`option-btn ${selectedOption === option ? 'selected' : ''}`} key={option} onClick={() => setSelectedOption(option)} type="button">{option}</button>
                ))}
              </div>
              <input className="mode-input" onChange={(event) => setAnswer(event.target.value)} placeholder="Or type the Mandarin term you heard" value={answer} />
              <PronunciationRecorder onAttempt={(result, note) => onPronunciationAttempt(currentTerm, result, 'recording', note)} promptText={currentTerm.simplified} termId={currentTerm.id} />
            </>
          ) : null}

          {activeMode === 'tone-drill' ? (
            activeToneDrill ? (
              <div className="tone-drill-box">
                <h3>{activeToneDrill.label}</h3>
                <p>{activeToneDrill.hint}</p>
                <div className="tone-pattern">Pattern: {activeToneDrill.pattern}</div>
                <div className="tone-term-grid">
                  {activeToneDrill.terms.slice(0, 6).map((toneTerm) => (
                    <div className="tone-term-card" key={toneTerm.id}>
                      <div className="cn">{toneTerm.simplified}</div>
                      <div>{toneTerm.english}</div>
                      <div>{formatPinyin(toneTerm.pinyin, pinyinMode)}</div>
                      <AudioPlayButton audioUrl={toneTerm.audioUrl} label="Play" text={toneTerm.simplified} />
                      <div className="recorder-actions">
                        <button className="tone-rate good" onClick={() => onPronunciationAttempt(toneTerm, 'good', 'tone-drill', `Matched tone pattern ${getTonePattern(toneTerm.pinyin)}`)} type="button">Good</button>
                        <button className="tone-rate practice" onClick={() => onPronunciationAttempt(toneTerm, 'needs-practice', 'tone-drill', `Practice tone pattern ${getTonePattern(toneTerm.pinyin)}`)} type="button">Practice</button>
                      </div>
                    </div>
                  ))}
                </div>
                <PinyinDisplayToggle mode={pinyinMode} onChange={setPinyinMode} />
              </div>
            ) : <div className="completion visible"><h3>No tone-drill groups yet</h3><p>Add more terms with shared tone patterns to unlock this drill.</p></div>
          ) : null}

          {activeMode === 'sentence' ? (
            <>
              <div className="prompt-box compact">
                <div className="prompt-label">Fill in the missing workplace term</div>
                <div className="sentence-text">{blankTermInSentence(example?.chinese ?? '', currentTerm.simplified)}</div>
                <div className="en">{example?.english}</div>
              </div>
              <input className="mode-input" onChange={(event) => setAnswer(event.target.value)} placeholder="Type the missing Chinese vocabulary" value={answer} />
            </>
          ) : null}

          {activeMode === 'scenario' ? (
            <>
              <div className="scenario-box">
                <h3>Workplace situation</h3>
                <p>Your team is preparing a launch review and someone asks how to discuss <strong>{currentTerm.english}</strong> in Mandarin.</p>
                <p>Choose or compose a concise business-register response.</p>
              </div>
              <div className="option-grid">
                {[responseTemplate, `我们需要重新定义${currentTerm.simplified}的范围。`, `请在会议纪要中加入${currentTerm.simplified}。`].map((option) => (
                  <button className={`option-btn ${selectedOption === option ? 'selected' : ''}`} key={option} onClick={() => setSelectedOption(option)} type="button">{option}</button>
                ))}
              </div>
              <textarea className="mode-answer" onChange={(event) => setAnswer(event.target.value)} placeholder="Compose your own Mandarin response" value={answer} />
            </>
          ) : null}

          {activeMode === 'meeting' ? (
            <>
              <div className="scenario-box">
                <h3>{getMeetingSequenceLabel(currentTerm)}</h3>
                <p>Practice this sequence as a PM meeting flow: frame the topic, discuss the term, confirm owners, then capture next steps.</p>
              </div>
              <ol className="sequence-list">
                <li>Open: 今天我们先讨论{currentTerm.simplified}。</li>
                <li>Clarify: 这个{currentTerm.simplified}会影响{currentTerm.domain}决策。</li>
                <li>Decide: 请确认负责人和时间线。</li>
                <li>Close: 我会把结论写进会议纪要。</li>
              </ol>
            </>
          ) : null}

          {activeMode === 'role-play' ? (
            <>
              <div className="scenario-box">
                <h3>Stakeholder simulation</h3>
                <p>You are a PM speaking with {getStakeholderForTerm(currentTerm)} about <strong>{currentTerm.english}</strong>. Respond in Mandarin, then compare with the model line.</p>
              </div>
              <textarea className="mode-answer" onChange={(event) => setAnswer(event.target.value)} placeholder="Type your PM response in Mandarin" value={answer} />
            </>
          ) : null}

          <div className="action-row">
            <button className="btn btn-neutral" onClick={() => setRevealed(true)} type="button">Show model answer</button>
            <button className="btn btn-refresh" onClick={goNext} type="button">Next prompt</button>
          </div>

          <div className={`answer-panel ${revealed ? 'visible' : ''}`}>
            <div className="answer-line"><span className="label">English</span><span className="value">{currentTerm.english}</span></div>
            <div className="answer-line"><span className="label">Mandarin</span><span className="value cn mandarin-with-audio">{currentTerm.simplified}<AudioPlayButton audioUrl={currentTerm.audioUrl} label="Play term" text={currentTerm.simplified} /></span></div>
            <div className="answer-line"><span className="label">Pinyin</span><span className="value"><PinyinDisplayToggle mode={pinyinMode} onChange={setPinyinMode} />{formatPinyin(currentTerm.pinyin, pinyinMode)}</span></div>
            <div className="answer-line"><span className="label">Model workplace line</span><span className="value">{responseTemplate}</span></div>
            {example ? <div className="example-box"><div className="en">{example.english}</div><div className="zh">{example.chinese}</div><div className="pinyin">{formatPinyin(example.pinyin, pinyinMode)}</div></div> : null}
          </div>
        </div>
      ) : (
        <div className="completion visible"><h3>No prompts available</h3><p>Try another category or clear your search.</p></div>
      )}
    </section>
  );
}

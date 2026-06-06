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
import type { Term } from '../lib/studySession';
import { getCategoryName, getExampleSentences } from '../lib/studySession';

interface LearningModeStudyProps {
  route: StudyRoute;
  terms: readonly Term[];
}

function supportsSpeech() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function speakTerm(term: Term) {
  if (!supportsSpeech()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(term.simplified);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`mode-chip ${active ? 'active' : ''}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export function LearningModeStudy({ route, terms }: LearningModeStudyProps) {
  const routeModes = useMemo(() => getModesForRoute(route), [route]);
  const [activeMode, setActiveMode] = useState<LearningModeId>(routeModes[0]?.id ?? 'recognition');
  const [termIndex, setTermIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const currentTerm = getTermAt(terms, termIndex);
  const example = currentTerm ? getExampleSentences(currentTerm)[0] : null;
  const activeModeConfig = LEARNING_MODES.find((mode) => mode.id === activeMode);

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
              <div className="prompt-box compact"><div className="prompt-label">What does this mean?</div><div className="prompt-term cn">{currentTerm.simplified}</div><div>{currentTerm.pinyin}</div></div>
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
              <div className="prompt-box compact"><div className="prompt-label">Add tone-marked pinyin</div><div className="prompt-term cn">{currentTerm.simplified}</div></div>
              <input className="mode-input" onChange={(event) => setAnswer(event.target.value)} placeholder="Example: Chǎnpǐn lùxiàntú" value={answer} />
            </>
          ) : null}

          {activeMode === 'listening' ? (
            <>
              <div className="listening-box">
                {currentTerm.audioUrl ? <audio controls src={currentTerm.audioUrl}>Audio playback is unavailable.</audio> : null}
                <button className="audio-btn" onClick={() => speakTerm(currentTerm)} type="button">▶ Play Mandarin</button>
                <p>{currentTerm.audioUrl ? 'Use the recorded audio, or replay with the browser Mandarin voice.' : supportsSpeech() ? 'Uses your browser’s Mandarin speech voice.' : 'Speech playback is unavailable in this browser; use the visible prompt as fallback.'}</p>
              </div>
              <div className="option-grid">
                {listeningOptions.map((option) => (
                  <button className={`option-btn ${selectedOption === option ? 'selected' : ''}`} key={option} onClick={() => setSelectedOption(option)} type="button">{option}</button>
                ))}
              </div>
              <input className="mode-input" onChange={(event) => setAnswer(event.target.value)} placeholder="Or type the Mandarin term you heard" value={answer} />
            </>
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
            <div className="answer-line"><span className="label">Mandarin</span><span className="value cn">{currentTerm.simplified}</span></div>
            <div className="answer-line"><span className="label">Pinyin</span><span className="value">{currentTerm.pinyin}</span></div>
            <div className="answer-line"><span className="label">Model workplace line</span><span className="value">{responseTemplate}</span></div>
            {example ? <div className="example-box"><div className="en">{example.english}</div><div className="zh">{example.chinese}</div><div className="pinyin">{example.pinyin}</div></div> : null}
          </div>
        </div>
      ) : (
        <div className="completion visible"><h3>No prompts available</h3><p>Try another category or clear your search.</p></div>
      )}
    </section>
  );
}

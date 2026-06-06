import { useMemo, useState } from 'react';
import type { ProgressMap, Term, TermCategory } from '../lib/studySession';
import {
  getExampleSentences,
  getProgress,
  getPronunciationDifficulty,
  getScenarioName,
  getWorkplaceScenario,
  isDue,
  isMastered,
} from '../lib/studySession';

function Badge({ category }: { category: TermCategory }) {
  if (category === 'pm') return <span className="badge pm">PM</span>;
  if (category === 'ai') return <span className="badge ai">AI</span>;
  return <span className="badge rc">Risk</span>;
}

interface GlossaryTableProps {
  terms: readonly Term[];
  allTerms: readonly Term[];
  progress: ProgressMap;
  onCurriculumSelect: (level: number) => void;
}

const CURRICULUM = [
  { level: 1, title: 'Core PM vocabulary', description: 'Beginner product concepts for roadmaps, backlogs, MVPs, and stakeholders.' },
  { level: 2, title: 'Meetings and metrics', description: 'Sprint rituals, KPI reviews, stakeholder readouts, and metric conversations.' },
  { level: 3, title: 'AI product conversations', description: 'AI product discovery, model quality, prompt behavior, and launch vocabulary.' },
  { level: 4, title: 'Compliance/risk escalation', description: 'Risk, controls, audit, compliance, and escalation language for regulated work.' },
];

function formatDueDate(dueAt: number) {
  if (!dueAt) return 'Now';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dueAt));
}

export function GlossaryTable({ terms, allTerms, progress, onCurriculumSelect }: GlossaryTableProps) {
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const termById = useMemo(() => new Map(allTerms.map((term) => [term.id, term])), [allTerms]);
  const selectedTerm = selectedTermId ? termById.get(selectedTermId) : undefined;
  const selectedProgress = selectedTerm ? getProgress(selectedTerm, progress) : undefined;

  return (
    <section className="table-wrap" aria-label="Glossary reference and curriculum">
      <div className="curriculum-panel">
        <div>
          <p className="eyebrow">Curriculum view</p>
          <h2>Move from compact reference to guided PM fluency</h2>
        </div>
        <div className="curriculum-grid">
          {CURRICULUM.map((item) => (
            <button className="curriculum-card" key={item.level} onClick={() => onCurriculumSelect(item.level)} type="button">
              <span>Level {item.level}</span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="compact-heading">
        <div>
          <p className="eyebrow">Compact reference view</p>
          <h2>Glossary table</h2>
        </div>
        <p>{terms.length} terms match the active filters. Open details for examples, collocations, audio, notes, and related terms.</p>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>English</th>
              <th>中文</th>
              <th>Traditional</th>
              <th>Pinyin</th>
              <th>Domain</th>
              <th>Level</th>
              <th>Progress</th>
              <th>Group</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((term, index) => {
              const record = getProgress(term, progress);
              return (
                <tr key={term.id}>
                  <td><span className="row-num">{index + 1}.</span>{term.english}</td>
                  <td>{term.simplified}</td>
                  <td>{term.traditional || '—'}</td>
                  <td>{term.pinyin}</td>
                  <td>{term.domain}</td>
                  <td>{term.level}</td>
                  <td>{isMastered(record) ? 'Mastered' : isDue(record) ? 'Due now' : `Due ${formatDueDate(record.dueAt)}`}</td>
                  <td><Badge category={term.category} /></td>
                  <td><button className="detail-link" onClick={() => setSelectedTermId(term.id)} type="button">Open</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedTerm && selectedProgress && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setSelectedTermId(null)}>
          <aside className="term-drawer" aria-label={`${selectedTerm.english} details`} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelectedTermId(null)} type="button" aria-label="Close term details">×</button>
            <p className="eyebrow">{getScenarioName(getWorkplaceScenario(selectedTerm))} · pronunciation {getPronunciationDifficulty(selectedTerm)}</p>
            <h2>{selectedTerm.english}</h2>
            <div className="drawer-translation">
              <span>{selectedTerm.simplified}</span>
              <small>{selectedTerm.traditional || selectedTerm.simplified} · {selectedTerm.pinyin}</small>
            </div>
            <p className="usage-note">{selectedTerm.usageNote}</p>
            <dl className="detail-stats">
              <div><dt>Domain</dt><dd>{selectedTerm.domain}</dd></div>
              <div><dt>Level</dt><dd>{selectedTerm.level}</dd></div>
              <div><dt>Reviews</dt><dd>{selectedProgress.attempts}</dd></div>
              <div><dt>Next due</dt><dd>{formatDueDate(selectedProgress.dueAt)}</dd></div>
            </dl>

            <section>
              <h3>Examples</h3>
              {getExampleSentences(selectedTerm).map((example) => (
                <div className="example-box" key={`${example.english}-${example.chinese}`}>
                  <p className="en">{example.english}</p>
                  <p className="zh">{example.chinese}</p>
                  <p className="pinyin">{example.pinyin}</p>
                  {example.literalGloss && <p className="literal">{example.literalGloss}</p>}
                </div>
              ))}
            </section>

            <section>
              <h3>Collocations</h3>
              <div className="token-row">{selectedTerm.collocations.map((item) => <span key={item}>{item}</span>)}</div>
            </section>

            <section>
              <h3>Audio</h3>
              {selectedTerm.audioUrl ? <audio controls src={selectedTerm.audioUrl}>Audio is not supported in this browser.</audio> : <p className="muted">No audio file yet. Use the pinyin and example sentences for pronunciation practice.</p>}
            </section>

            <section>
              <h3>Usage notes and common mistakes</h3>
              <ul>{selectedTerm.commonMistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
            </section>

            <section>
              <h3>Related terms</h3>
              <div className="token-row">
                {selectedTerm.relatedTerms.map((relatedId) => {
                  const related = termById.get(relatedId);
                  return <span key={relatedId}>{related?.english ?? relatedId}</span>;
                })}
              </div>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

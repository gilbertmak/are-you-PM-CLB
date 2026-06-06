import type { Term, TermCategory } from '../lib/studySession';

function Badge({ category }: { category: TermCategory }) {
  if (category === 'pm') return <span className="badge pm">PM</span>;
  if (category === 'ai') return <span className="badge ai">AI</span>;
  return <span className="badge rc">Risk</span>;
}

export function GlossaryTable({ terms }: { terms: readonly Term[] }) {
  return (
    <section className="table-wrap" aria-label="Glossary table">
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
              <th>Group</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((term, index) => (
              <tr key={term.id}>
                <td><span className="row-num">{index + 1}.</span>{term.english}</td>
                <td>{term.simplified}</td>
                <td>{term.traditional || '—'}</td>
                <td>{term.pinyin}</td>
                <td>{term.domain}</td>
                <td>{term.level}</td>
                <td><Badge category={term.category} /></td>
                <td>{term.usageNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

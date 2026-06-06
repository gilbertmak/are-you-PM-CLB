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
              <th>Pinyin</th>
              <th>Group</th>
            </tr>
          </thead>
          <tbody>
            {terms.map(([english, mandarin, pinyin, category], index) => (
              <tr key={`${category}-${english}`}>
                <td><span className="row-num">{index + 1}.</span>{english}</td>
                <td>{mandarin}</td>
                <td>{pinyin}</td>
                <td><Badge category={category} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

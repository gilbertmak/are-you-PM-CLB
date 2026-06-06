interface SearchControlsProps {
  count: number;
  dueCount: number;
  query: string;
  scopeLabel: string;
  onQueryChange: (query: string) => void;
}

export function SearchControls({ count, dueCount, query, scopeLabel, onQueryChange }: SearchControlsProps) {
  return (
    <section className="controls-wrap" aria-label="Search and glossary status">
      <input
        className="search-input"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="🔍 Search terms in English, 中文, or Pinyin"
        type="text"
        value={query}
      />
      <div className="pill">Scope: {scopeLabel}</div>
      <div className="pill">Terms: {count}</div>
      <div className="pill">Due now: {dueCount}</div>
    </section>
  );
}

import type { GlossaryFilters, TermDomain, TermLevel } from '../lib/studySession';
import { getScenarioName } from '../lib/studySession';

const DOMAINS: Array<'all' | TermDomain> = ['all', 'product', 'meetings', 'metrics', 'AI', 'risk', 'compliance'];
const LEVELS: Array<'all' | TermLevel> = ['all', 'beginner', 'working', 'advanced'];

interface SearchControlsProps {
  count: number;
  dueCount: number;
  filters: GlossaryFilters;
  query: string;
  scopeLabel: string;
  onFiltersChange: (filters: GlossaryFilters) => void;
  onQueryChange: (query: string) => void;
  onSavedListSelect: (listId: string) => void;
}

function title(value: string) {
  if (value === 'all') return 'All';
  if (value === 'AI') return 'AI';
  return value.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

export function SearchControls({
  count,
  dueCount,
  filters,
  query,
  scopeLabel,
  onFiltersChange,
  onQueryChange,
  onSavedListSelect,
}: SearchControlsProps) {
  const updateFilter = <K extends keyof GlossaryFilters>(key: K, value: GlossaryFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <section className="controls-wrap" aria-label="Search and glossary status">
      <input
        className="search-input"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="🔍 Search terms in English, 中文, Pinyin, examples, notes, or collocations"
        type="text"
        value={query}
      />
      <label className="filter-field">
        <span>Category</span>
        <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value as GlossaryFilters['category'])}>
          <option value="all">All categories</option>
          <option value="pm">Product Management</option>
          <option value="ai">Generative AI</option>
          <option value="rc">Risk & Compliance</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Domain</span>
        <select value={filters.domain} onChange={(event) => updateFilter('domain', event.target.value as GlossaryFilters['domain'])}>
          {DOMAINS.map((domain) => <option key={domain} value={domain}>{title(domain)}</option>)}
        </select>
      </label>
      <label className="filter-field">
        <span>Level</span>
        <select value={filters.level} onChange={(event) => updateFilter('level', event.target.value as GlossaryFilters['level'])}>
          {LEVELS.map((level) => <option key={level} value={level}>{title(level)}</option>)}
        </select>
      </label>
      <label className="filter-field">
        <span>Mastery</span>
        <select value={filters.mastery} onChange={(event) => updateFilter('mastery', event.target.value as GlossaryFilters['mastery'])}>
          <option value="all">All progress</option>
          <option value="mastered">Mastered</option>
          <option value="unmastered">Unmastered</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Pronunciation</span>
        <select value={filters.pronunciation} onChange={(event) => updateFilter('pronunciation', event.target.value as GlossaryFilters['pronunciation'])}>
          <option value="all">All difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Scenario</span>
        <select value={filters.scenario} onChange={(event) => updateFilter('scenario', event.target.value as GlossaryFilters['scenario'])}>
          <option value="all">All scenarios</option>
          <option value="product-planning">{getScenarioName('product-planning')}</option>
          <option value="stakeholder-meetings">{getScenarioName('stakeholder-meetings')}</option>
          <option value="metrics-review">{getScenarioName('metrics-review')}</option>
          <option value="ai-product-conversations">{getScenarioName('ai-product-conversations')}</option>
          <option value="risk-escalation">{getScenarioName('risk-escalation')}</option>
          <option value="compliance-review">{getScenarioName('compliance-review')}</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Sort</span>
        <select value={filters.sortBy} onChange={(event) => updateFilter('sortBy', event.target.value as GlossaryFilters['sortBy'])}>
          <option value="alphabetical">Alphabetical</option>
          <option value="due-date">Due date</option>
          <option value="weakest">Weakest terms</option>
          <option value="most-reviewed">Most reviewed</option>
          <option value="newest">Newest</option>
        </select>
      </label>
      <label className="check-pill">
        <input checked={filters.dueNow} onChange={(event) => updateFilter('dueNow', event.target.checked)} type="checkbox" />
        Due now only
      </label>
      <div className="saved-list-row" aria-label="Saved vocabulary lists">
        <span>Saved lists:</span>
        <button className="list-chip" onClick={() => onSavedListSelect('weekly-product-review')} type="button">This week’s product review vocabulary</button>
        <button className="list-chip" onClick={() => onSavedListSelect('ai-risk-readiness')} type="button">AI risk readiness</button>
      </div>
      <div className="pill">Scope: {scopeLabel}</div>
      <div className="pill">Terms: {count}</div>
      <div className="pill">Due now: {dueCount}</div>
    </section>
  );
}

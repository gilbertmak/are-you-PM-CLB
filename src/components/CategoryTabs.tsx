import type { Category } from '../lib/studySession';

const tabs: Array<{ id: Category; label: string }> = [
  { id: 'all', label: 'Main' },
  { id: 'pm', label: 'Product Management' },
  { id: 'ai', label: 'Generative AI' },
  { id: 'rc', label: 'Risk & Compliance' },
];

interface CategoryTabsProps {
  activeCategory: Category;
  onChange: (category: Category) => void;
}

export function CategoryTabs({ activeCategory, onChange }: CategoryTabsProps) {
  return (
    <nav className="tabs-wrap" aria-label="Glossary categories">
      {tabs.map((tab) => (
        <button
          className={`tab-btn ${activeCategory === tab.id ? 'active' : ''}`}
          data-tab={tab.id}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

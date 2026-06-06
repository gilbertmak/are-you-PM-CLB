import { PINYIN_DISPLAY_OPTIONS, type PinyinDisplayMode } from '../lib/pronunciation';

interface PinyinDisplayToggleProps {
  mode: PinyinDisplayMode;
  onChange: (mode: PinyinDisplayMode) => void;
}

export function PinyinDisplayToggle({ mode, onChange }: PinyinDisplayToggleProps) {
  return (
    <div className="pinyin-toggle" aria-label="Pinyin display mode">
      <span>Pinyin</span>
      {PINYIN_DISPLAY_OPTIONS.map((option) => (
        <button
          className={mode === option.id ? 'active' : ''}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

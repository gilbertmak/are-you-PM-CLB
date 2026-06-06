import { playMandarin } from '../lib/pronunciation';

interface AudioPlayButtonProps {
  audioUrl?: string;
  className?: string;
  label?: string;
  text: string;
}

export function AudioPlayButton({ audioUrl, className = '', label = 'Play Mandarin', text }: AudioPlayButtonProps) {
  return (
    <button aria-label={label} className={`audio-btn ${className}`.trim()} onClick={() => playMandarin(text, audioUrl)} type="button">
      ▶ {label}
    </button>
  );
}

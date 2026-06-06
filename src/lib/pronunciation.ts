import type { Term } from './studySession';

export type PinyinDisplayMode = 'hidden' | 'tone-marks' | 'numbered' | 'syllables';

const TONE_MARKS: Record<string, { plain: string; tone: string }> = {
  ā: { plain: 'a', tone: '1' }, á: { plain: 'a', tone: '2' }, ǎ: { plain: 'a', tone: '3' }, à: { plain: 'a', tone: '4' },
  ē: { plain: 'e', tone: '1' }, é: { plain: 'e', tone: '2' }, ě: { plain: 'e', tone: '3' }, è: { plain: 'e', tone: '4' },
  ī: { plain: 'i', tone: '1' }, í: { plain: 'i', tone: '2' }, ǐ: { plain: 'i', tone: '3' }, ì: { plain: 'i', tone: '4' },
  ō: { plain: 'o', tone: '1' }, ó: { plain: 'o', tone: '2' }, ǒ: { plain: 'o', tone: '3' }, ò: { plain: 'o', tone: '4' },
  ū: { plain: 'u', tone: '1' }, ú: { plain: 'u', tone: '2' }, ǔ: { plain: 'u', tone: '3' }, ù: { plain: 'u', tone: '4' },
  ǖ: { plain: 'ü', tone: '1' }, ǘ: { plain: 'ü', tone: '2' }, ǚ: { plain: 'ü', tone: '3' }, ǜ: { plain: 'ü', tone: '4' },
  Ā: { plain: 'A', tone: '1' }, Á: { plain: 'A', tone: '2' }, Ǎ: { plain: 'A', tone: '3' }, À: { plain: 'A', tone: '4' },
  Ē: { plain: 'E', tone: '1' }, É: { plain: 'E', tone: '2' }, Ě: { plain: 'E', tone: '3' }, È: { plain: 'E', tone: '4' },
  Ō: { plain: 'O', tone: '1' }, Ó: { plain: 'O', tone: '2' }, Ǒ: { plain: 'O', tone: '3' }, Ò: { plain: 'O', tone: '4' },
};

export interface ToneDrillPrompt {
  label: string;
  pattern: string;
  hint: string;
  terms: readonly Term[];
}

export const PINYIN_DISPLAY_OPTIONS: Array<{ id: PinyinDisplayMode; label: string }> = [
  { id: 'hidden', label: 'Hidden' },
  { id: 'tone-marks', label: 'Tone marks' },
  { id: 'numbered', label: 'Numbered' },
  { id: 'syllables', label: 'Syllable-by-syllable' },
];

function convertSyllableToNumbered(syllable: string) {
  let tone = '5';
  let plain = '';

  for (const char of syllable) {
    const marked = TONE_MARKS[char];
    if (marked) {
      plain += marked.plain;
      tone = marked.tone;
    } else {
      plain += char;
    }
  }

  return /[a-zü]/i.test(plain) ? `${plain}${tone}` : plain;
}

export function toNumberedPinyin(pinyin: string) {
  return pinyin
    .split(/(\s+|[-,.;:!?()“”]+)/)
    .map((part) => (/^[A-Za-züÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈŌÓǑÒ]+$/.test(part) ? convertSyllableToNumbered(part) : part))
    .join('');
}

export function splitPinyinSyllables(pinyin: string) {
  return pinyin.split(/\s+/).flatMap((word) => word.split(/(?<=[1-5])|-/)).filter(Boolean);
}

export function formatPinyin(pinyin: string, mode: PinyinDisplayMode) {
  if (mode === 'hidden') return 'Pinyin hidden';
  if (mode === 'numbered') return toNumberedPinyin(pinyin);
  if (mode === 'syllables') return splitPinyinSyllables(toNumberedPinyin(pinyin)).join(' · ');
  return pinyin;
}

export function getTonePattern(pinyin: string) {
  return splitPinyinSyllables(toNumberedPinyin(pinyin))
    .map((syllable) => syllable.match(/[1-5]$/)?.[0] ?? '5')
    .join('-');
}

export function buildToneDrills(terms: readonly Term[]): ToneDrillPrompt[] {
  const groups = terms.reduce<Record<string, Term[]>>((acc, term) => {
    const pattern = getTonePattern(term.pinyin);
    if (!pattern) return acc;
    acc[pattern] = [...(acc[pattern] ?? []), term];
    return acc;
  }, {});

  return Object.entries(groups)
    .filter(([, groupedTerms]) => groupedTerms.length > 1)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 8)
    .map(([pattern, groupedTerms]) => ({
      label: `Tone pattern ${pattern}`,
      pattern,
      hint: 'Listen, repeat, then compare the tone-number contour before rating pronunciation.',
      terms: groupedTerms,
    }));
}

export function playMandarin(text: string, audioUrl?: string) {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => undefined);
    return;
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

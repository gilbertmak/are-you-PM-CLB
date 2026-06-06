import type { Term } from './studySession';

export type AttemptResultState = 'exact' | 'close-pinyin' | 'character-mismatch' | 'empty-or-unrelated';

export interface AttemptValidationResult {
  state: AttemptResultState;
  feedback: string;
  normalizedAttempt: string;
  matchedAgainst?: string;
}

const toneMarks: Record<string, { base: string; tone: string }> = {
  ā: { base: 'a', tone: '1' },
  á: { base: 'a', tone: '2' },
  ǎ: { base: 'a', tone: '3' },
  à: { base: 'a', tone: '4' },
  ē: { base: 'e', tone: '1' },
  é: { base: 'e', tone: '2' },
  ě: { base: 'e', tone: '3' },
  è: { base: 'e', tone: '4' },
  ī: { base: 'i', tone: '1' },
  í: { base: 'i', tone: '2' },
  ǐ: { base: 'i', tone: '3' },
  ì: { base: 'i', tone: '4' },
  ō: { base: 'o', tone: '1' },
  ó: { base: 'o', tone: '2' },
  ǒ: { base: 'o', tone: '3' },
  ò: { base: 'o', tone: '4' },
  ū: { base: 'u', tone: '1' },
  ú: { base: 'u', tone: '2' },
  ǔ: { base: 'u', tone: '3' },
  ù: { base: 'u', tone: '4' },
  ǖ: { base: 'ü', tone: '1' },
  ǘ: { base: 'ü', tone: '2' },
  ǚ: { base: 'ü', tone: '3' },
  ǜ: { base: 'ü', tone: '4' },
  ü: { base: 'ü', tone: '' },
};

const ordinalToneNames = ['first', 'second', 'third', 'fourth', 'neutral'];

export function normalizeAttemptInput(value: string, { removeToneMarks = false } = {}) {
  const normalized = value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[‘’‚‛`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[，、。！？；：（）【】《》〈〉]/g, ' ')
    .replace(/[,.!?;:()[\]{}<>/\\|_+=~^$#@*&%]/g, ' ')
    .replace(/[‐‑‒–—―-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!removeToneMarks) return normalized;
  return normalized.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, (char) => toneMarks[char]?.base ?? char);
}

export function toNumberedPinyin(value: string) {
  return value
    .normalize('NFKC')
    .split(/(\s+|[-‐‑‒–—―])/)
    .map((part) => {
      if (/^\s+$|^[-‐‑‒–—―]$/.test(part)) return part;
      let tone = '';
      const converted = part.toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, (char) => {
        const mark = toneMarks[char];
        if (!mark) return char;
        if (mark.tone) tone = mark.tone;
        return mark.base;
      });
      return tone ? `${converted}${tone}` : converted;
    })
    .join('');
}

function extractToneSequence(value: string) {
  const numbered = toNumberedPinyin(value);
  const tones = numbered.match(/[1-5]/g);
  return tones ? tones : [];
}

function hasToneSignal(value: string) {
  return /[1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(value);
}

function hasCjk(value: string) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(value);
}

function levenshtein(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let last = i - 1;
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j];
      previous[j] = a[i - 1] === b[j - 1] ? last : Math.min(last, previous[j - 1], previous[j]) + 1;
      last = old;
    }
  }

  return previous[b.length];
}

function getAcceptedAnswers(term: Term) {
  return [
    { label: 'simplified characters', value: term.simplified },
    term.traditional ? { label: 'traditional characters', value: term.traditional } : null,
    { label: 'tone-mark pinyin', value: term.pinyin },
    { label: 'numbered pinyin', value: toNumberedPinyin(term.pinyin) },
    ...(term.acceptedAliases ?? []).map((alias) => ({ label: 'accepted alias', value: alias })),
  ].filter(Boolean) as Array<{ label: string; value: string }>;
}

export function validateAttempt(term: Term, attemptInput: string): AttemptValidationResult {
  const normalizedAttempt = normalizeAttemptInput(attemptInput);

  if (!normalizedAttempt) {
    return {
      state: 'empty-or-unrelated',
      feedback: 'No attempt entered. Reveal is allowed, but try a character or pinyin recall before rating yourself.',
      normalizedAttempt,
    };
  }

  const exactMatch = getAcceptedAnswers(term).find(({ value }) => normalizeAttemptInput(value) === normalizedAttempt);
  if (exactMatch) {
    return {
      state: 'exact',
      feedback: `Exact match against ${exactMatch.label}. You can still override the rating if your workplace uses another translation.`,
      normalizedAttempt,
      matchedAgainst: exactMatch.label,
    };
  }

  const characterMatch = [term.simplified, term.traditional]
    .filter(Boolean)
    .some((characters) => normalizedAttempt.includes(normalizeAttemptInput(characters ?? '')));

  if (characterMatch && /[a-z]/.test(normalizedAttempt) && !hasToneSignal(attemptInput)) {
    return {
      state: 'close-pinyin',
      feedback: 'Characters correct, tone missing. Check the pinyin tones before self-rating.',
      normalizedAttempt,
      matchedAgainst: 'characters plus pinyin without tones',
    };
  }

  const plainAttempt = normalizeAttemptInput(attemptInput, { removeToneMarks: true }).replace(/[1-5]/g, '');
  const plainPinyin = normalizeAttemptInput(term.pinyin, { removeToneMarks: true }).replace(/[1-5]/g, '');

  if (plainAttempt === plainPinyin) {
    if (!hasToneSignal(attemptInput)) {
      return {
        state: 'close-pinyin',
        feedback: 'Pinyin spelling correct; tones are missing. Check the tone-mark or numbered pinyin before self-rating.',
        normalizedAttempt,
        matchedAgainst: 'pinyin without tones',
      };
    }

    const expectedTones = extractToneSequence(term.pinyin);
    const attemptTones = extractToneSequence(attemptInput);
    const firstMismatch = expectedTones.findIndex((tone, index) => attemptTones[index] !== tone);
    const expectedTone = expectedTones[firstMismatch];
    const expectedToneName = expectedTone ? ordinalToneNames[Number(expectedTone) - 1] : null;

    return {
      state: 'close-pinyin',
      feedback: expectedToneName
        ? `Pinyin close; check ${expectedToneName} tone.`
        : 'Pinyin close; check the tone pattern.',
      normalizedAttempt,
      matchedAgainst: 'pinyin with tone difference',
    };
  }

  if (levenshtein(plainAttempt, plainPinyin) <= Math.max(1, Math.floor(plainPinyin.length * 0.15))) {
    return {
      state: 'close-pinyin',
      feedback: 'Pinyin close; check spelling, syllable breaks, and tones.',
      normalizedAttempt,
      matchedAgainst: 'similar pinyin',
    };
  }

  if (hasCjk(attemptInput)) {
    return {
      state: 'character-mismatch',
      feedback: 'Character mismatch. Compare the simplified/traditional form before deciding whether this is an acceptable workplace variant.',
      normalizedAttempt,
      matchedAgainst: 'Mandarin characters',
    };
  }

  return {
    state: 'empty-or-unrelated',
    feedback: 'Attempt looks unrelated to the expected characters or pinyin. Use self-rating as the final override if you intended a valid synonym.',
    normalizedAttempt,
  };
}

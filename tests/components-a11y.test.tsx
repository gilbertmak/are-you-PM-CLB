import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlashcardStudy } from '../src/components/FlashcardStudy';
import { GlossaryTable } from '../src/components/GlossaryTable';
import { terms } from '../src/data/terms';

const noop = () => undefined;

test('flashcard component exposes keyboard instructions and labelled controls', () => {
  const html = renderToStaticMarkup(
    <FlashcardStudy
      category="all"
      currentIndex={0}
      deck={terms.slice(0, 2)}
      masteredCount={0}
      nextReviewLabel="Now"
      onRate={noop}
      onRefreshDeck={noop}
      reviewedCount={0}
      sessionCorrect={0}
    />,
  );

  assert.ok(html.includes('Keyboard: Enter reveal'));
  assert.ok(html.includes('aria-label="Mandarin answer attempt"'));
  assert.ok(html.includes('aria-label="Reveal flashcard answer"'));
  assert.ok(html.includes('aria-label="Refresh flashcard study deck"'));
});

test('glossary table has a caption and accessible detail controls', () => {
  const html = renderToStaticMarkup(
    <GlossaryTable terms={terms.slice(0, 3)} allTerms={terms} progress={{}} onCurriculumSelect={noop} />,
  );

  assert.ok(html.includes('<caption>Mandarin PM glossary terms'));
  assert.ok(html.includes('aria-label="Glossary reference and curriculum"'));
  assert.ok(html.includes('aria-label="Open details for'));
  assert.ok(html.includes('/terms/'));
});

test('static accessibility checks cover landmarks and screen-reader affordances', () => {
  const flashcardHtml = renderToStaticMarkup(
    <FlashcardStudy
      category="pm"
      currentIndex={0}
      deck={terms.slice(0, 1)}
      masteredCount={0}
      nextReviewLabel="Now"
      onRate={noop}
      onRefreshDeck={noop}
      reviewedCount={0}
      sessionCorrect={0}
    />,
  );
  const glossaryHtml = renderToStaticMarkup(
    <GlossaryTable terms={terms.slice(0, 1)} allTerms={terms} progress={{}} onCurriculumSelect={noop} />,
  );

  assert.ok(flashcardHtml.includes('<section'));
  assert.ok(flashcardHtml.includes('aria-label="Flashcard study mode"'));
  assert.ok(glossaryHtml.includes('<section'));
  assert.ok(glossaryHtml.includes('<caption>'));
});

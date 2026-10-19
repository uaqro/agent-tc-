/**
 * TED never executes anything (ADR-TCP-001, sección 5): its answers are text, with no action attached.
 */
import { describe, expect, it } from 'vitest';
import { tedAnswers } from '../intelligence';

describe('TED is not transactional', () => {
  it('answers carry only their keywords and text', () => {
    for (const answer of tedAnswers) expect(Object.keys(answer).sort()).toEqual(['keywords', 'text']);
  });
});

import { describe, it, expect } from 'vitest';
import { IntentSchema } from './types.js';

describe('IntentSchema', () => {
  it('parses a minimal valid intent with defaults', () => {
    const parsed = IntentSchema.parse({
      origin: '32.0853,34.7818',
      destination: '32.7940,34.9896',
    });
    expect(parsed.mode).toBe('driving');
    expect(parsed.avoid).toEqual([]);
    expect(parsed.prefer).toEqual([]);
    expect(parsed.waypoints).toEqual([]);
  });

  it('rejects an unknown travel mode', () => {
    expect(() =>
      IntentSchema.parse({ origin: 'a', destination: 'b', mode: 'flying' as any })
    ).toThrow();
  });

  it('rejects an unknown "avoid" value', () => {
    expect(() =>
      IntentSchema.parse({ origin: 'a', destination: 'b', avoid: ['dragons'] as any })
    ).toThrow();
  });

  it('accepts arbitrary "prefer" strings so skills can extend it', () => {
    const parsed = IntentSchema.parse({
      origin: 'a',
      destination: 'b',
      prefer: ['coastal', 'mood:chill', 'shelter-aware'],
    });
    expect(parsed.prefer).toContain('mood:chill');
  });

  it('accepts known avoid values', () => {
    const parsed = IntentSchema.parse({
      origin: 'a',
      destination: 'b',
      avoid: ['highways', 'tolls'],
    });
    expect(parsed.avoid).toEqual(['highways', 'tolls']);
  });
});

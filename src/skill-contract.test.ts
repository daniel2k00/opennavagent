import { describe, it, expect } from 'vitest';
import type { Skill } from './skills.js';

/**
 * This file is a *contract* test: it pins the expected behavior that any
 * skill author can rely on. If these shapes change, skills in the wild break.
 *
 * We test the skill-shape contract without going through the disk loader,
 * so we don't need a temp filesystem.
 */

describe('Skill contract', () => {
  it('allows a skill to inject an intentPrompt', () => {
    const skill: Skill = {
      name: 'test-prompt',
      intentPrompt: 'Extra instructions',
    };
    expect(skill.intentPrompt).toBe('Extra instructions');
  });

  it('allows a skill to mutate the planner request synchronously', () => {
    const skill: Skill = {
      name: 'test-sync',
      transformRoute(request) {
        return { ...request, costing_options: { auto: { use_highways: 0 } } };
      },
    };
    const out = skill.transformRoute!({ locations: [] }, {} as any);
    expect(out.costing_options.auto.use_highways).toBe(0);
  });

  it('allows a skill to mutate the planner request asynchronously', async () => {
    const skill: Skill = {
      name: 'test-async',
      async transformRoute(request) {
        await new Promise((r) => setTimeout(r, 1));
        return { ...request, injected: true };
      },
    };
    const out = await skill.transformRoute!({ locations: [] }, {} as any);
    expect(out.injected).toBe(true);
  });

  it('allows a skill to resolve a location name to coordinates', async () => {
    const skill: Skill = {
      name: 'test-resolver',
      async resolveLocation(place) {
        if (place === 'Tel Aviv') return { lat: 32.08, lon: 34.78 };
        return null;
      },
    };
    const hit = await skill.resolveLocation!('Tel Aviv');
    expect(hit).toEqual({ lat: 32.08, lon: 34.78 });
    const miss = await skill.resolveLocation!('Atlantis');
    expect(miss).toBeNull();
  });
});

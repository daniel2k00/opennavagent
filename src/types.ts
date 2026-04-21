import { z } from 'zod';

/**
 * The structured intent extracted from a user's natural-language request.
 * Skills extend this by adding new fields; keep the core minimal.
 */
export const IntentSchema = z.object({
  origin: z.string().describe('Starting point (address, place name, or "current location")'),
  destination: z.string().describe('Destination (address or place name)'),
  avoid: z
    .array(z.enum(['highways', 'tolls', 'ferries', 'traffic']))
    .default([])
    .describe('Things the user wants to avoid'),
  prefer: z
    .array(z.string())
    .default([])
    .describe('Preferences like "scenic", "coastal", "quiet" — skills add more'),
  waypoints: z
    .array(z.string())
    .default([])
    .describe('Intermediate stops (e.g. "a coffee shop")'),
  mode: z.enum(['driving', 'walking', 'cycling']).default('driving'),
});

export type Intent = z.infer<typeof IntentSchema>;

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface Route {
  distanceMeters: number;
  durationSeconds: number;
  geometry: string;
  maneuvers: Array<{ instruction: string; distance: number }>;
  summary: string;
}

export interface NavRequest {
  text: string;
  context?: { currentLocation?: Coordinate };
}

export interface NavResponse {
  intent: Intent;
  route: Route;
  explanation: string;
}

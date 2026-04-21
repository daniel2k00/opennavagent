import type { Intent, Route, Coordinate } from './types.js';
import { applyPlannerSkills } from './skills.js';

const VALHALLA_URL = process.env.VALHALLA_URL ?? 'http://localhost:8002';

/**
 * Minimal geocoder stub. Real geocoding is a skill (/add-geocoding).
 * For now, accept "lat,lon" strings or throw so users know to install the skill.
 */
function geocode(place: string, fallback?: Coordinate): Coordinate {
  if (place === 'current location' && fallback) return fallback;
  const m = place.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (m) return { lat: parseFloat(m[1]!), lon: parseFloat(m[2]!) };
  throw new Error(
    `Cannot geocode "${place}". Install a geocoding skill: cursor → /add-geocoding`
  );
}

/**
 * Turns a structured Intent into a Valhalla request body.
 * Skills mutate this object to inject custom routing rules.
 */
async function buildValhallaRequest(intent: Intent, current?: Coordinate) {
  const origin = geocode(intent.origin, current);
  const destination = geocode(intent.destination);
  const waypoints = intent.waypoints.map((w) => geocode(w));

  const locations = [origin, ...waypoints, destination].map((c) => ({
    lat: c.lat,
    lon: c.lon,
  }));

  const costing = intent.mode === 'cycling' ? 'bicycle' : intent.mode === 'walking' ? 'pedestrian' : 'auto';
  const costingOptions: Record<string, unknown> = {};

  if (intent.avoid.includes('highways')) costingOptions.use_highways = 0;
  if (intent.avoid.includes('tolls')) costingOptions.use_tolls = 0;
  if (intent.avoid.includes('ferries')) costingOptions.use_ferry = 0;

  const request = {
    locations,
    costing,
    costing_options: { [costing]: costingOptions },
    directions_options: { units: 'kilometers' },
  };

  return applyPlannerSkills(request, intent);
}

export async function planRoute(intent: Intent, current?: Coordinate): Promise<Route> {
  const body = await buildValhallaRequest(intent, current);

  const res = await fetch(`${VALHALLA_URL}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Valhalla error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  const leg = data.trip?.legs?.[0];
  if (!leg) throw new Error('Valhalla returned no route');

  return {
    distanceMeters: Math.round((data.trip.summary.length ?? 0) * 1000),
    durationSeconds: Math.round(data.trip.summary.time ?? 0),
    geometry: leg.shape ?? '',
    maneuvers: (leg.maneuvers ?? []).map((m: any) => ({
      instruction: m.instruction ?? '',
      distance: m.length ?? 0,
    })),
    summary: `${data.trip.summary.length?.toFixed(1)} km, ~${Math.round((data.trip.summary.time ?? 0) / 60)} min`,
  };
}

import { execSync } from 'node:child_process';

/**
 * Thin wrapper over `docker compose` for the Valhalla sidecar.
 * Intentionally minimal — skills can replace this (e.g. use Apple Container).
 */
export function isValhallaRunning(): boolean {
  try {
    const out = execSync('docker compose -f docker/docker-compose.yml ps --services --filter "status=running"', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.includes('valhalla');
  } catch {
    return false;
  }
}

export async function ensureValhalla(): Promise<void> {
  if (isValhallaRunning()) return;
  console.log('[opennavagent] Starting Valhalla container...');
  execSync('docker compose -f docker/docker-compose.yml up -d', { stdio: 'inherit' });

  const url = process.env.VALHALLA_URL ?? 'http://localhost:8002';
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${url}/status`);
      if (res.ok) {
        console.log('[opennavagent] Valhalla is ready.');
        return;
      }
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Valhalla did not become ready within 60 seconds.');
}

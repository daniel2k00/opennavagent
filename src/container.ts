import { execSync, spawn } from 'node:child_process';

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

/**
 * Kicks off Valhalla but does NOT block server startup waiting for tiles.
 * First-run tile builds for a whole country take 5–30 min; blocking here
 * would hide the HTTP server from the user for that entire period.
 * Instead we start Valhalla in the background and expose readiness via /healthz.
 */
export async function ensureValhalla(): Promise<void> {
  if (isValhallaRunning()) {
    console.log('[opennavagent] Valhalla is already running.');
    return;
  }

  console.log('[opennavagent] Starting Valhalla container in the background...');
  const child = spawn(
    'docker',
    ['compose', '-f', 'docker/docker-compose.yml', 'up', '-d'],
    { detached: true, stdio: 'ignore' }
  );
  child.on('error', () => {
    console.warn('[opennavagent] Could not start Valhalla. Run `npm run valhalla:up` manually.');
  });
  child.unref();

  console.log('[opennavagent] First-run image pull + tile build can take 5–30 min.');
  console.log('[opennavagent] Watch progress: npm run valhalla:logs');
  console.log('[opennavagent] Check readiness: curl http://localhost:3000/healthz');
}

/**
 * Non-blocking readiness check used by /healthz. Short timeout so a slow
 * Valhalla doesn't make the health endpoint itself hang.
 */
export async function isValhallaReady(): Promise<boolean> {
  const url = process.env.VALHALLA_URL ?? 'http://localhost:8002';
  try {
    const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

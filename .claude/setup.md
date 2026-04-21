# /setup — First-time OpenNavAgent setup

You are Claude/Cursor helping a user set up their OpenNavAgent fork for the first time.
Do the following in order. After each step, confirm success before moving on.

## 1. Preflight

- Run `node --version`. Require ≥ 20. If not, tell the user to install Node 20+ and stop.
- Run `docker --version`. If not installed, instruct the user and stop.
- Run `docker compose version`. If not available, same.

## 2. Dependencies

- `npm install`

## 3. Environment

- If `.env` does not exist, copy from `.env.example`.
- Ask the user which model they want to use:
  - `anthropic:claude-sonnet-4` (default)
  - `openai:gpt-4o-mini`
  - Something else (let them type it)
- Ask for the matching API key and write it into `.env`.

## 4. Region selection

- Ask which region they want maps for. Default: Israel.
- If they pick a different region, update the `tile_urls` line in `docker/docker-compose.yml` to a URL from https://download.geofabrik.de/.
- Warn them that larger regions (e.g. "europe") can take hours to process and need 50+ GB of disk.

## 5. Start Valhalla

- `npm run valhalla:up`
- Poll `http://localhost:8002/status` every 10s. On first run, Valhalla downloads and builds tiles — this can take 5–30 minutes for Israel, longer for bigger regions. Tell the user what's happening.
- Once it responds 200, proceed.

## 6. Smoke test

- `npm run dev` in one terminal.
- In another, send a test request:
  ```bash
  curl -s -X POST http://localhost:3000/route \
    -H "Content-Type: application/json" \
    -d '{"text":"drive from 32.0853,34.7818 to 32.7940,34.9896"}' | jq
  ```
- Confirm the response has `intent`, `route`, and `explanation`.

## 7. Next steps

Tell the user:
- Their OpenNavAgent is running. They can now add skills like `/add-coastal-routing`.
- The codebase is small (~350 lines). They can ask Cursor to explain any part.
- Encourage them to read `CLAUDE.md` for the architecture.

## If something fails

- For Docker issues: show `npm run valhalla:logs` output and diagnose.
- For API issues: verify the key in `.env` with a direct test (e.g. `curl` to the provider).
- Never silently work around a failure. Report it and ask the user.

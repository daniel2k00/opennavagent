# Changelog

All notable changes to OpenNavAgent are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.1.0] — 2026-04-21

### Added
- Core orchestrator (`navigate()`) that chains intent parsing and routing.
- HTTP server (Hono) with `POST /route`, `GET /healthz`, `GET /skills`.
- CORS enabled by default so browser clients can call the server directly.
- Skill system (`src/skills.ts`) with three hooks: `intentPrompt`, `transformRoute`, `resolveLocation`.
- Per-skill error isolation: one bad skill does not take the server down.
- Non-blocking Valhalla startup — server boots immediately, `/healthz` reports readiness.
- LLM is asked by default to emit `"lat,lon"` for known places, so the core works out of the box.
- Model-agnostic LLM integration via `@ai-sdk/anthropic` and `@ai-sdk/openai`.
- Shipped skill playbooks:
  - `/setup` — first-time Docker + `.env` + Valhalla bootstrap.
  - `/add-coastal-routing` — "along the sea" preference.
  - `/add-mood-routing` — chill / focused / adventurous / romantic / safe.
  - `/add-shelter-routing` — wartime routing through OSM public shelters.
  - `/add-geocoding` — Nominatim resolver for address-based routing.
- Apache 2.0 license.
- Vitest-based test suite with schema and skill-contract tests.
- GitHub Actions CI (typecheck + tests + build on Node 20).

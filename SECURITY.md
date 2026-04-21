# Security Policy

## Reporting a Vulnerability

If you find a security issue in OpenNavAgent, **please do not file a public GitHub issue.**

Instead, email **daniel2k00@users.noreply.github.com** with:

- A short description of the issue.
- Steps to reproduce, or a proof-of-concept.
- The version / commit SHA you tested against.

You'll get an acknowledgment within **3 business days**. We aim to ship a fix or mitigation within **30 days** of report, sooner for actively-exploited issues.

## Supported Versions

Only the `main` branch and the latest tagged release are supported with security fixes. OpenNavAgent is a thin orchestrator — most security surface lives in transitive dependencies (Valhalla, the LLM SDK, Hono). Keep those updated.

## Scope

In scope:

- Code execution, auth bypass, or privilege escalation in `src/`.
- Leaks of user API keys or request bodies via logs or error messages.
- Prompt-injection attacks that can pivot to destructive Valhalla requests.

Out of scope:

- Skills installed from untrusted `.claude/*.md` playbooks. Skills run with full Node privileges — treat every skill as you would treat any npm package.
- DoS via a single request to `/route` (Valhalla is heavy by design).
- Issues in public Overpass / Nominatim instances.

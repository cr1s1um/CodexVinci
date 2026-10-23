# Contributing to CodexVinci

Work on a feature branch and open a pull request with the problem, behavior change and test evidence. Keep changes focused. Do not commit personal notes, exports, credentials or generated browser artifacts.

Install test dependencies with `npm ci`. Run `npm run check` and `npm test` before submitting. HTTP tests start a loopback server on port 4173: stop the development server first. Browser validation is separate; follow README.md and report the exact browser/platform tested. Never describe skipped tests as passing.

User content must not enter innerHTML. Validate imported archives before persistence. Preserve IDs and add an explicit migration when changing the archive schema. Test conflict, failure and backup behavior for persistence changes. A successful write must precede a saved status.

Discuss major architecture decisions in an issue and update docs/ARCHITECTURE.md. The current implementation is a spike: do not add cloud sync or credentials without defining the trust model first.

MVC is required. Models must not depend on DOM/browser storage globals; Views must not access persistence or mutate domain state; Controllers orchestrate actions through the Model and injected ports. Wire browser capabilities in src/app.mjs. Keep repository adapters in infrastructure. Add headless controller regression tests for workflow changes and update the HTTP allowlist/service-worker cache whenever modules change.

Persistence changes require `npm run test:browser` after installing the Playwright Chromium build. Tests launch their own server. Commit package-lock.json; keep fake-indexeddb and Playwright as devDependencies only. Simulated transactions are not sufficient evidence for browser behavior.

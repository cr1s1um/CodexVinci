# CodexVinci roadmap

## 0.1 — Reproducible baseline
- [x] Pages and typed plain-text blocks
- [x] Tasks shared by table and board
- [x] JSON export/import and revision conflict checks
- [x] Domain/storage tests and HTTP integration test
- [x] GitHub Actions workflow definition
- [ ] Browser and offline tests executed successfully
- [ ] Safari/iOS device validation

## 0.1.3 — MVC foundation
- [x] Model, View and Controller separated with injected dependencies
- [x] Headless controller regression tests and all-module HTTP/cache checks
- [x] MVC ADR and product plan with acceptance gates
- [ ] Browser regression gate remains open

## 0.2 — Reliable editing
- [ ] Evaluate production block editors and AppFlowy reuse against the same scenario
- [x] Text autosave queue and per-tab session drafts (core tests passed; browser validation pending)
- [ ] Durable crash recovery and full pending-edit protection
- [ ] Transactional persistence with migration from v1 archives
- [ ] Accessible keyboard/touch interaction and undo

## 0.3 — Structured workspace
- [ ] Explicit collections, typed fields and record pages
- [ ] Table/board views with shared filters and sorting
- [ ] Joplin import with attachment/link mapping and conversion report

## Later
- [ ] Self-hostable device synchronization and documented conflict protocol
- [ ] Google Tasks connector, then Calendar time blocking
- [ ] Desktop and mobile packaging after editor/platform gates

See docs/BACKLOG.md for acceptance criteria. These targets are not a delivery-date commitment.

Product scope and development phases: [docs/PRODUCT-PLAN.md](docs/PRODUCT-PLAN.md).

# GO Tracker
- [ ] Prevent stale-tab writes with exclusive browser locks and storage snapshot checks.
- [ ] Make legacy migration non-destructive and detect late legacy changes without automatic merging.
- [ ] Verify persistence, continuity, history and conflicts with automated tests and isolated browser flows.
- [x] Safely migrate local monthly data to dated persistent habits; legacy keys retained untouched.
- [x] Preserve calculations and add start/end date controls.
- [x] Rename header and metadata without redesign; workspace project name is not available through current tools.
- [x] Verify migration, month navigation, history, refresh and calculations: 19 tests and browser flow passed on isolated October fixtures; user's browser-local records cannot be inspected here.
# Continuation checkpoint (INTERMEDIATE package — not the final P4 deliverable)
Done in this pass: data expansion to all six targets with checks; real-data verification of search, filters, sorting, and occupation→training links. Next planned phase: **HE-02**.
## Next concrete step: HE-02 (edit search on the results screen)
1. In `app.js`, find the job search form markup inside `jobs()` and extract it into `jobForm(c)` (same field names as `defaults.jobs`, same disclosures). Render it unchanged in `jobs()`.
2. In `results()`, render `jobForm(S.jobs)` in a collapsible panel above the list (keyword, location, radius always visible; the three disclosure groups for the remaining filters), using the single `S.jobs` draft so home, detailed search, and results cannot drift. Make element IDs unique per placement.
3. Keep the existing submit path (`kind="jobs"`): validate, then copy draft → `S.jobApplied`, update count, summary, and list together; invalid input must leave `S.jobApplied` untouched. Document Reset in one place.
4. Keep the pending-change message and the retained selection logic (C-03). Add stubbed-DOM tests (a FormData stub) for draft-versus-applied, invalid input, unchanged vs changed resubmission.
## Remaining after HE-02
HE-07 location help text; HE-09 shared field renderer + application-method row; HE-04/05/06/08 remainder; original-site restoration (alphabetic directory, provider filters where data supports them, menu entries for peripheral services); real-browser verification of VALIDATION.md §4.

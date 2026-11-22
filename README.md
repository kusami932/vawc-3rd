# Virginia Works — revised P4 prototype (HE-02 … HE-09 build)

**Status.** HE-02, HE-04, HE-05, HE-06, HE-07, HE-08 and HE-09 are implemented, and checked by 469 executed automated checks: 180 + 175 in Node with a stubbed DOM, and 114 in real Chrome. This is **not** the final P4 deliverable: broader original-site restoration is outstanding (ORIGINAL-SITE-MAPPING.md), and checks in other browsers, with assistive technology and on GitHub Pages are still pending (VALIDATION.md section 6). No usability improvement is claimed or measured.

Derived from the ICA8 baseline (kusami932/vawc-prototype @ 4c66e53c437a87f4bd3e850cc4f3005cd7bbfecb). Static HTML/CSS/JS: no backend, framework, API key or build step; relative paths; hash routing. All organizations, programs and vacancies are fictional demonstration records.

## Run, test, deploy
- Preview: `python3 -m http.server 8000`, then http://localhost:8000/ .
- Tests (three files, all executed for this package; see VALIDATION.md):
  - `node tests/smoke-test.js` — 180 checks, stubbed DOM (data, search, sort, routes, six dataset targets).
  - `node tests/he-test.js` — 175 checks, stubbed DOM (HE-02 … HE-09 behavior, static CSS/source checks, regressions).
  - `node tests/browser-test.mjs` — 114 checks in real Chrome through Playwright. It starts its own static server. It needs Playwright and Chrome (`CHROME_PATH` or `/usr/bin/google-chrome`).
- Regenerate data (optional, deterministic): `python3 tools/build-data.py`. `data.js` is unchanged since intermediate-3.
- Deploy: add all files to a NEW repository or branch (index.html at the root, `.nojekyll` included) and enable Pages from the branch root. Do not overwrite the baseline repository.
- Evaluator page: `evaluator/index.html` (reset button, manual checks). It is intentionally not linked from any participant page, menu or footer.
- Storage key `vawc-p4-revised-v1` (the baseline uses `vawc-p4-v1`; it is never read or written).

## How the search state works (documented behavior)
Each search kind keeps its own **draft** (what the form shows) and **applied** copy (what the results show): jobs, training providers, training programs. Occupation exploration keeps a separate applied *area*.
- Editing a control changes only the draft. Results, counts and the "Applied:" summary stay on the last applied search, and a "Changes not applied" message appears.
- **Update results** (or Enter in any field of the form) validates and applies the draft. Invalid input is refused with an explanation; the typed value is kept and the previous results stay.
- Reset criteria, Remove occupation condition and Remove provider filter change the draft only.
- **Unapplied drafts during navigation:** they are saved with the rest of the state, survive opening details, application information, Back/Forward and a page reload, and are never applied automatically. The results screen keeps showing the last applied search with the pending message until the user chooses Update results.
- Contextual links (Find related jobs, Explore training, View programs from this provider) start a new search from the **last applied** search, not from the draft; they replace only the conditions they name, list the conditions they kept, say when unapplied edits were not carried over, and offer "Search with only the new condition".
- Jobs, providers and programs searches never overwrite one another.
- Comparison selections (at most two) survive details, application pages, Back/Forward, reload, sorting, draft edits and an unchanged re-apply. When a newly applied search excludes a selected job, that job is removed and the page says which ones, by name.

## Geography (what each location means)
- Jobs: **job location** is the center of the job search; the radius (default 25 miles) is the straight-line distance between approximate city-center coordinates. It is not driving or commuting distance and is used only when a location is entered. Blank or "Virginia" means all Virginia.
- Providers: **provider location** is where the organization is based (exact city match, no radius).
- Programs: **training location** is where the program is delivered (exact city match). It can differ from the provider's location; both are shown and the difference is flagged.
- Occupations: duties, skills and preparation are **general** and the prototype holds no regional wage or demand data. The chosen area is used only to set the job-search center and the training delivery city for Find related jobs / Explore training, and it stays visible and editable there.

## AI assistance and assumptions (for the P4 report)
Claude (Anthropic) patched the supplied baseline snapshot over five passes, wrote the tests, and ran the browser checks. The comparison document (Korean, `P4_Original_ICA8_Comparison.docx`) was read; Claude did not inspect the original website, so original-site statements in ORIGINAL-SITE-MAPPING.md are the document's. Occupation→program links, the Best match scoring rule and the comparison wording are authored design decisions. The later P3 Revision wireframes and Visual Compositions were not used.

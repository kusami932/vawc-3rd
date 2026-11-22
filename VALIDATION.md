# Validation record — pass 5 (HE-02 … HE-09 build)

Environment: Node v22.23.5; Chrome 153.0.8010.12 (headless, via `/usr/bin/google-chrome`); Playwright 1.63.0; Linux container. A stubbed DOM in Node is **not** a browser; the two layers are reported separately. No usability improvement is claimed or measured.

## 1. Executed automated checks (stubbed DOM, Node)
| Command | Result |
|---|---|
| `node tests/smoke-test.js` | **180 / 180** (174 functional + 6 dataset acceptance) — unchanged from intermediate-3 |
| `node tests/he-test.js` | **175 / 175** — HE-02 43, HE-04 29, HE-05 13, HE-06 9, HE-07 21, HE-08 17, HE-09 23, STATIC 10, REGRESSION 10 |
| Node subtotal | **355 / 355** |
| Node + browser (section 2) | **469 / 469** (180 + 175 + 114) |
STATIC checks read the stylesheet/source text (relative font sizes, focus rule, cursor and hover rules, stacked-comparison rule, masthead min-height, independently computed WCAG contrast for 25 colour pairs). They are not behavior tests. Expected values come from the controlled fixture (`tests/fixture-data.js`) and hand-derived numbers (for example 40000 ÷ 2080 = 19.23, 44000 ÷ 2080 = 21.15; Chesterfield→Richmond 11.9 miles), or from independently written code; never from calling the function under test.

## 2. Executed browser checks (Chrome via Playwright)
`node tests/browser-test.mjs` — **114 / 114** in the final run (it also passed four consecutive runs earlier in the pass, after a navigation-timing race in the script was fixed). The script starts its own static server and writes nothing to the repository.
| Group | Checks | What it covers |
|---|---:|---|
| TASK-FLOWS | 18 | A explore an office occupation (second listed, not a fixed title); B Richmond provider search → provider → programs; C keyword + Richmond, preferences applied without silent filtering, two jobs compared; D application page → back to details → back to results with selections and comparison intact. Counts are checked against independent haversine/filter code. |
| HE-02 | 20 | Typing leaves results unchanged; Enter = Update click; focus after update; unsupported location and invalid pay; zero-result recovery; keyboard Reset; inherited occupation removal; programs flow |
| HE-04/05 | 17 | Checkbox vs title vs card clicks; cursors; keyboard on title and checkbox; third selection refused; hover states; details do not lose the comparison; remove / replace; exclusion by a new search |
| HE-04 history | 14 | Back/Forward across results → details → application; draft survives Back and reload; unchanged re-apply; page and list scroll restoration; separate searches; occupation → training |
| HE-07 | 10 | Area by Enter; related jobs count = independent haversine count; editable condition; Explore training delivery city; unsupported area; provider vs training location flags; locations dialog |
| HE-08 | 13 | Text size scales root/h1/small by 1.25, persists, restores; Escape returns focus; peripheral notice and return focus; first 14 tab stops show an outline; skip link; heading levels in the live DOM |
| RESPONSIVE | 8 | 90 layouts (5 widths 1280/1024/768/390/320 × default/larger text × 9 screens): no sideways scroll, no overlapping controls, masthead not clipped, Update button on screen; comparison stacked and labeled at 320 px larger text; table fits at 1280 px larger text |
| ALT-NAV | 8 | Menu links; footer Home; Home → occupations → training → provider; Back; peripheral tab notice closed with Escape; Detailed job search |
| EVALUATOR+HYGIENE | 5 | No participant link to the evaluator page; unknown route; only the revised storage key; evaluator reset clears only that key; no 404 requests (including favicon) |
| HEALTH | 1 | No console errors/warnings, page errors or failed requests in any page opened by the run |

## 3. Does the suite detect faults? (mutation checks, executed ad hoc; scripts not packaged)
- Node suites: 30 deliberate code/CSS faults (draft applied immediately; validation removed; reset clears applied; contextual link drops kept conditions; upper-bound treated as full; unknown pay treated as meeting; compare limit removed; selections not pruned; unchanged re-apply clears selections; text size not restored; real URL on apply page; submission claim; title not a button; card made clickable; checkbox opens the job; area ignored; provider label dropped; program flag dropped; missing pay shown as $0; unknown schedule shown as Daytime; "Recommended" wording; empty results lose the form; px font sizes; fixed masthead height; low-contrast colour; pointer cursor on cards; a peripheral entry removed; remove-compare keeps the comparison open; wrong hint counts). All 30 were caught. One (fixed masthead height) first survived because a media-query rule satisfied a weak regex; the check was tightened and then caught it. Two were caught by a crash rather than an assertion.
- Browser suite, batch 1 (9 faults): scroll restoration removed, larger text not scaling, sort select overflow, initial-load focus theft, selection dropped on opening details, draft discarded on navigation — all caught. Two mutants were invalid (one pattern did not apply; one "clickable card" mutant was inert because no handler acted on it). One real gap: the stacked-comparison label check passed when the label rule was missing (`content: none` has four characters); it now requires the computed content to include the job text.
- Browser suite, batch 2 (10 faults, after the fixes above): 8 caught (update button not a submit button; whole card clickable; stacked-cell labels removed; stacked display rule removed; focus outline removed; related jobs ignore the chosen area; validation message dropped; Reset criteria submits the form). 2 survived the first run, and both were re-run in isolation to confirm they were real runs (113/113 passed with the fault in place):
  - *Ticking a checkbox also opens the job* — a **real gap in my test**: it identified the open job by its title, and the first two listings in that search share a title ("Administrative Assistant"). The test now compares the whole details panel (title, employer, pay, ...; the selection counter inside the panel is excluded because it legitimately changes) and the "Shown in details" flag, and has one extra set-up check. With the stronger test the fault is caught by 3 checks, and the unmutated app passes 114/114. (My first version of the stronger test included the counter and failed on the correct app; that was a test mistake and was fixed rather than accepted.)
  - *Escape does not return focus to the opener* — **not detectable in Chrome**: closing a native dialog returns focus to the previously focused element by itself, so removing the app's own `focus()` call changes nothing observable. The check "closing the dialog with Escape returns focus to the control that opened it" therefore verifies the outcome in Chrome, not that the app's own code produced it. The explicit call is kept for browsers that do not restore focus; that is unverified there (see section 6).

## 4. Corrections made during this pass (test wrong vs implementation wrong)
Implementation was wrong (fixed): hidden screen-reader text in the scrolling job list stretched the page to ~8,900 px; the facts grid showed an empty shaded cell; `/favicon.ico` 404 on the app and on the evaluator page; the sort dropdown overflowed at 320 px with larger text; focus was moved into `main` on first page load, so the skip link was not the first tab stop; comparison unreadable at narrow widths with larger text (now stacked); empty `class=""` attributes; "1 matching programs" grammar; two baseline labels were renamed by mistake and restored ("Search by education", "Search by job number"); "Return Home" vs "Return to Home".
Test was wrong (fixed, expectation not weakened): a button-count threshold (3, not >3); card slices that included the rest of the page; first shown job assumed F1 (blank keyword shows the most recent, F6); Playwright `check()` on a checkbox the app correctly refuses; a click that collapsed the occupation group it meant to use; overlap probe counted controls inside closed details; navigation races (clicks followed too early by assertions; fixed with a settle wrapper and URL waits); two weak assertions (see section 3).

## 5. Static / code review only (not executed in any browser)
`aria-live` announcement wording; the `role` attributes added to the comparison table so it stays a table when stacked; reduced-motion (no animation is used); print styles (none).

## 6. Pending manual checks (not run)
1. Screen readers (NVDA, VoiceOver, TalkBack): announcements after Update results, validation errors, selection changes, text-size changes; the stacked comparison; the not-implemented notices.
2. Firefox and Safari (including whether a closed dialog returns focus to its opener); real phones and tablets (touch targets, virtual keyboard with the results form).
3. Browser zoom at 200% and 400%; Windows forced-colors / high-contrast mode.
4. A deployed copy on GitHub Pages in a new repository or branch (relative paths, `.nojekyll`).
5. Whether participants understand the draft-versus-applied wording ("Changes not applied", "Update results") — a usability question, not tested here.

## Appendix A. Detail of the 180-check suite (`tests/smoke-test.js`, unchanged since intermediate-3)
Commands: `node --check app.js`, `node --check data.js`, `node --check tests/smoke-test.js`, `node tests/smoke-test.js`, and `python3 tools/build-data.py` followed by a byte comparison of `data.js`.
Final run of `node tests/smoke-test.js`:
```
FUNCTIONAL: 174 passed, 0 failed (of 174)
DATASET-ACCEPTANCE: 6 passed, 0 failed (of 6)
TOTAL: 180 passed, 0 failed (of 180)
```
One consistent set of totals applies to this package: 180 checks = 174 functional + 6 dataset-acceptance. (Earlier packages reported "29" and "43": both were counts from the same earlier run, 29 excluding 14 route-render checks and 43 including them. They are superseded and not comparable to 180.)
Functional checks cover, with expectations written by hand (not produced by calling the function under test):
- A controlled six-job fixture (`tests/fixture-data.js`, distances from simple latitude arithmetic): radius 0/5/10/25/50/75 mi, blank and unsupported locations, minimum pay on range upper end (hourly and annual), unknown-pay inclusion, strict daytime/evening and unknown schedules, employment type, posted-within 1/7/30 days, occupation/education/source/arrangement filters, keyword matching, combined filters, and recent / pay / Best match ordering including ties and input-order independence.
- Real dataset integrity: unique IDs; provider↔program↔occupation references; jobs' occupation references; every location supported; required display fields; recognized enumerations; numeric pay, cost, coordinate, and date values; no duplicate jobs or descriptions; original records unchanged and new IDs contiguous; genuine unknown pay (J02, J16, J34, J54) and unknown schedule (J02, J17, J20, J22, J34, J67) preserved.
- Variety and richness (types, schedules, pay forms, radius inside/outside, mismatch kinds, several plausible admin candidates across employers/occupations/cities, Richmond providers with and without admin-related programs).
- Scenarios on the real data: nearby-city sets at 25 and 75 miles, receptionist search, an "administrative assistant" search narrowed step by step with expected sets, Best match order, property checks that Best match follows the documented rule with no identity boost, pay/recent sort properties, provider and program filters, occupation→program sets for eight occupations, empty results for occupations with no programs, no-result searches and recovery.
- Stubbed-DOM UI: 24 route renders (including missing records), every occupation/provider/program/job/apply route renders, apply pages show each job's own application method and "no application" text, unknown pay/schedule shows "Not provided", occupation→training chip and counts, draft-only removal of the chip, fresh-session neutrality, no task-specific placeholders, evaluator reset touches only the revised key, evaluator page not referenced by participant files, storage key separation, no clock/randomness, no hard-coded record IDs or benchmark wording in app.js.
- Dataset acceptance (the six targets, counting unique usable records): occupations 40 (≥40), groups 11 (≥10), providers 16 (≥16), Richmond providers 7 (≥6), programs 28 (≥24), jobs 80 (≥80).
Mutation checks (executed ad hoc in a scratch copy; not scripted in the repository): each fault below was injected and the suite failed as shown — M1 move J11 out of Richmond: 4; M2 boost O01 in Best match: 4; M3 drop O04 from P13: 2; M4 move T10 out of Richmond: 3; M5 unknown pay sorted first: 3; M6 radius ignores distance: 12; M7 duplicate job ID: 13; M8 fill unknown pay on J16: 1; M9 fill unknown schedule on J02: 2; M10 alter baseline J05: 2; M11 schedule filter admits unknown: 4; M12 occupation chip not carried to training: 5.
Substantive corrections made during this pass:
1. A hand-derived expectation (HR assistant jobs J21/J22 in an "administrative assistant" search) disagreed with the first generated data. The data was wrong (the "administrative" keyword was omitted for O01/O02/O03/O06 jobs); the generator was fixed, the expectation was kept.
2. The earlier expectation that occupation O04 links to 2 programs was updated to 4 (P02, P04, P13, P19) because P13 and P19 were deliberately authored as bookkeeping/payroll-relevant; the new list was hand-checked against the authored relationships, not copied from output.
3. Self-review found two weak tests (an `&& true` and a `>= 0` comparison) and an incorrect claim in a test name ("all programs listed" on a fresh page, which actually shows none until a search); all were replaced with specific assertions.
4. The first mutation run showed three "0 failures" that were caused by `sed` patterns not matching, and one real gap (no assertion that unknown pay stays unknown); the patterns were fixed and the missing tests added.
5. Code review found a pass-1 regression: the occupation-group filter placeholder read "Program title"; it now reads "Group name" (and "Occupation title or keyword" for name search), with a test.

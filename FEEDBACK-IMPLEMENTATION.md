# Feedback implementation — HE tracking labels

HE-01 … HE-09 are tracking labels from the ICA8 evaluator feedback; they are not P2/P3 finding IDs. INSTRUCTOR = omitted functionality / task too easy. AUDIT = source or original-site findings. No evaluator comment, severity, test result or measured improvement is invented here. Nothing below is a usability result.

For every item: **(1)** implemented behavior, **(2)** executed automated checks (stubbed DOM, Node: `smoke-test.js` 180 + `he-test.js` 175), **(3)** executed browser checks (`browser-test.mjs`, Chrome 153, 114 checks), **(4)** remaining limitations or manual checks.

## Status table
| Item | Implemented | Automated checks | Browser checks | Remaining |
|---|---|---|---|---|
| HE-02 results-page editing | Yes | 43 | 20 + task flows | other browsers, screen reader |
| HE-04 navigation / comparison context | Yes | 29 | 14 history + 17 | other browsers; draft-vs-applied wording not user-tested |
| HE-05 interaction affordances | Yes | 13 | 17 | touch devices, screen reader |
| HE-06 application clarity | Yes | 9 (all 80 jobs) | task flow D | none beyond manual list |
| HE-07 geographic scope | Yes | 21 | 10 | original-site geography behavior not verified |
| HE-08 consistency / text size | Yes | 17 + 10 static | 13 + responsive 8 | browser zoom 200–400%, Windows high contrast |
| HE-09 comparison under uncertainty | Yes | 23 | 17 + task flow C | none beyond manual list |

## HE-02 — edit criteria on the results screen
1. **Implemented.** Shared `jobForm` on Find jobs and results; keyword, job location and radius always visible; **Update results**; three labeled disclosure groups for secondary criteria; draft vs applied with pending pill/message; validation that keeps input and explains; empty-result recovery with counts; Reset / Remove occupation / Remove provider are draft-only; Enter submits exactly like the button (the only submit button in the form); homepage entry point kept; same pattern on provider and program searches.
2. **Automated.** Pending/up-to-date text and counts; clearing and removal leave results alone; invalid location/pay/cost refused with the message and field; hints with hand-computed counts; alias equivalence ("basetown" = "Basetown, VA"); one submit button per form; homepage submit.
3. **Browser.** Typing leaves results unchanged; Enter and click give the same result; focus stays on Update; invalid location keeps the value, sets aria-invalid and focuses the field; invalid pay; zero results show the form and a hint; hint edits the form only; keyboard Reset does not submit; inherited-occupation removal; programs flow.
4. **Remaining.** Screen-reader announcement wording not tested with real assistive technology.

## HE-04 — preserve context
1. **Implemented.** See README "How the search state works". Draft behavior is documented there.
2. **Automated.** Selections and applied search survive details/apply/results; draft survives navigation and reload; excluded selections removed with a named note; unchanged re-apply keeps them; third selection refused; back-link wording and presence; searches stay separate; contextual-link kept-list, fresh-start and discarded-draft message.
3. **Browser.** Back/Forward across results → details → application and back again (URL, summary, count, selections, comparison view); draft survives Back and reload; unchanged re-apply keeps selections; scroll positions of page and job list restored (±8 px); a providers search leaves the job search alone; occupation → training leaves jobs alone.
4. **Remaining.** Restoration depends on browser Back/Forward, not on a saved history stack; behavior in Safari/Firefox untested.

## HE-05 — accurate affordances
1. **Implemented.** Title = link-styled button; "View job details" = secondary button; independent checkbox; cards are not styled as clickable; hover and focus states.
2. **Automated.** No handler/role/tabindex on the card; nothing interactive nested; checkbox change does not change the detail; accessible names; provider/program card titles are links; static CSS (cursor, hover rules).
3. **Browser.** Checkbox click does not open the job; clicking card background does nothing; cursor default on card and pointer on title; title opens details; Enter on title; Space on checkbox; hover changes; third checkbox refused and explained.
4. **Remaining.** Touch behavior and screen readers untested.

## HE-06 — application methods and boundaries
1. **Implemented.** Per-job page: method; destination labeled simulated; employer general website separate ("Not provided"); explanation of employer-site vs account process; boundary callout first; actions labeled "not available" (they open a not-implemented notice); no URL; no data entry; no claim of submission; back to job and results/comparison.
2. **Automated.** All 80 application pages for method, separation, simulation, boundary, no real URL, no form fields, no submission claim, every action "not available", back link; both methods present.
3. **Browser.** Task D: from the comparison to the application page, back to details, back to results with selections intact; no inputs or external links.
4. **Remaining.** None known.

## HE-07 — geographic scope
1. **Implemented.** See README "Geography". Occupation area drives related jobs and training; applied area shown; general-information label; provider vs training location; radius/exact-city help; no regional statistics.
2. **Automated.** Area effects with hand-derived and independently computed sets (Chesterfield 25 miles; Henrico delivery city); unsupported area refused; empty result with recovery; no wage/demand numbers on any of the 40 profiles; provider/program labels and flags; straight-line wording.
3. **Browser.** Area by Enter; Find related jobs count equals the independent haversine count; the condition is in the editable field; clearing it widens to all Virginia; Explore training uses the delivery city; unsupported area; every differing program flagged; locations dialog.
4. **Remaining.** The original site's geographic behavior is not verified (document only).

## HE-08 — consistency, hierarchy, text size
1. **Implemented.** See CHANGELOG C-23.
2. **Automated.** One h1 and no skipped heading levels on 13 screens; aria-pressed / aria-current present; one wording for equivalent labels; independently computed WCAG contrast for 25 colour pairs; no px font sizes; focus rule; text-size state, persistence and restore.
3. **Browser.** Root, h1 and small text each scale by 1.25; persists after reload; Restore returns original sizes; Escape returns focus to the opener; the first 14 tab stops show a ≥2 px outline; skip link first; headings in the live DOM; 90 layout combinations (5 widths × default/larger text × 9 screens) with no sideways scroll, overlap, masthead clipping or off-screen Update button; comparison stacked and readable at 320 px with larger text.
4. **Remaining.** Browser zoom (200–400%), Windows forced-colors, other browsers.

## HE-09 — comparison under uncertainty
1. **Implemented.** See CHANGELOG C-24.
2. **Automated.** Row order; pay range/period/hourly equivalent hand-computed (40000 ÷ 2080 = 19.23; 44000 ÷ 2080 = 21.15); unknown pay/schedule remain "Not provided" with notes; minimum-pay row only when applied; whole-range vs upper-end-only vs below vs unknown at hand-derived thresholds (including equality and annual minimums); no best-choice wording; remove/replace flow.
3. **Browser.** Aligned rows in the real table; remove then replace; details and Compare tab keep both selections; stacked cells carry job labels; task flow C.
4. **Remaining.** None known beyond the manual list.

## Other requirements
| Item | Source | Status |
|---|---|---|
| Dataset expansion (six targets) | INSTRUCTOR | Done in pass 3; unchanged. 40/11/16/7/28/80. |
| Meaningful sorting | INSTRUCTOR/AUDIT | Done; unchanged logic; verified in browser flows. |
| Reference-date handling | INSTRUCTOR | Done; no clock use. |
| HE-01 occupation → training | HE | Kept; context now respects the chosen area. |
| HE-03 remove task guidance | HE | Kept; no benchmark wording; no bolded task-leading links. |
| Original-site mapping & restoration | INSTRUCTOR/AUDIT | Mapping updated; **restoration outstanding** (ORIGINAL-SITE-MAPPING.md). |
| Evaluator materials separated | HE-03/AUDIT | Kept; reset verified in browser; not linked from participant pages. |

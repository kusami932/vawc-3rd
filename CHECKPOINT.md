# CHECKPOINT — after pass 5 (HE-02 … HE-09 implemented and browser-checked)

HE-02, 04, 05, 06, 07, 08 and 09 are implemented and checked (VALIDATION.md). The overall P4 deliverable is **not** final.

## Outstanding (exact list)
1. **Original-site restoration** — the explicit list is in ORIGINAL-SITE-MAPPING.md ("Outstanding original-site options"). Only a notice and return path exist for those entries.
2. **Checks not yet run** (VALIDATION.md section 6): other browsers (Firefox, Safari), real phones/tablets, screen readers, browser zoom at 200–400%, Windows forced-colors, GitHub Pages deployment of a copy.
3. **Known limitations**: radius and training location are approximations (straight-line between city centers; exact-city match for training); application destinations are simulated and no employer URLs exist; job duties for the 70 generated jobs are inherited from the occupation; displayed posting ages are fixed to the 2026-11-20 reference date; Back/Forward restores context from saved state, not from a history stack.
4. **Evidence of improvement**: none claimed or measured; this needs the usability study.

## Next concrete step
Run the manual checklist in `evaluator/index.html` and VALIDATION.md section 6 on a deployed copy (new repository or branch), then decide which outstanding original-site options (item 1) to restore.

# Original-site mapping (updated for pass 5)
Original-site facts come from the supplied comparison document (direct observation dated 2026-11-20 as reported there); I did not inspect the site myself and claim no parity. Status: preserved / restored / peripheral notice / not verified / not restored.
| Original option | Baseline counterpart | Revised counterpart | Status | Limitation |
|---|---|---|---|---|
| Quick Search, By Keyword | "Search by occupation name" tab | same | preserved (equivalence assumed) | Distinction between the two originals not verified |
| By Group | "Browse occupation groups" tab | same | preserved | 11 groups, 40 occupations |
| Listing + alphabetic nav | "Occupation directory" tab | same | preserved | Alphabetic navigation not restored |
| By Education Program / Military Specialty / Occupation Code / License | disclosure buttons → notice | same | peripheral notice | |
| Geographic selection | "Area" input, label-only | "Area for related jobs and training" input with an Applied-area label; drives related jobs and training | restored as a working control (scope limited to those two links) | The original's own geographic behavior is not verified; occupation content stays general and no regional statistics exist |
| Bright Outlook, Green | none | none | not restored | |
| Provider Search / Listing; area; keyword; type | provider form | same | preserved | 16 providers (7 in Richmond) |
| Ownership, WIOA | notices | same | peripheral notice | |
| Location type, Green | none | none | not restored | |
| Job Standard | Job search tab + form | same | preserved | |
| Job Advanced | "Detailed job search" form | same | preserved (correspondence assumed) | Include/exclude keywords, employer, job-order options not restored |
| Intelligent | none | none | not restored | |
| Employer, Skills, Résumé | tabs → notices | same (tab-styled entries with a not-implemented notice and return path) | peripheral notice | |
| Education, Job Number | notices ("Search by education", "Search by job number") | same labels | peripheral notice | |
| Providers & programs | both searches + cross-links | same + occupation context | preserved | |
| Financial assistance, ETPL, Online learning, Education info/completer stats, Program Finder, Scholarship Finder | training-hub notices | same | peripheral notice | |
| Labor Market Facts, Register, language options; full service menu | not on home; Menu lists 6 paths | same | not restored; menu completeness not verified | |

## Changes in pass 5
No original-site option was deleted: the 20 Home entries, 7 training-page entries, 6 job-search entries, 4 occupation search methods, Ownership / WIOA filters, Dashboard, Alerts, Accessibility, Contact and Sign In are all still present (checked by `tests/he-test.js`, REGRESSION group, and in the browser). Each peripheral entry opens a "not implemented" notice that names the page you return to, states that searches and selections are unchanged, and links to Home. Only the geographic selection changed status (above).

## Outstanding original-site options (explicit list — none is implemented; full parity is NOT claimed)
1. Occupations: By Education Program, By Military Specialty, By Occupation Code, By License (notice only); alphabetic navigation in the directory; Bright Outlook and Green filters; the distinction between Quick Search and By Keyword (not verified); occupation geographic behavior beyond related links.
2. Providers: Ownership and WIOA eligibility filters (notice only); Location type and Green filters.
3. Jobs: Job Advanced options (include/exclude keywords, employer, job-order options); Intelligent search; Employer search, Skills & résumé matching, Search by education, Search by job number (notice only); Other job sites; Jobs outside Virginia (notice only).
4. Training hub: Financial assistance, Scholarships, ETPL-approved programs, Online learning resources, Program Finder, Education profile information, Program completion statistics (notice only).
5. Home and shell: the 20 service entries (résumé, employer services, labor market information, workforce resources, veterans services), Dashboard, Sign In, Contact, Labor Market Facts, Register, language options; the full service menu (the Menu lists only the six implemented paths).
6. Not verified against the live site: that the original's labels, ordering and behavior for the implemented parts match; this record relies on the supplied comparison document.

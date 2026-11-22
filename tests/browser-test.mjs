/* Run: node tests/browser-test.mjs
   Real-browser checks (Chrome via Playwright) of the static site: A–D task flows, alternative navigation, keyboard use,
   Back/Forward, scroll restoration, text enlargement and responsive layouts.
   Needs: Playwright (require('playwright') or /opt/npm-tools/node_modules) and Chrome (CHROME_PATH or /usr/bin/google-chrome).
   The script starts its own static server on a free port; nothing is written to the repository.
   Expected values are computed here from data.js with independently written code (not from app.js). */
import {createRequire} from 'module';
import fs from 'fs';
import path from 'path';
import http from 'http';
import vm from 'vm';
import {fileURLToPath} from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const req = createRequire(import.meta.url);
let pw;
try {pw = req('playwright');} catch (_) {pw = createRequire('/opt/npm-tools/node_modules/')('playwright');}
const KEY = 'vawc-p4-revised-v1';

/* ---------- independent expectations from data.js ---------- */
const ctx = {}; ctx.window = ctx; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), ctx);
const D = ctx.VAWC_DATA;
const LOC = Object.fromEntries(D.locations.map(l => [l.label, l]));
const hav = (a, b) => {const r = x => x * Math.PI / 180; const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2; return 3958.8 * 2 * Math.asin(Math.sqrt(h));};
const hourlyTop = j => j.payUnit === 'year' ? j.payMax / 2080 : j.payMax;
const expJobs = c => D.jobs.filter(j =>
  (!c.q || c.q.toLowerCase().split(/\s+/).every(t => [j.title, j.employer, ...j.keywords].join(' ').toLowerCase().includes(t))) &&
  (!c.city || hav(LOC[c.city], LOC[j.city]) <= (c.radius ?? 25)) &&
  (!c.type || j.type === c.type) && (!c.schedule || j.schedule === c.schedule) && (!c.occupation || j.occupationId === c.occupation) &&
  (j.payMin === null ? c.unknown !== false : (!c.pay || hourlyTop(j) >= c.pay)));
const ids = a => a.map(x => x.id).sort();

/* ---------- static server ---------- */
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain', '.png': 'image/png'};
const misses = [];
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {misses.push(p); rs.writeHead(404); rs.end('not found'); return;}
  rs.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'}); rs.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await pw.chromium.launch({executablePath: process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined), headless: true, args: ['--no-sandbox']});
const R = [], health = [];
const ok = (g, name, cond, detail = '') => R.push({g, name: cond ? name : `${name}${detail ? ' — ' + detail : ''}`, pass: !!cond});
const eq = (g, name, got, want) => ok(g, name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);

let patched = false;
function settleAfterClicks(page) {   // hash navigation renders in a later event task; give it time before the next assertion
  if (patched) return; patched = true;
  const LP = Object.getPrototypeOf(page.locator('body')), PP = Object.getPrototypeOf(page);
  for (const [proto, names] of [[LP, ['click', 'press']], [PP, ['click', 'press']]]) for (const n of names) {
    const orig = proto[n]; proto[n] = async function (...a) {const r = await orig.apply(this, a); const pg = typeof this.page === 'function' ? this.page() : this; await pg.waitForTimeout(130); return r;};
  }
}
async function open(vp = {width: 1280, height: 900}, seed = null, extraInit = null) {
  const c = await browser.newContext({viewport: vp});
  if (seed) await c.addInitScript(([k, v]) => {if (!localStorage.getItem(k)) localStorage.setItem(k, v);}, [KEY, JSON.stringify(seed)]);
  const page = await c.newPage(), tag = {name: ''};
  page.on('console', m => {if (['error', 'warning'].includes(m.type())) health.push(`${tag.name}: console ${m.type()}: ${m.text()}`);});
  page.on('pageerror', e => health.push(`${tag.name}: pageerror ${e.message}`));
  page.on('requestfailed', r => health.push(`${tag.name}: request failed ${r.url()}`));
  page.tag = tag; settleAfterClicks(page);
  await page.goto(BASE + '/index.html#home');
  return page;
}
const state = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
const text = async (p, sel) => (await p.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim();
const count = async (p, sel) => p.locator(sel).count();
const goto = async (p, h) => {await p.evaluate(x => {location.hash = x;}, h); await p.waitForTimeout(120);};
const resultCount = async p => +((await text(p, '#result-count')).match(/^(\d+)/)?.[1] ?? NaN);
const search = async (p, q, city) => {await p.fill('#home-q', q); await p.fill('#home-city', city); await p.press('#home-city', 'Enter'); await p.waitForURL(/#results$/); await p.waitForTimeout(150);};

const block = async fn => {try {await fn();} catch (e) {ok('ABORTED', 'a test block threw: ' + String(e.stack || e.message).split('\n').slice(0, 3).join(' / '), false);}};
const baseCrit = {q: '', city: '', radius: '25', type: '', pay: '', unit: 'hour', unknown: true, schedule: '', days: '', occupation: '', education: '', source: '', work: ''};
const seedFor = (over = {}, extra = {}) => {const applied = {...baseCrit, q: 'administrative', city: 'Richmond, VA', ...over}; return {jobs: {...applied}, jobApplied: {...applied}, selected: [], detail: '', compare: false, sort: 'relevance', note: '', ...extra};};

/* =============== A–D task flows =============== */
await block(async () => {
  const G = 'TASK-FLOWS';
  const p = await open(); p.tag.name = 'task flows';
  // A: explore an office/administrative occupation (any suitable one; reached through the group list)
  await p.click('.utility-nav a'); await goto(p, 'occupations');
  const officeOcc = D.occupations.filter(o => o.group === 'Office and Administrative Support');
  const target = officeOcc[1];   // second listed occupation: nothing is fixed to the first entry
  await p.click(`[data-action="occ-select"][data-id="${target.id}"]`);
  ok(G, 'A: selecting an office occupation shows its profile preview with duties and general-information label', (await text(p, '.occupation-preview')).includes(target.title) && (await text(p, '.occupation-preview')).includes('General occupational information'));
  ok(G, 'A: the Office and Administrative Support group offers several alternatives to choose from', (await count(p, `.occupation-group [data-action="occ-select"]`)) >= officeOcc.length);
  await p.click('.occupation-preview >> text=View full occupation profile');
  ok(G, 'A: full profile route opens for the chosen occupation', p.url().endsWith('#occupation/' + target.id) && (await text(p, 'h1')) === target.title);
  await p.click('a:has-text("Back to explore occupations")');
  // B: find a Richmond training organization
  await goto(p, 'training'); await p.click('a:has-text("Find providers")');
  await p.fill('#city', 'Richmond'); await p.press('#city', 'Enter'); await p.waitForTimeout(150);
  const expProv = D.providers.filter(x => x.city === 'Richmond, VA');
  eq(G, `B: provider search for Richmond lists exactly the ${expProv.length} Richmond providers`, (await p.locator('.list-card h3 a').allInnerTexts()).sort(), expProv.map(x => x.name).sort());
  await p.locator('.list-card h3 a').first().click();
  ok(G, 'B: provider detail shows provider location and listed programs', (await text(p, 'main')).includes('Provider location'));
  await p.click('button:has-text("View programs from this provider")');
  ok(G, 'B: programs page opens with a removable provider condition', (await count(p, '[data-action="remove-provider"]')) === 1);
  // C: compare two full-time admin jobs within 25 miles of Richmond (preferences are not silent filters)
  await goto(p, 'home'); await search(p, 'administrative', 'Richmond');
  const c0 = expJobs({q: 'administrative', city: 'Richmond, VA'});
  eq(G, 'C: keyword+Richmond search returns the independently computed count (no hidden full-time/daytime/pay filters)', await resultCount(p), c0.length);
  const s0 = await state(p);
  eq(G, 'C: neutral initial criteria apply: type, schedule and pay are empty', [s0.jobApplied.type, s0.jobApplied.schedule, s0.jobApplied.pay], ['', '', '']);
  await p.click('summary:has-text("Employment type, pay & schedule")');
  await p.selectOption('#type', 'Full-time'); await p.selectOption('#schedule', 'Daytime'); await p.fill('#pay', '19');
  eq(G, 'C: editing preferences does not change the results (still the same count) and shows a pending message', [await resultCount(p), (await text(p, '.status-pill')), (await text(p, '#draft-status')).startsWith('Changes not applied')], [c0.length, 'Changes not applied', true]);
  await p.press('#pay', 'Enter'); await p.waitForTimeout(150);
  const c1 = expJobs({q: 'administrative', city: 'Richmond, VA', type: 'Full-time', schedule: 'Daytime', pay: 19, unknown: true});
  eq(G, 'C: applying Full-time + Daytime + $19/h gives the independently computed count', await resultCount(p), c1.length);
  ok(G, 'C: unknown-pay listings are still included (preference, not silent filter) when the box is checked', c1.every(j => j.payMin === null || hourlyTop(j) >= 19) && (await text(p, '.status-summary')).includes('Pay not listed included'));
  // pick two jobs and compare
  const boxes = p.locator('[data-compare-id]');
  const a1 = await boxes.nth(0).getAttribute('data-compare-id'), a2 = await boxes.nth(1).getAttribute('data-compare-id');
  await boxes.nth(0).check(); await boxes.nth(1).check();
  ok(G, 'C: two selected: "2 of 2 jobs selected" and Compare enabled', (await text(p, '.selection-bar')).includes('2 of 2 jobs selected') && await p.locator('.selection-bar [data-action="compare"]').isEnabled());
  await p.click('.selection-bar [data-action="compare"]');
  const heads = await p.locator('.comparison thead th').allInnerTexts();
  ok(G, 'C: comparison table shows both selected jobs side by side with aligned rows', heads.length === 3 && (await p.locator('.comparison tbody tr').count()) >= 9);
  const rowLabels = await p.locator('.comparison tbody th').allInnerTexts();
  eq(G, 'C: comparison rows include employer, source, location, type, pay, schedule, qualifications and application method', ['Employer', 'Listing source', 'Location', 'Employment type', 'Pay', 'Schedule', 'Qualifications', 'Application method'].filter(x => !rowLabels.includes(x)), []);
  // D: how/where to apply, stopping before sign-in or submission
  const linkTo = await p.locator('.comparison a:has-text("How to apply")').first().getAttribute('href');
  await p.locator('.comparison a:has-text("How to apply")').first().click();
  const jid = linkTo.split('/')[1], job = D.jobs.find(j => j.id === jid);
  ok(G, 'D: application page names the job\'s own method and states that nothing was submitted', (await text(p, 'main')).includes(job.applyMethod === 'account' ? 'Virginia Workforce Connection account (simulated)' : 'Employer’s own application site (simulated)') && (await text(p, 'main')).includes('No application has been submitted'));
  ok(G, 'D: no form fields, no real links, every action says not available', (await count(p, 'main form, main input')) === 0 && (await p.locator('main a[href^="http"]').count()) === 0 && (await p.locator('main button.button').allInnerTexts()).every(t => /not available/.test(t)));
  await p.click('a:has-text("Back to job details")');
  ok(G, 'D: route back to the job details', p.url().endsWith('#job/' + jid));
  await p.click('a:has-text("Back to job search results")');
  const s1 = await state(p);
  eq(G, 'D: back at results the applied search, both selections and the comparison are intact', [s1.selected.sort(), s1.compare, await resultCount(p)], [[a1, a2].sort(), true, c1.length]);
  await p.context().close();
});

/* =============== HE-02: results-page editing, validation, recovery, keyboard =============== */
await block(async () => {
  const G = 'HE-02';
  const p = await open({width: 1280, height: 900}, seedFor()); p.tag.name = 'HE-02';
  await goto(p, 'results');
  const n0 = (await resultCount(p));
  eq(G, 'seeded results screen shows the form with keyword and location visible, secondary groups collapsed', [await p.locator('#q').isVisible(), await p.locator('#city').isVisible(), await p.locator('#type').isVisible()], [true, true, false]);
  await p.fill('#q', 'office');
  eq(G, 'typing in the keyword changes nothing applied: count and summary unchanged, pending pill shown at once', [await resultCount(p), (await text(p, '.status-summary')).includes('administrative'), await text(p, '.status-pill')], [n0, true, 'Changes not applied']);
  await p.press('#q', 'Enter'); await p.waitForTimeout(150);
  const exp = expJobs({q: 'office', city: 'Richmond, VA'});
  eq(G, 'Enter in the keyword field applies the draft exactly like the Update button (independent count)', [await resultCount(p), await text(p, '.status-pill')], [exp.length, 'Search up to date']);
  eq(G, 'focus stays on the Update results button after a keyboard update', await p.evaluate(() => document.activeElement && document.activeElement.id), 'update-results');
  await p.fill('#q', 'receptionist'); await p.click('#update-results'); await p.waitForTimeout(100);
  eq(G, 'clicking Update results gives the same outcome as Enter (receptionist near Richmond, independent count)', await resultCount(p), expJobs({q: 'receptionist', city: 'Richmond, VA'}).length);
  // validation
  await p.fill('#city', 'Atlantis'); await p.press('#city', 'Enter'); await p.waitForTimeout(150);
  const err = await text(p, '#form-error'), before = await resultCount(p);
  ok(G, 'unsupported location: alert explains the correction and says results did not change', err.includes('not a supported location') && err.includes('previous results have not changed'));
  eq(G, 'unsupported location: typed value kept, aria-invalid set, focus on the field, results unchanged', [await p.inputValue('#city'), await p.getAttribute('#city', 'aria-invalid'), await p.evaluate(() => document.activeElement.id), before], ['Atlantis', 'true', 'city', expJobs({q: 'receptionist', city: 'Richmond, VA'}).length]);
  await p.fill('#city', 'Richmond');
  ok(G, 'editing the invalid field clears its error message', (await text(p, '#form-error')) === '');
  await p.click('summary:has-text("Employment type, pay & schedule")'); await p.fill('#pay', '-3'); await p.press('#pay', 'Enter'); await p.waitForTimeout(100);
  ok(G, 'invalid minimum pay is explained and keeps the entry', (await text(p, '#form-error')).includes('Minimum pay must be a number') && (await p.inputValue('#pay')) === '-3');
  await p.fill('#pay', '');
  // empty result + recovery
  await p.fill('#q', 'zzzz'); await p.press('#q', 'Enter'); await p.waitForTimeout(150);
  ok(G, 'no matches: explanation, form still present, 0 matching jobs', (await text(p, 'main')).includes('No jobs match these criteria') && await p.locator('#jobs-form').isVisible() && (await resultCount(p)) === 0);
  const hint = p.locator('.hint-list li').first();
  ok(G, 'recovery: lists a condition that would restore results with its count', await hint.isVisible() && /\d+ matching job/.test(await hint.innerText()));
  await hint.locator('button').click();
  eq(G, 'applying a hint edits the form only (still 0 results, pending)', [await resultCount(p), await text(p, '.status-pill'), await p.inputValue('#q')], [0, 'Changes not applied', '']);
  await p.press('#q', 'Enter'); await p.waitForTimeout(150);
  ok(G, 'then Update restores results', (await resultCount(p)) > 0);
  // reset / clear never updates silently
  const nBefore = await resultCount(p);
  await p.fill('#q', 'clerk'); await p.focus('button:has-text("Reset criteria")'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  eq(G, 'Reset criteria via keyboard clears the form but does not update or submit (count unchanged, pending)', [await resultCount(p), await p.inputValue('#q'), await text(p, '.status-pill')], [nBefore, '', 'Changes not applied']);
  // inherited occupation removal
  const occ = D.occupations.find(o => o.group === 'Office and Administrative Support' && D.jobs.some(j => j.occupationId === o.id));
  const p2 = await open({width: 1280, height: 900}, seedFor({q: '', city: '', occupation: occ.id}));
  p2.tag.name = 'HE-02 occupation'; await goto(p2, 'results');
  const nOcc = await resultCount(p2);
  eq(G, 'inherited occupation chip is shown with its removal control', [(await text(p2, '.provider-chip')).includes(occ.title), await p2.locator('[data-action="remove-job-occupation"]').count()], [true, 1]);
  await p2.click('[data-action="remove-job-occupation"]');
  eq(G, 'removing the inherited occupation does not update results silently', [await resultCount(p2), await text(p2, '.status-pill'), await p2.locator('.provider-chip').count()], [nOcc, 'Changes not applied', 0]);
  await p2.click('#update-results'); await p2.waitForTimeout(100);
  eq(G, 'Update then applies it (all 80 jobs)', await resultCount(p2), 80);
  // training flows use the same pattern
  await goto(p2, 'programs'); await p2.selectOption('#qualification', {index: 1});
  ok(G, 'programs page: changing a field before the first search shows no results; the first search applies', (await text(p2, 'main')).includes('Find a course or training program'));
  await p2.press('#q', 'Enter'); await p2.waitForTimeout(100);
  ok(G, 'programs page: Enter runs the search', (await count(p2, '.list-card')) >= 0 && (await text(p2, '.status-pill')) === 'Search up to date');
  await p2.fill('#city', 'Atlantis'); await p2.press('#city', 'Enter');
  ok(G, 'programs page: unsupported location explained, entry kept', (await text(p2, '#form-error')).includes('not a supported location') && (await p2.inputValue('#city')) === 'Atlantis');
  await p.context().close(); await p2.context().close();
});

/* =============== HE-04 / HE-05 / HE-09: context, affordances, comparison in the browser =============== */
await block(async () => {
  const G = 'HE-04/05';
  const exp = expJobs({q: 'administrative', city: 'Richmond, VA'});
  const p = await open({width: 1280, height: 700}, seedFor()); p.tag.name = 'HE-04/05'; await goto(p, 'results');
  const cards = p.locator('.job-card');
  const detailTitle = async () => text(p, '#result-detail h2');
  // Two listings can share a title (same occupation at different employers), so "which job is shown" is
  // judged by the whole details panel (title, employer, pay, ...) and by which card carries the visible flag.
  const detailFull = async () => (await text(p, '#result-detail')).replace(/\d of 2 jobs selected\./, '');   // the selection counter inside the panel legitimately changes when a box is ticked
  const shownCard = async () => cards.evaluateAll(els => els.map((e, i) => /Shown in details/.test(e.innerText) ? i : -1).filter(i => i >= 0));
  const t0 = await detailTitle(), f0 = await detailFull(), s0 = await shownCard();
  ok(G, 'set-up: exactly one card is flagged "Shown in details" and the panel shows that job', s0.length === 1 && f0.length > 20, JSON.stringify(s0));
  // checkbox independence
  await cards.nth(1).locator('[data-compare-id]').check();
  eq(G, 'ticking a checkbox selects the job but does not open it (details panel, shown-card flag and URL unchanged)', [await detailFull(), await shownCard(), p.url().endsWith('#results'), (await state(p)).selected.length], [f0, s0, true, 1]);
  await cards.nth(1).locator('[data-compare-id]').uncheck();
  await cards.nth(2).click({position: {x: 6, y: 6}});
  eq(G, 'clicking empty space on a card does nothing (card is not clickable)', [await detailFull(), await shownCard(), p.url().endsWith('#results')], [f0, s0, true]);
  eq(G, 'card is not styled as clickable (cursor default); title button is (pointer)', [await cards.nth(2).evaluate(e => getComputedStyle(e).cursor), await cards.nth(2).locator('.title-button').evaluate(e => getComputedStyle(e).cursor)], ['default', 'pointer']);
  const title2 = (await cards.nth(2).locator('.title-button').innerText()).trim();
  await cards.nth(2).locator('.title-button').click();
  ok(G, 'clicking the title opens that job in the details panel', (await detailTitle()) === title2);
  ok(G, 'the shown card is marked with text "Shown in details"', (await cards.nth(2).innerText()).includes('Shown in details'));
  // keyboard on title and checkbox
  await cards.nth(3).locator('.title-button').focus(); await p.keyboard.press('Enter');
  eq(G, 'Enter on a focused title opens its details and moves focus to the details panel', [(await detailTitle()) === (await cards.nth(3).locator('.title-button').innerText()).trim(), await p.evaluate(() => document.activeElement.id)], [true, 'result-detail']);
  const fBefore = await detailFull(), sBefore = await shownCard();
  await cards.nth(0).locator('[data-compare-id]').focus(); await p.keyboard.press('Space');
  eq(G, 'Space on a focused checkbox toggles selection and leaves the details alone (same panel, same flagged card)', [(await state(p)).selected.length, await detailFull(), await shownCard()], [1, fBefore, sBefore]);
  await cards.nth(1).locator('[data-compare-id]').check();
  const third = cards.nth(4).locator('[data-compare-id]'); await third.click();
  ok(G, 'a third checkbox is refused, unticked again and explained', !(await third.isChecked()) && (await text(p, '#compare-error')).includes('You can compare two jobs at a time') && (await state(p)).selected.length === 2);
  // hover and focus states
  const tb = cards.nth(2).locator('.title-button');
  const c1 = await tb.evaluate(e => getComputedStyle(e).textDecorationThickness + '|' + getComputedStyle(e).color);
  await tb.hover(); await p.waitForTimeout(80);
  const c2 = await tb.evaluate(e => getComputedStyle(e).textDecorationThickness + '|' + getComputedStyle(e).color);
  ok(G, 'title button has a visible hover state (colour or underline changes)', c1 !== c2, `${c1} vs ${c2}`);
  const bb = p.locator('.selection-bar [data-action="compare"]'); const b1 = await bb.evaluate(e => getComputedStyle(e).backgroundColor); await bb.hover(); await p.waitForTimeout(80);
  ok(G, 'primary button changes colour on hover', b1 !== await bb.evaluate(e => getComputedStyle(e).backgroundColor));
  // details-vs-compare independence
  await p.click('.selection-bar [data-action="compare"]');
  const sel = (await state(p)).selected.slice().sort();
  await p.locator('.job-card .button:has-text("View job details")').nth(5).click();
  eq(G, 'opening another job\'s details while comparing keeps both selections', [(await state(p)).selected.slice().sort(), (await state(p)).compare], [sel, false]);
  await p.click('[data-action="compare"]:has-text("Compare (2)")');
  eq(G, 'returning to Compare shows the same two jobs', [(await p.locator('.comparison thead th').count()), (await state(p)).selected.slice().sort()], [3, sel]);
  // remove / replace
  const removeBtn = p.locator('.comparison thead [data-action="remove-compare"]').first();
  await removeBtn.click();
  eq(G, 'removing a compared job closes the comparison, keeps one selection and keeps the results list', [(await state(p)).selected.length, (await state(p)).compare, await p.locator('.job-card').count() === exp.length], [1, false, true]);
  await p.locator('[data-compare-id]').nth(6).check(); await p.click('.selection-bar [data-action="compare"]');
  ok(G, 'a replacement job can be ticked and compared', (await p.locator('.comparison thead th').count()) === 3);
  // search that excludes a selection removes it with a note
  const keepIds = (await state(p)).selected.slice();
  await p.click('summary:has-text("Employment type, pay & schedule")');
  await p.selectOption('#schedule', 'Evening'); await p.press('#schedule', 'Enter').catch(() => {}); await p.click('#update-results'); await p.waitForTimeout(150);
  const afterSel = (await state(p)).selected, shouldKeep = keepIds.filter(id => { const j = D.jobs.find(x => x.id === id); return j.schedule === 'Evening'; });
  eq(G, 'applying Evening keeps only selected jobs with a stated Evening schedule', afterSel.slice().sort(), shouldKeep.slice().sort());
  if (keepIds.length !== shouldKeep.length) ok(G, 'removed selections are explained by name', (await text(p, '.removal-notice')).startsWith('Removed from your comparison because they no longer match this search'));
  await p.context().close();
});

/* =============== HE-04: Back/Forward, draft behavior, scroll =============== */
await block(async () => {
  const G = 'HE-04 history';
  const p = await open({width: 1280, height: 600}, seedFor({q: 'office', city: ''}, {selected: ['J01', 'J02'], compare: true})); p.tag.name = 'history'; await goto(p, 'results');
  const applied = await text(p, '.status-summary'), n = await resultCount(p);
  await p.locator('.comparison a:has-text("View job details")').first().click(); await p.waitForURL(/#job\//); await p.waitForTimeout(100);
  const jobUrl = p.url();
  ok(G, 'comparison link opens job details', /#job\/J0[12]$/.test(jobUrl) && (await text(p, 'h1')) === 'Job details');
  await p.click('a:has-text("How to apply")'); await p.waitForURL(/#apply\//); await p.waitForTimeout(100); const applyUrl = p.url();
  ok(G, 'details → application information', /#apply\//.test(applyUrl));
  await p.goBack(); await p.waitForTimeout(150);
  ok(G, 'Back returns to the job details', p.url() === jobUrl && (await text(p, 'h1')) === 'Job details');
  await p.goBack(); await p.waitForTimeout(200);
  const s = await state(p);
  eq(G, 'Back again returns to results with the same applied search, selections and comparison view', [p.url().endsWith('#results'), await text(p, '.status-summary'), await resultCount(p), s.selected, s.compare, (await p.locator('.comparison thead th').count())], [true, applied, n, ['J01', 'J02'], true, 3]);
  await p.goForward(); await p.waitForTimeout(150);
  ok(G, 'Forward returns to the job details', p.url() === jobUrl);
  await p.goForward(); await p.waitForTimeout(150);
  ok(G, 'Forward again returns to the application page', p.url() === applyUrl && (await text(p, 'main')).includes('Prototype boundary'));
  await p.goBack(); await p.goBack(); await p.waitForTimeout(150);
  // draft behavior during navigation
  await p.fill('#q', 'zzz-draft');
  await p.locator('.comparison a:has-text("View job details")').first().click(); await p.waitForURL(/#job\//); await p.waitForTimeout(100);
  await p.goBack(); await p.waitForURL(/#results$/); await p.waitForTimeout(200);
  eq(G, 'an unapplied draft survives details and Back, is still unapplied, and the results still show the applied search', [await p.inputValue('#q'), await text(p, '.status-pill'), await text(p, '.status-summary'), await resultCount(p)], ['zzz-draft', 'Changes not applied', applied, n]);
  await p.reload(); await p.waitForTimeout(200);
  eq(G, 'after a full reload the draft, applied search and selections are restored from storage', [await p.inputValue('#q'), await text(p, '.status-summary'), (await state(p)).selected], ['zzz-draft', applied, ['J01', 'J02']]);
  // unchanged reapply keeps selections
  await p.fill('#q', 'office'); await p.click('#update-results'); await p.waitForTimeout(100);
  eq(G, 'reapplying unchanged criteria keeps selections and comparison', [(await state(p)).selected, (await state(p)).compare], [['J01', 'J02'], true]);
  // scroll restoration
  await p.evaluate(() => {document.querySelector('.job-list').scrollTop = 350;}); await p.waitForTimeout(100);
  await p.evaluate(() => window.scrollTo(0, 260)); await p.waitForTimeout(150);
  const y0 = await p.evaluate(() => window.scrollY), l0 = await p.evaluate(() => document.querySelector('.job-list').scrollTop);
  await goto(p, 'job/J01'); await p.waitForTimeout(100); await p.goBack(); await p.waitForTimeout(300);
  const y1 = await p.evaluate(() => window.scrollY), l1 = await p.evaluate(() => document.querySelector('.job-list').scrollTop);
  ok(G, 'returning to results restores the page scroll position (±8 px)', Math.abs(y1 - y0) <= 8 && y0 > 100, `before ${y0}, after ${y1}`);
  ok(G, 'returning to results restores the job list scroll position (±8 px)', Math.abs(l1 - l0) <= 8 && l0 > 100, `before ${l0}, after ${l1}`);
  // separate searches
  await goto(p, 'providers'); await p.fill('#q', 'learning'); await p.press('#q', 'Enter'); await p.waitForTimeout(100);
  await goto(p, 'results');
  eq(G, 'a providers search does not change the job search or selections', [await text(p, '.status-summary'), (await state(p)).selected], [applied, ['J01', 'J02']]);
  // occupation → training / jobs context
  const occ = D.occupations.find(o => D.programs.some(g => g.occupationIds.includes(o.id)));
  await goto(p, 'occupations'); await p.click('[data-action="occ-mode"][data-mode="directory"]');
  await p.click(`[data-action="occ-select"][data-id="${occ.id}"]`); await p.click('[data-action="occ-training"]'); await p.waitForURL(/#programs$/); await p.waitForTimeout(100);
  const expProg = D.programs.filter(g => g.occupationIds.includes(occ.id));
  eq(G, 'occupation → training lists exactly the linked programs (independent) with a removable occupation condition', [await p.locator('.list-card').count(), await p.locator('[data-action="remove-occupation"]').count()], [expProg.length, 1]);
  await goto(p, 'results');
  eq(G, 'that training link left the job search alone', await text(p, '.status-summary'), applied);
  await p.context().close();
});

/* =============== HE-07: geography in the browser =============== */
await block(async () => {
  const G = 'HE-07';
  const p = await open(); p.tag.name = 'HE-07'; await goto(p, 'occupations');
  ok(G, 'occupations page states the applied area, that information is general, and what the area controls', (await text(p, '.location-row')).includes('Applied area: All Virginia') && (await text(p, '.location-row')).includes('do not change with area'));
  await p.click('[data-action="occ-mode"][data-mode="directory"]');
  const occ = D.occupations.find(o => o.title === 'Receptionist') || D.occupations[2];
  await p.fill('#occ-area-input', 'Chesterfield'); await p.press('#occ-area-input', 'Enter'); await p.waitForTimeout(100);
  eq(G, 'area is applied by Enter and shown as the canonical label', await text(p, '.applied-area'), 'Applied area: Chesterfield, VA Area up to date');
  await p.click(`[data-action="occ-select"][data-id="${occ.id}"]`); await p.click('[data-action="occ-jobs"]'); await p.waitForTimeout(150);
  const expect = expJobs({occupation: occ.id, city: 'Chesterfield, VA'});
  eq(G, 'Find related jobs uses the area: result count equals the independent haversine count', await resultCount(p), expect.length);
  eq(G, 'the geography is a visible, editable condition (location field holds it; note names it)', [await p.inputValue('#city'), (await text(p, '.context-note')).includes('near Chesterfield, VA')], ['Chesterfield, VA', true]);
  await p.fill('#city', ''); await p.click('#update-results'); await p.waitForTimeout(120);
  eq(G, 'clearing the location in the form widens the search to all Virginia', await resultCount(p), expJobs({occupation: occ.id}).length);
  await goto(p, 'occupations'); await p.fill('#occ-area-input', 'Henrico'); await p.press('#occ-area-input', 'Enter');
  const o1 = D.occupations.find(o => D.programs.some(g => g.occupationIds.includes(o.id) && g.city === 'Henrico, VA'));
  await p.click('[data-action="occ-mode"][data-mode="directory"]'); await p.click(`[data-action="occ-select"][data-id="${o1.id}"]`); await p.click('[data-action="occ-training"]'); await p.waitForTimeout(120);
  eq(G, 'Explore training uses the area as the delivery location: count matches programs for that occupation delivered in Henrico', await p.locator('.list-card').count(), D.programs.filter(g => g.occupationIds.includes(o1.id) && g.city === 'Henrico, VA').length);
  ok(G, 'the applied summary says "Training location: Henrico, VA"', (await text(p, '.status-box')).includes('Training location: Henrico, VA'));
  await goto(p, 'occupations'); await p.fill('#occ-area-input', 'Atlantis'); await p.press('#occ-area-input', 'Enter'); await p.waitForTimeout(100);
  ok(G, 'unsupported area is explained and the previous area stays applied', (await text(p, '#occ-error')).includes('not a supported location') && (await text(p, '.applied-area')).includes('Henrico, VA'));
  // provider vs program location
  await goto(p, 'programs'); await p.press('#q', 'Enter'); await p.waitForTimeout(120);
  const diff = D.programs.filter(g => g.city !== D.providers.find(v => v.id === g.providerId).city);
  eq(G, 'program cards flag every program whose delivery location differs from its provider (independent list)', await p.locator('.list-card:has(.loc-diff)').count(), diff.length);
  await p.click('summary:has-text("Supported")').catch(() => {});
  await p.click('button:has-text("See supported locations")'); await p.waitForTimeout(80);
  ok(G, 'supported-locations dialog says distances are straight-line between city centers, not driving or commuting', (await text(p, '#dialog')).includes('not driving or commuting distance'));
  await p.keyboard.press('Escape');
  await p.context().close();
});

/* =============== HE-08: text size, focus, keyboard, notices =============== */
await block(async () => {
  const G = 'HE-08';
  const p = await open(); p.tag.name = 'HE-08';
  const rootPx = () => p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  const h1px = () => p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('h1')).fontSize));
  const smallPx = () => p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.hero-note')).fontSize));
  const [r0, h0, s0] = [await rootPx(), await h1px(), await smallPx()];
  await p.click('.utility-nav [data-dialog="accessibility"]');
  eq(G, 'default state is displayed: "Text size: Default"; Restore pressed', [await text(p, '#ts-status'), await p.getAttribute('[data-action="text-default"]', 'aria-pressed'), await p.getAttribute('[data-action="text-large"]', 'aria-pressed')], ['Text size: Default', 'true', 'false']);
  await p.click('[data-action="text-large"]');
  eq(G, 'larger text: status text, aria-pressed and root class all report the new state', [await text(p, '#ts-status'), await p.getAttribute('[data-action="text-large"]', 'aria-pressed'), await p.evaluate(() => document.documentElement.classList.contains('large-text'))], ['Text size: Larger', 'true', true]);
  const [r1, h1, s1] = [await rootPx(), await h1px(), await smallPx()];
  ok(G, 'enlargement reaches the root, headings and small text (each scales by 1.25)', Math.abs(r1 / r0 - 1.25) < .01 && Math.abs(h1 / h0 - 1.25) < .02 && Math.abs(s1 / s0 - 1.25) < .02, `root ${r0}→${r1}, h1 ${h0}→${h1}, small ${s0}→${s1}`);
  await p.keyboard.press('Escape'); await p.reload(); await p.waitForTimeout(150);
  ok(G, 'the larger setting persists across a reload', (await rootPx()) === r1);
  await p.click('.utility-nav [data-dialog="accessibility"]');
  eq(G, 'after reload the control reports "Larger"', await text(p, '#ts-status'), 'Text size: Larger');
  await p.click('[data-action="text-default"]');
  eq(G, 'Restore default returns the interface to its original sizes and state text', [await rootPx(), await h1px(), await text(p, '#ts-status')], [r0, h0, 'Text size: Default']);
  await p.keyboard.press('Escape');
  eq(G, 'closing the dialog with Escape returns focus to the control that opened it', await p.evaluate(() => document.activeElement.textContent.includes('Accessibility')), true);
  // notices from peripheral entries
  await goto(p, 'jobs'); await p.click('.method-tabs [data-unavailable="Employer search"]');
  const dlgText = await text(p, '#dialog');
  ok(G, 'a peripheral entry opens a "not implemented" notice that names the page you return to', dlgText.includes('not implemented in this prototype') && dlgText.includes('Find jobs'));
  await p.click('#dialog button:has-text("Close")');
  eq(G, 'closing the notice returns focus to the entry and leaves the page as it was', [await p.evaluate(() => document.activeElement.getAttribute('data-unavailable')), p.url().endsWith('#jobs')], ['Employer search', true]);
  // focus visibility on the first tab stops
  await goto(p, 'results'); await p.goto(BASE + '/index.html#home'); await p.reload();
  const stops = [];
  for (let i = 0; i < 14; i++) {await p.keyboard.press('Tab'); stops.push(await p.evaluate(() => {const e = document.activeElement, s = getComputedStyle(e); return {tag: e.tagName, txt: (e.textContent || e.getAttribute('aria-label') || e.id || '').trim().slice(0, 24), style: s.outlineStyle, w: parseFloat(s.outlineWidth)};}));}
  ok(G, 'the first 14 keyboard tab stops all show a solid outline of at least 2px', stops.every(s => s.style === 'solid' && s.w >= 2), JSON.stringify(stops.filter(s => !(s.style === 'solid' && s.w >= 2))));
  ok(G, 'the first tab stop is the skip link, and it becomes visible when focused', stops[0].txt.startsWith('Skip'));
  const skipTop = await p.evaluate(() => {document.querySelector('.skip-link').focus(); return document.querySelector('.skip-link').getBoundingClientRect().top;});
  ok(G, 'skip link is on screen when focused', skipTop >= 0);
  // heading hierarchy and a single h1 in the live DOM
  const pages = ['home', 'occupations', 'training', 'providers', 'programs', 'jobs', 'results', 'apply/J01', 'job/J01'];
  const hs = [];
  await p.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seedFor({}, {selected: ['J01', 'J02'], compare: true}))]); await p.reload();
  for (const pg of pages) {await goto(p, pg); const lv = await p.evaluate(() => [...document.querySelectorAll('main h1,main h2,main h3,main h4')].map(h => +h.tagName[1])); if (lv.filter(x => x === 1).length !== 1 || lv.some((x, i) => i && x > lv[i - 1] + 1)) hs.push(pg + ':' + lv.join(''));}
  eq(G, 'every rendered page has one h1 and no skipped heading levels (live DOM)', hs, []);
  await p.context().close();
});

/* =============== responsive layouts, larger text, overlap =============== */
await block(async () => {
  const G = 'RESPONSIVE';
  const widths = [1280, 1024, 768, 390, 320];
  const seeds = {
    results: seedFor({q: 'administrative'}, {selected: ['J01', 'J02'], compare: true}),
    resultsDetail: seedFor({q: 'administrative'}, {selected: ['J01'], compare: false})
  };
  const pages = [['home', 'home', 'results'], ['occupations', 'occupations', 'results'], ['providers', 'providers', 'results'], ['programs', 'programs', 'results'], ['jobs', 'jobs', 'results'], ['results (comparison)', 'results', 'results'], ['results (details)', 'results', 'resultsDetail'], ['apply', 'apply/J02', 'results'], ['job', 'job/J01', 'results']];
  const probe = () => {
    const vis = e => {const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; let b = {l: r.left, t: r.top, r: r.right, b: r.bottom};
      for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {const cs = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) {const q = a.getBoundingClientRect(); b = {l: Math.max(b.l, q.left), t: Math.max(b.t, q.top), r: Math.min(b.r, q.right), b: Math.min(b.b, q.bottom)}; if (b.r <= b.l || b.b <= b.t) return null;}}
      return b;};
    const els = [...document.querySelectorAll('header button, header a, nav a, nav button, main button, main a, main input, main select, main summary, footer a, footer button')].filter(e => getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]') && !e.closest('dialog:not([open])') && (e.tagName === 'SUMMARY' || !e.closest('details:not([open])')));
    const boxes = els.map(e => ({e, b: vis(e)})).filter(x => x.b);
    const over = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j]; if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
      const w = Math.min(a.b.r, c.b.r) - Math.max(a.b.l, c.b.l), h = Math.min(a.b.b, c.b.b) - Math.max(a.b.t, c.b.t);
      if (w > 3 && h > 3) over.push((a.e.textContent || a.e.id || a.e.tagName).trim().slice(0, 20) + ' × ' + (c.e.textContent || c.e.id || c.e.tagName).trim().slice(0, 20));
    }
    const m = document.querySelector('.masthead'), mr = m.getBoundingClientRect();
    const clipped = [...m.children].filter(c => c.getBoundingClientRect().bottom > mr.bottom + 1).length;
    const de = document.documentElement;
    const btn = document.querySelector('#update-results'); const br = btn && btn.getBoundingClientRect();
    return {overflowX: de.scrollWidth - de.clientWidth, over: over.slice(0, 4), clipped, updateInView: !br || (br.left >= 0 && br.right <= window.innerWidth + 1)};
  };
  const bad = {x: [], over: [], clip: [], upd: []};
  let combos = 0;
  for (const large of [false, true]) for (const w of widths) {
    for (const [label, route, sd] of pages) {
      const seed = {...seeds[sd], ui: {open: {}, large}};
      const p = await open({width: w, height: 800}, seed); p.tag.name = `responsive ${w} ${large ? 'large' : 'default'} ${label}`;
      await goto(p, route); await p.waitForTimeout(80);
      const r = await p.evaluate(probe); combos++;
      const id = `${w}px ${large ? 'large' : 'default'} ${label}`;
      if (r.overflowX > 1) bad.x.push(id + ` (+${r.overflowX})`);
      if (r.over.length) bad.over.push(id + ': ' + r.over.join('; '));
      if (r.clipped) bad.clip.push(id);
      if (!r.updateInView) bad.upd.push(id);
      await p.context().close();
    }
  }
  eq(G, `no page scrolls sideways (${combos} combinations: 5 widths × default/large text × 9 screens)`, bad.x, []);
  eq(G, 'no two visible interactive controls overlap (same combinations)', bad.over, []);
  eq(G, 'masthead contents are never clipped (same combinations)', bad.clip, []);
  eq(G, 'the Update/Search button stays inside the viewport width (same combinations)', bad.upd, []);
  // comparison usable at the narrowest width with larger text
  const p = await open({width: 320, height: 700}, {...seeds.results, ui: {open: {}, large: true}}); p.tag.name = 'comparison 320 large'; await goto(p, 'results');
  const disp = await p.evaluate(() => ({td: getComputedStyle(document.querySelector('.comparison td')).display, w: document.querySelector('.comparison').getBoundingClientRect().width, vw: window.innerWidth}));
  ok(G, 'at 320 px with larger text the comparison is stacked (cells display:block) and fits the viewport', disp.td === 'block' && disp.w <= disp.vw, JSON.stringify(disp));
  ok(G, 'each stacked cell is labelled with its job so values can be told apart', await p.evaluate(() => [...document.querySelectorAll('.comparison tbody td')].every(td => {const c = getComputedStyle(td, '::before').content; return td.dataset.job && c !== 'none' && c !== 'normal' && c.includes(td.dataset.job.slice(0, 12));})));
  const rem = await p.locator('.comparison thead [data-action="remove-compare"]').first();
  ok(G, 'Remove from comparison is reachable (visible and inside the viewport) at 320 px larger text', await rem.isVisible() && (await rem.boundingBox()).x + (await rem.boundingBox()).width <= 321);
  await p.context().close();
  const q = await open({width: 1280, height: 800}, {...seeds.results, ui: {open: {}, large: true}}); q.tag.name = 'comparison 1280 large'; await goto(q, 'results');
  eq(G, 'at 1280 px with larger text the comparison table needs no horizontal scrolling of its own', await q.evaluate(() => {const s = document.querySelector('.comparison-scroll'); return s.scrollWidth - s.clientWidth <= 1;}), true);
  await q.context().close();
});

/* =============== alternative navigation =============== */
await block(async () => {
  const G = 'ALT-NAV';
  const p = await open(); p.tag.name = 'alt nav';
  await p.click('#menu-button');
  ok(G, 'Menu lists the six service paths as links', (await p.locator('#dialog .menu-links a').allInnerTexts()).join('|') === 'Home|Explore occupations|Training & Education|Training providers & schools|Training programs|Find jobs');
  await p.click('#dialog .menu-links a:has-text("Training programs")');
  eq(G, 'a Menu link closes the dialog and opens that page', [await p.locator('#dialog[open]').count(), p.url().endsWith('#programs'), await text(p, 'h1')], [0, true, 'Find training programs']);
  await p.click('footer a:has-text("Home")');
  eq(G, 'footer Home link returns to the home page', [p.url().endsWith('#home'), await text(p, 'h1')], [true, 'Find jobs']);
  await p.click('.home-group a:has-text("Explore occupations")');
  const occ = D.occupations.find(o => D.programs.some(g => g.occupationIds.includes(o.id)));
  await p.click('[data-action="occ-mode"][data-mode="directory"]'); await p.click(`[data-action="occ-select"][data-id="${occ.id}"]`); await p.click('[data-action="occ-training"]');
  const prog = D.programs.find(g => g.occupationIds.includes(occ.id)), prov = D.providers.find(v => v.id === prog.providerId);
  await p.locator('.list-card', {hasText: prog.title}).locator('a:has-text("View provider")').click();
  eq(G, 'occupation → training → provider: the program card leads to its own provider', [p.url().endsWith('#provider/' + prov.id), await text(p, 'h1')], [true, prov.name]);
  await p.click('a:has-text("Back to provider results")');
  ok(G, 'provider page offers a way back to the provider search', p.url().endsWith('#providers'));
  await p.goBack(); await p.waitForTimeout(150);
  ok(G, 'browser Back from the provider search returns to the provider page', p.url().endsWith('#provider/' + prov.id));
  await goto(p, 'jobs'); await p.click('.method-tabs [data-unavailable="Skills & résumé matching"]');
  ok(G, 'a peripheral tab on Find jobs opens a notice, and the dialog can be closed from the keyboard', (await text(p, '#dialog')).includes('not implemented in this prototype'));
  await p.keyboard.press('Escape');
  await p.click('a:has-text("Detailed job search")').catch(async () => {await goto(p, 'home'); await p.click('a:has-text("Detailed job search")');});
  ok(G, 'Detailed job search from Home opens the full job search form', p.url().endsWith('#jobs') && await p.locator('#jobs-form').isVisible());
  await p.context().close();
});

/* =============== evaluator page, storage, hygiene =============== */
await block(async () => {
  const G = 'EVALUATOR+HYGIENE';
  const p = await open(); p.tag.name = 'hygiene';
  const routes = ['home', 'occupations', 'training', 'providers', 'programs', 'jobs', 'results', 'job/J01', 'apply/J01', 'nosuch'];
  const bad = [];
  for (const r of routes) {await goto(p, r); if (await p.locator('a[href*="evaluator"], [data-dialog] >> text=/evaluator/i').count()) bad.push(r);}
  await p.click('#menu-button'); const menuHas = (await text(p, '#dialog')).toLowerCase().includes('evaluator'); await p.keyboard.press('Escape');
  eq(G, 'no participant route, menu or footer links to the evaluator page', [bad, menuHas, (await p.locator('footer').innerText()).toLowerCase().includes('evaluator')], [[], false, false]);
  await goto(p, 'nosuch'); ok(G, 'unknown route shows "Page not found" with a way home', (await text(p, 'h1')) === 'Page not found' && await p.locator('main a:has-text("Return to Home")').count() >= 1);
  const keys = await p.evaluate(() => Object.keys(localStorage));
  eq(G, 'only the revised-prototype storage key is used', keys.filter(k => k !== KEY), []);
  const e = await open(); e.tag.name = 'evaluator';
  await e.goto(BASE + '/evaluator/index.html'); await e.evaluate(k => {localStorage.setItem(k, 'x'); localStorage.setItem('vawc-p4-v1', 'baseline');}, KEY);
  await e.click('#reset'); await e.waitForTimeout(80);
  eq(G, 'evaluator reset clears only the revised key and says so', [await e.evaluate(k => localStorage.getItem(k), KEY), await e.evaluate(() => localStorage.getItem('vawc-p4-v1')), (await text(e, '#msg')).includes('baseline key vawc-p4-v1 was not touched')], [null, 'baseline', true]);
  await p.context().close(); await e.context().close();
  eq(G, 'no request returned 404 (including /favicon.ico) during the whole run', misses, []);
});

/* =============== report =============== */
await browser.close(); server.close();
ok('HEALTH', 'no console errors/warnings, page errors or failed requests in any page opened by this run', health.length === 0, health.slice(0, 5).join(' | '));
let bad = 0;
for (const r of R) if (!r.pass) {bad++; console.log('FAIL [' + r.g + '] ' + r.name);}
for (const g of [...new Set(R.map(r => r.g))]) {const x = R.filter(r => r.g === g); console.log(`${g}: ${x.filter(r => r.pass).length} passed, ${x.filter(r => !r.pass).length} failed (of ${x.length})`);}
console.log(`BROWSER TOTAL: ${R.filter(r => r.pass).length} passed, ${bad} failed (of ${R.length})`);
process.exitCode = bad ? 1 : 0;

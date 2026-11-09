// Static-site regression checks. No third-party packages are required.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';

const root = resolve(process.cwd(), 'docs');
const read = path => readFileSync(resolve(root, path), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const required = [
  'index.html', 'sankey.html', 'community.html',
  'style.css', 'site.js', 'sankey.js', 'community.js',
  'data.js', 'community-general.json', '.nojekyll',
  'assets/content.png', 'assets/perception.png', 'assets/mode.png'
];
for (const path of required) {
  assert(existsSync(resolve(root, path)), 'Missing website file: ' + path);
}
for (const path of ['assets/content.png', 'assets/perception.png', 'assets/mode.png']) {
  assert(statSync(resolve(root, path)).size > 0, 'Empty graph asset: ' + path);
}

const pageNames = ['index.html', 'sankey.html', 'community.html'];
const pages = Object.fromEntries(pageNames.map(name => [name, read(name)]));
const index = pages['index.html'];
const ids = [...index.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert(index.includes('id="splitter"') && index.includes('role="separator"'),
  'Missing accessible desktop resize separator');
assert(index.includes('id="returnToReading"'), 'Missing back-to-reading button');
const siteRouter=read('site.js');
assert(siteRouter.includes('restoreReading') && siteRouter.includes('scrollY:window.scrollY') &&
       siteRouter.includes('history.pushState') && siteRouter.includes('scrollTo({top:point.scrollY'),
       'Missing scroll-position restoration for detail links');
const communityRouter=read('community.js');
assert(communityRouter.includes("byId('includeDetail').checked?'href="),
       'Missing local links when community HTML includes the full detail');

const css = read('style.css');
const splitLogic = read('site.js');
assert(css.includes('.splitter{') && css.includes('display:none!important'),
  'Missing desktop splitter styling or mobile hide rule');
assert(splitLogic.includes('setPointerCapture') && splitLogic.includes('pointercancel') &&
       splitLogic.includes('ArrowLeft') && splitLogic.includes('ArrowRight') &&
       splitLogic.includes('savedSplitKey'),
  'Missing pointer, keyboard, or persisted split resizing behavior');
assert(new Set(ids).size === ids.length, 'Duplicate IDs in index.html');
const idSet = new Set(ids);

function checkLocalTargets(file, html) {
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const raw = match[1].replace(/&amp;/g, '&');
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(raw)) continue;
    const [path, hash] = raw.split('#', 2);
    const filePath = path.split('?')[0];
    const destination = filePath ? resolve(root, dirname(file), decodeURIComponent(filePath)) : resolve(root, file);
    assert(destination === root || destination.startsWith(root + sep),
      'Path escapes docs/: ' + file + ' → ' + raw);
    assert(existsSync(destination), 'Broken local link: ' + file + ' → ' + raw);
    if (hash && destination.endsWith('.html')) {
      const targetHTML = readFileSync(destination, 'utf8');
      const targetIds = new Set([...targetHTML.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
      assert(targetIds.has(decodeURIComponent(hash)), 'Missing anchor: ' + file + ' → ' + raw);
    }
  }
}
for (const [name, html] of Object.entries(pages)) checkLocalTargets(name, html);

const payload = JSON.parse(read('community-general.json'));
assert(typeof payload.general === 'string' && typeof payload.detail === 'string',
  'Community HTML export payload has unexpected shape');
assert(payload.chartNames && typeof payload.chartNames === 'object',
  'Missing chart labels in export payload');

const insightCount = (index.match(/class="interpretation"/g) || []).length;
const generalExportCount = (payload.general.match(/class="interpretation"/g) || []).length;
assert(insightCount === 7 && generalExportCount === 7, 'Expected seven general interpretations');
for (let n = 1; n <= 7; n++) {
  const id = 'hypothesis-0' + n;
  const start = index.indexOf('<h3 id="' + id + '">');
  const next = n === 7 ? index.indexOf('<h3 id="detail-evidence-map">', start)
    : index.indexOf('<h3 id="hypothesis-0' + (n + 1) + '">', start);
  assert(start >= 0 && next > start && next - start > 800,
    'Detailed analysis needs additional comparison and explanation: ' + id);
  const detail = index.slice(start, next);
  assert(detail.includes('<table>') && detail.includes('가능') || detail.includes('<table>') && detail.includes('해석'),
    'Detailed analysis should contain cross-group comparisons: ' + id);
  assert(idSet.has(id), 'Missing detailed hypothesis: ' + id);
  assert(index.includes('data-detail-link="' + id + '"'), 'Missing navigation link: ' + id);
  assert(payload.detail.includes('id="' + id + '"'), 'Missing exported hypothesis: ' + id);
  assert(payload.general.includes('data-detail-link="' + id + '"'),
    'Missing exported interpretation link: ' + id);
}
for (const id of ['detail-hypotheses', 'detail-evidence-map', 'detail-forecast']) {
  assert(idSet.has(id), 'Missing detailed navigation target: ' + id);
  assert(payload.detail.includes('id="' + id + '"'), 'Missing community detail target: ' + id);
}

function checkTables(where, html) {
  const opens = (html.match(/<table(?:\s[^>]*)?>/g) || []).length;
  const closes = (html.match(/<\/table>/g) || []).length;
  assert(opens === closes, 'Unbalanced tables in ' + where);
}
checkTables('index.html', index);
checkTables('export.general', payload.general);
checkTables('export.detail', payload.detail);

const rawData = read('data.js').trim();
assert(rawData.startsWith('const DATA=') && rawData.endsWith(';'), 'Unexpected chart data format');
const dataset = JSON.parse(rawData.slice('const DATA='.length, -1));
for (const chart of ['content', 'perception', 'perf', 'mode']) {
  assert(dataset.charts && dataset.charts[chart], 'Missing chart: ' + chart);
  assert(payload.chartNames[chart], 'Missing export chart label: ' + chart);
}
for (const marker of payload.general.matchAll(/<!--CHART:(\w+)-->/g)) {
  assert(dataset.charts[marker[1]], 'Unknown embedded chart: ' + marker[1]);
}

for (const [name, html] of Object.entries(pages)) {
  assert(html.includes('charset="utf-8"'), 'Missing UTF-8 declaration: ' + name);
}
assert(!/후속 조사|다음 조사|설문 개선|반증 기준|검증 계획/.test(index),
  'Survey-method planning text reintroduced in public report');
console.log('Static QA passed: required assets, links, IDs, exports, charts, and table structure.');

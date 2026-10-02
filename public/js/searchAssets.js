// ─────────────────────────────────────────────────────────────
//  Search Assets
//   • All / New tabs  → fortnite_assets.gz / fortnite_assets_new.gz
//   • "New AS" button → assets of cosmetics added in the last 7 days
//                       (dates from Fortnite-API, paths from the asset list)
// ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 500;
const NEW_AS_DAYS = 7;

const $ = id => document.getElementById(id);
const t = (k, v) => FT.i18n.t(k, v);
const el = {
    keywords:  $('keywords'),
    formatted: $('formatted'),
    addC:      $('addC'),
    results:   $('results'),
    count:     $('results-count'),
    loading:   $('loading'),
    loadingTx: $('loading-text'),
    showMore:  $('show-more'),
    showAll:   $('show-all'),
    searchBtn: $('search-btn'),
    newAsBtn:  $('new-as-btn'),
    allTab:    $('all-assets-btn'),
    newTab:    $('new-assets-btn'),
};

let currentList = 'all';   // 'all' | 'new'  (which .gz file the tabs point at)
let rows = [];             // [{ raw, meta? }]  — what is currently displayed
let shown = 0;
let newAsCache = null;     // { rows, cosmetics, missing }

function setLoading(on, text = t('sa.searching')) {
    el.loading.classList.toggle('active', on);
    el.loadingTx.textContent = text;
}

// ── JSON viewer (opens in a new tab) ─────────────────────────
function openJsonViewer(jsonPath, imgPath, filePath) {
    const w = window.open();
    if (!w) { alert('Please allow popups for this website.'); return; }
    const safe = FT.ui.esc(filePath);
    w.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JSON Viewer</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #fff; color: #000; margin: 0; padding: 20px; }
  @media (prefers-color-scheme: dark) { body { background: #000; color: #fff; } pre { background: #141414 !important; border-color: #2e2e2e !important; } }
  h2 { margin: 0 0 6px; font-size: 16px; }
  .filepath { font: 12px ui-monospace, Consolas, monospace; color: #757575; margin-bottom: 16px; word-break: break-all; }
  pre { background: #f5f5f5; border: 1px solid #dcdcdc; padding: 14px; border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.6; }
  img { max-width: 256px; display: block; margin-bottom: 12px; }
  .loading { color: #757575; font-size: 13px; }
</style></head><body>
<h2>JSON Viewer</h2>
<div class="filepath">${safe}</div>
<div class="loading" id="loading">Loading JSON data...</div>
<img src="${FT.ui.esc(imgPath)}" alt="" onerror="this.remove()">
<pre id="json-content"></pre>
<script>
  fetch(${JSON.stringify(jsonPath)})
    .then(r => { if (!r.ok) throw new Error('Network response was not ok'); return r.json(); })
    .then(d => { document.getElementById('loading').remove(); document.getElementById('json-content').textContent = JSON.stringify(d, null, 4); })
    .catch(e => { document.getElementById('loading').textContent = 'Error: ' + e.message; });
<\/script></body></html>`);
    w.document.close();
}

// ── Rendering ────────────────────────────────────────────────
function makeRow(index, { raw, meta }) {
    const display = el.formatted.checked ? FT.assets.formatPath(raw, el.addC.checked) : raw;

    const tr = document.createElement('tr');
    const tdIdx = document.createElement('td');
    tdIdx.textContent = index + 1;

    const td = document.createElement('td');
    const cell = document.createElement('div');
    cell.className = 'path-cell';

    const main = document.createElement('div');
    main.className = 'path-main';
    const text = document.createElement('div');
    text.className = 'path-text';
    text.textContent = display;
    main.appendChild(text);
    if (meta) {
        const m = document.createElement('div');
        m.className = 'path-meta';
        m.textContent = meta;
        main.appendChild(m);
    }

    const actions = document.createElement('div');
    actions.className = 'path-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'view-btn';
    viewBtn.textContent = '👁️';
    viewBtn.title = t('sa.viewJson');
    viewBtn.setAttribute('aria-label', t('sa.viewJson'));
    viewBtn.addEventListener('click', () => {
        const apiPath = raw.endsWith('_C') ? raw.slice(0, -2) : raw;
        const q = encodeURIComponent(apiPath);
        openJsonViewer(
            `https://export-service-new.dillyapis.com/v1/export?path=${q}&raw=true`,
            `https://export-service-new.dillyapis.com/v1/export?path=${q}&ForceImage=true`,
            raw
        );
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = '📋';
    copyBtn.title = t('sa.copyPath');
    copyBtn.setAttribute('aria-label', t('sa.copyPath'));
    copyBtn.addEventListener('click', () => FT.ui.copy(display, copyBtn));

    actions.append(viewBtn, copyBtn);
    cell.append(main, actions);
    td.appendChild(cell);
    tr.append(tdIdx, td);
    return tr;
}

function renderChunk() {
    const end = Math.min(shown + PAGE_SIZE, rows.length);
    const frag = document.createDocumentFragment();
    for (let i = shown; i < end; i++) frag.appendChild(makeRow(i, rows[i]));
    el.results.appendChild(frag);
    shown = end;
    el.showMore.hidden = shown >= rows.length;
    el.showAll.hidden = shown >= rows.length;
    el.showMore.textContent = t('sa.showMore', { n: (rows.length - shown).toLocaleString() });
}

function renderAll(newRows, html) {
    rows = newRows;
    shown = 0;
    el.results.innerHTML = '';
    el.count.innerHTML = html;
    if (!rows.length) {
        el.results.innerHTML = `<tr class="empty-row"><td colspan="2">${FT.ui.esc(t('sa.none'))}</td></tr>`;
        el.showMore.hidden = true;
        el.showAll.hidden = true;
        return;
    }
    renderChunk();
}

// Re-render (not re-search) when the display options change.
function rerender() {
    if (!rows.length) return;
    el.results.innerHTML = '';
    const keep = shown;
    shown = 0;
    while (shown < keep) renderChunk();
}

// ── Keyword filtering ────────────────────────────────────────
function getKeywords() {
    return el.keywords.value.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
}

// Translated sentence with the numeric values in <strong>.
function resultsHtml(key, vars) {
    const bold = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, `\u0001${v}\u0002`]));
    return FT.ui.esc(t(key, bold)).replace(/\u0001/g, '<strong>').replace(/\u0002/g, '</strong>');
}

// ── Normal search ────────────────────────────────────────────
async function searchAssets() {
    const keywords = getKeywords();
    if (!keywords.length) { el.keywords.focus(); FT.ui.toast(t('sa.needKeyword')); return; }

    setLoading(true, t('sa.searching'));
    try {
        const assets = await FT.assets.load(currentList);
        const matches = assets.filter(p => {
            const l = p.toLowerCase();
            return keywords.every(k => l.includes(k));
        });
        renderAll(
            matches.map(raw => ({ raw })),
            resultsHtml('sa.results', { n: matches.length.toLocaleString() })
        );
    } catch (e) {
        console.error(e);
        FT.ui.toast(t('sa.loadFail'));
    } finally {
        setLoading(false);
    }
}

// ── New AS: last 7 days ──────────────────────────────────────
const fmtDate = ts => new Date(ts).toLocaleDateString(FT.i18n.lang === 'ja' ? 'ja-JP' : undefined, { year: 'numeric', month: 'short', day: 'numeric' });

async function buildNewAs() {
    if (newAsCache) return newAsCache;

    const [cosmetics] = await Promise.all([FT.cosmetics.loadAll('en'), FT.assets.load('all')]);
    const recent = cosmetics
        .filter(i => FT.cosmetics.isRecent(i, NEW_AS_DAYS))
        .sort((a, b) => b.added - a.added);

    const found = await FT.assets.findByIds(recent.map(i => i.id));

    const out = [];
    let missing = 0;
    for (const item of recent) {
        const paths = found.get(item.id.toLowerCase());
        if (!paths) { missing++; continue; }
        for (const raw of paths) {
            out.push({ raw, meta: `${item.name} · ${item.id} · ${fmtDate(item.added)}`, search: (raw + ' ' + item.search).toLowerCase() });
        }
    }
    newAsCache = { rows: out, cosmetics: recent.length, missing };
    return newAsCache;
}

async function showNewAssets() {
    setLoading(true, t('sa.findingNew'));
    try {
        const data = await buildNewAs();
        const keywords = getKeywords();
        const list = keywords.length ? data.rows.filter(r => keywords.every(k => r.search.includes(k))) : data.rows;

        let html = resultsHtml('sa.newSummary', { n: list.length.toLocaleString(), c: data.cosmetics.toLocaleString(), d: NEW_AS_DAYS });
        if (data.missing) html += ` <span>${FT.ui.esc(t('sa.missing', { m: data.missing }))}</span>`;
        renderAll(list, html);
    } catch (e) {
        console.error(e);
        newAsCache = null;
        FT.ui.toast(t('sa.apiFail'));
    } finally {
        setLoading(false);
    }
}

// ── Tabs (All / New file) ────────────────────────────────────
async function switchAssetList(type) {
    currentList = type;
    el.allTab.classList.toggle('active', type === 'all');
    el.newTab.classList.toggle('active', type === 'new');
    if (getKeywords().length) await searchAssets();
    else FT.assets.load(type).catch(() => {});   // warm the cache
}

// ── Wire up ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    el.searchBtn.addEventListener('click', searchAssets);
    el.newAsBtn.addEventListener('click', showNewAssets);
    el.keywords.addEventListener('keydown', e => { if (e.key === 'Enter') searchAssets(); });
    el.allTab.addEventListener('click', () => switchAssetList('all'));
    el.newTab.addEventListener('click', () => switchAssetList('new'));
    el.showMore.addEventListener('click', renderChunk);
    el.showAll.addEventListener('click', () => { while (shown < rows.length) renderChunk(); });
    document.addEventListener('ft:langchange', () => { if (rows.length) rerender(); el.showMore.textContent = t('sa.showMore', { n: (rows.length - shown).toLocaleString() }); });
    el.formatted.addEventListener('change', rerender);
    el.addC.addEventListener('change', rerender);

    FT.assets.load('all').catch(() => FT.ui.toast('Failed to load fortnite_assets.gz'));
});

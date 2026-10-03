// ─────────────────────────────────────────────────────────────
//  Items — every cosmetic from Fortnite-API, searchable / filterable /
//  sortable, refreshed automatically when a new build lands.
//
//  Tap an item → detail sheet:
//    EID_*  → Emote→Animation / Sequence Animation / Audio  (convert.js)
//    other  → Search Assets result for that ID
// ─────────────────────────────────────────────────────────────

(() => {
    const PAGE = 60;                 // rows rendered per batch
    const POLL_MS = 2 * 60 * 1000;   // how often we ask Fortnite-API "anything new?"
    const RECENT_DAYS = 7;

    const $ = id => document.getElementById(id);
    const ui = FT.ui;
    const t = (k, v) => FT.i18n.t(k, v);

    const dom = {
        q: $('q'), cats: $('cats'), rarity: $('rarity'), sort: $('sort'), reset: $('reset'),
        recent: $('recent'), refresh: $('refresh'), status: $('status'),
        list: $('list'), sentinel: $('sentinel'), state: $('state'),
        dlg: $('detail'),
    };

    // ── State ────────────────────────────────────────────────
    const S = {
        items: [],
        byId: new Map(),
        view: [],
        rendered: 0,
        lang: FT.i18n.lang,          // shared with the whole site (EN / 日本語)
        cats: new Set(),             // selected category chips (empty = all)
        openId: null,
        fmt: localStorage.getItem('ft.items.fmt') !== 'raw',   // formatted path by default
        addC: localStorage.getItem('ft.items.addC') === '1',
        hash: null,
        lastCheck: null,
        online: true,
        loading: false,
    };

    // ── Helpers ──────────────────────────────────────────────
    const fmtDate = ts => ts ? new Date(ts).toLocaleDateString(S.lang === 'ja' ? 'ja-JP' : undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    const fmtTime = d => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isNew = item => FT.cosmetics.isRecent(item, RECENT_DAYS);

    function makeImg(src, alt = '') {
        if (!src) return null;
        const img = document.createElement('img');
        img.src = src; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async';
        img.addEventListener('error', () => img.replaceWith(document.createTextNode('📦')), { once: true });
        return img;
    }

    // ── Status line ──────────────────────────────────────────
    function renderStatus() {
        const dot = `<span class="live-dot ${S.online ? '' : 'off'}"></span>`;
        const total = S.items.length.toLocaleString();
        const shown = S.view.length.toLocaleString();
        const count = S.view.length === S.items.length ? t('items.count', { n: total }) : t('items.countOf', { n: shown, total });
        const checked = S.lastCheck ? ` · ${ui.esc(t('items.checked', { t: fmtTime(S.lastCheck) }))}` : '';
        dom.status.innerHTML = `${dot}${ui.esc(count)}${checked}${S.online ? '' : ' · ' + ui.esc(t('items.offline'))}`;
    }

    // ── Filters / sorting ────────────────────────────────────
    function fillSelect(select, values, keepValue) {
        const prev = keepValue ?? select.value;
        select.length = 1;   // keep "All"
        for (const [value, label] of values) select.add(new Option(label, value));
        select.value = [...select.options].some(o => o.value === prev) ? prev : '';
    }

    // Preferred chip order; anything else follows by item count.
    const CAT_ORDER = ['outfit', 'emote', 'backpack', 'pickaxe', 'glider', 'contrail', 'wrap', 'loadingscreen', 'music', 'spray', 'emoji', 'toy', 'pet', 'shoes', 'bannertoken'];

    function catLabel(group, sample) {
        const key = `cat.${group}`;
        return FT.i18n.has(key) ? t(key) : (sample?.type || group);
    }

    function buildFilterOptions() {
        const groups = new Map(), rarities = new Map();
        for (const i of S.items) {
            const g = groups.get(i.group) || { n: 0, sample: i };
            g.n++; groups.set(i.group, g);
            if (i.rarityValue) rarities.set(i.rarityValue, { label: i.rarity, rank: Math.max(rarities.get(i.rarityValue)?.rank || 0, i.rarityRank) });
        }
        const pos = g => { const p = CAT_ORDER.indexOf(g); return p < 0 ? 999 : p; };
        const ordered = [...groups].sort((a, b) => (pos(a[0]) - pos(b[0])) || (b[1].n - a[1].n));

        dom.cats.replaceChildren();
        for (const [group, { n, sample }] of ordered) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'chip';
            b.dataset.group = group;
            b.setAttribute('aria-pressed', String(S.cats.has(group)));
            b.innerHTML = `${ui.esc(catLabel(group, sample))} <span class="n">${n.toLocaleString()}</span>`;
            dom.cats.appendChild(b);
        }
        // drop selections that no longer exist
        for (const g of [...S.cats]) if (!groups.has(g)) S.cats.delete(g);

        const prev = dom.rarity.value;
        dom.rarity.length = 1;
        dom.rarity.options[0].textContent = t('common.all');
        for (const [value, { label }] of [...rarities].sort((a, b) => a[1].rank - b[1].rank)) dom.rarity.add(new Option(label, value));
        dom.rarity.value = [...dom.rarity.options].some(o => o.value === prev) ? prev : '';
    }

    const SORTERS = {
        'added-desc':  (a, b) => (b.added - a.added) || a.name.localeCompare(b.name),
        'added-asc':   (a, b) => ((a.added || Infinity) - (b.added || Infinity)) || a.name.localeCompare(b.name),
        'name-asc':    (a, b) => a.name.localeCompare(b.name),
        'name-desc':   (a, b) => b.name.localeCompare(a.name),
        'rarity-desc': (a, b) => (b.rarityRank - a.rarityRank) || (b.added - a.added),
        'rarity-asc':  (a, b) => (a.rarityRank - b.rarityRank) || (b.added - a.added),
    };

    function applyFilters({ keepRendered = false } = {}) {
        const tokens = dom.q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const cats = S.cats, rarity = dom.rarity.value;
        const onlyRecent = dom.recent.getAttribute('aria-pressed') === 'true';

        S.view = S.items
            .filter(i =>
                (!cats.size || cats.has(i.group)) &&
                (!rarity || i.rarityValue === rarity) &&
                (!onlyRecent || isNew(i)) &&
                tokens.every(t => i.search.includes(t)))
            .sort(SORTERS[dom.sort.value]);

        const keep = keepRendered ? Math.max(S.rendered, PAGE) : PAGE;
        dom.list.innerHTML = '';
        S.rendered = 0;
        renderMore(keep);
        renderStatus();
    }

    // ── List rendering (incremental) ─────────────────────────
    function makeRow(item) {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'item-row';
        btn.type = 'button';
        btn.dataset.id = item.id;

        const thumb = document.createElement('span');
        thumb.className = 'thumb';
        thumb.appendChild(makeImg(item.small, '') || document.createTextNode('📦'));

        const text = document.createElement('span');
        text.className = 'item-text';
        const name = document.createElement('div');
        name.className = 'item-name';
        name.textContent = item.name;
        const sub = document.createElement('div');
        sub.className = 'item-sub';
        sub.textContent = `${item.id}`;
        text.append(name, sub);

        btn.append(thumb, text);
        if (isNew(item)) {
            const b = document.createElement('span');
            b.className = 'badge';
            b.textContent = t('home.new');
            btn.appendChild(b);
        }
        li.appendChild(btn);
        return li;
    }

    function renderMore(count = PAGE) {
        const end = Math.min(S.rendered + count, S.view.length);
        const frag = document.createDocumentFragment();
        for (let i = S.rendered; i < end; i++) frag.appendChild(makeRow(S.view[i]));
        dom.list.appendChild(frag);
        S.rendered = end;

        if (!S.items.length) return;
        if (!S.view.length) {
            dom.state.innerHTML = `${ui.esc(t('items.noMatch'))}<br><button class="btn" id="clear">${ui.esc(t('items.clear'))}</button>`;
            $('clear').addEventListener('click', clearFilters);
        } else {
            dom.state.textContent = '';
        }
    }

    const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting) && S.rendered < S.view.length) renderMore();
    }, { rootMargin: '800px' });
    io.observe(dom.sentinel);

    function clearFilters() {
        dom.q.value = ''; dom.rarity.value = ''; S.cats.clear();
        dom.cats.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
        dom.recent.setAttribute('aria-pressed', 'false');
        applyFilters();
    }

    // ── Loading / auto-update ────────────────────────────────
    async function load({ silent = false } = {}) {
        if (S.loading) return;
        S.loading = true;
        if (!silent && !S.items.length) dom.state.innerHTML = `<span class="spinner"></span> ${ui.esc(t('items.loading'))}`;

        try {
            const previous = new Set(S.byId.keys());
            const items = await FT.cosmetics.loadAll(S.lang);
            S.items = items;
            S.byId = new Map(items.map(i => [i.id, i]));
            S.online = true;
            buildFilterOptions();
            applyFilters({ keepRendered: silent });

            const added = previous.size ? items.filter(i => !previous.has(i.id)).length : 0;
            if (added) ui.toast(t('items.newToast', { n: added }));

            // remember the build hash so polling can tell when something changes
            FT.cosmetics.checkNew(S.lang).then(n => { S.hash = n.hash; }).catch(() => {});
        } catch (e) {
            console.error(e);
            S.online = false;
            if (!S.items.length) {
                dom.state.innerHTML = `${ui.esc(t('items.loadFail'))}<br><button class="btn" id="retry">${ui.esc(t('common.retry'))}</button>`;
                $('retry').addEventListener('click', () => load());
            }
            renderStatus();
        } finally {
            S.loading = false;
        }
    }

    async function poll({ manual = false } = {}) {
        if (S.loading || !S.items.length) return;
        try {
            const n = await FT.cosmetics.checkNew(S.lang);
            S.online = true;
            S.lastCheck = new Date();

            const unknown = n.items.some(i => !S.byId.has(i.id));
            const changed = S.hash !== null && n.hash && n.hash !== S.hash;
            if (changed || unknown) {
                await load({ silent: true });
                S.hash = n.hash;
            } else {
                S.hash = n.hash || S.hash;
                if (manual) ui.toast(t('items.upToDate'));
            }
        } catch (e) {
            console.warn('Update check failed', e);
            S.online = false;
            if (manual) ui.toast(t('items.unreachable'));
        }
        renderStatus();
    }

    setInterval(() => { if (!document.hidden) poll(); }, POLL_MS);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && (!S.lastCheck || Date.now() - S.lastCheck > POLL_MS)) poll();
    });

    // ── Detail sheet ─────────────────────────────────────────
    let openToken = 0;

    function resultBox(id) { return $(id).querySelector('.result-box'); }

    function setBox(box, state, content) {
        box.className = `result-box ${state}`;
        box.replaceChildren();
        if (state === 'loading') {
            box.innerHTML = `<span class="result-spinner"></span>${ui.esc(content || t('common.loading'))}`;
        } else if (state === 'error') {
            box.textContent = content;
        } else {
            box.appendChild(content);
        }
    }

    function linesEl(entries) {
        const frag = document.createDocumentFragment();
        for (const { tag, value } of entries) {
            const row = document.createElement('div');
            row.className = 'line';
            if (tag) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = tag; row.appendChild(t); }
            const v = document.createElement('span');
            v.className = 'val'; v.textContent = value;
            const c = document.createElement('button');
            c.className = 'copy-btn'; c.type = 'button'; c.textContent = '📋'; c.title = t('common.copy');
            c.addEventListener('click', () => ui.copy(value, c));
            row.append(v, c);
            frag.appendChild(row);
        }
        return frag;
    }

    async function runConvert(boxId, token, loadingMsg, fn, toEntries) {
        const box = resultBox(boxId);
        setBox(box, 'loading', loadingMsg);
        try {
            const result = await fn();
            if (token !== openToken) return;            // another item was opened meanwhile
            if (!result) return setBox(box, 'error', t('items.noData'));
            setBox(box, 'success', linesEl(toEntries(result)));
        } catch (e) {
            if (token === openToken) setBox(box, 'error', e.message || t('items.error'));
        }
    }

    // ── Search Assets: every match (exact file name first, then anything containing the ID) ──
    const ASSET_CHUNK = 100;
    const A = { exact: [], related: [], guesses: [], shown: { exact: 0, related: 0 }, item: null };

    const assetDisplay = raw => (S.fmt ? FT.assets.formatPath(raw, S.addC) : raw);

    function assetSection(kind) {
        const list = A[kind];
        const wrap = document.createElement('div');
        wrap.className = 'asset-group';
        wrap.dataset.kind = kind;
        const h = document.createElement('h4');
        h.textContent = t(kind === 'exact' ? 'items.exact' : 'items.related', { n: list.length.toLocaleString() });
        const body = document.createElement('div');
        body.className = 'result-box success';
        const actions = document.createElement('div');
        actions.className = 'asset-more';
        const more = document.createElement('button');
        more.type = 'button'; more.className = 'btn btn-small';
        more.addEventListener('click', () => fillAssets(kind, ASSET_CHUNK));
        const all = document.createElement('button');
        all.type = 'button'; all.className = 'btn btn-small';
        all.textContent = t('items.showAll');
        all.addEventListener('click', () => fillAssets(kind, Infinity));
        actions.append(more, all);
        wrap.append(h, body, actions);
        return wrap;
    }

    function fillAssets(kind, count) {
        const wrap = $('r-assets').querySelector(`[data-kind="${kind}"]`);
        if (!wrap) return;
        const list = A[kind], body = wrap.querySelector('.result-box'), actions = wrap.querySelector('.asset-more');
        const end = count === Infinity ? list.length : Math.min(A.shown[kind] + count, list.length);
        const entries = [];
        for (let i = A.shown[kind]; i < end; i++) {
            entries.push({ tag: S.fmt ? t('items.tagPath') : t('items.tagFile'), value: assetDisplay(list[i]) });
        }
        body.appendChild(linesEl(entries));
        A.shown[kind] = end;
        const left = list.length - end;
        actions.hidden = left <= 0;
        actions.firstChild.textContent = t('items.showMore', { n: left.toLocaleString() });
    }

    function replaceAllInsensitive(value, from, to) {
        const escaped = String(from).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return value.replace(new RegExp(escaped, 'gi'), to);
    }

    function guessedAssetPaths(item, assets) {
        const match = String(item.id).match(/^[^_]+_(.+)$/);
        if (!match) return [];
        const subject = match[1];
        const prefix = String(item.id).split('_', 1)[0].toUpperCase();
        const filePrefixes = {
            CID: ['Character'], BID: ['Backpack'], EID: ['Emote'],
            Pickaxe: ['Pickaxe'], Glider: ['Glider'], Wrap: ['Wrap'],
        };
        const wantedPrefixes = filePrefixes[prefix] || [prefix];
        const out = new Map();
        const add = (raw, reason) => {
            if (!raw || out.has(raw)) return;
            out.set(raw, reason);
        };

        for (const raw of assets) {
            const clean = raw.replace(/\\/g, '/');
            const file = clean.slice(clean.lastIndexOf('/') + 1);
            const stem = file.replace(/\.(?:uasset|umap)$/i, '');
            const dir = clean.slice(0, clean.lastIndexOf('/'));

            // Character_ApronChow, Backpack_ApronChow, etc.: learn the
            // directory from existing <Type>_<OtherName> assets.
            for (const filePrefix of wantedPrefixes) {
                if (!new RegExp(`^${filePrefix}_[^/]+$`, 'i').test(stem)) continue;
                add(`${dir}/${filePrefix}_${subject}.uasset`, `${filePrefix}_* pattern`);
            }

            // Emote_GuardHence_Joiner1_CMM_M in Emotes/GuardHence/CMM
            // becomes Emote_ApronChow_Joiner1_CMM_M in Emotes/ApronChow/CMM.
            if (prefix === 'EID') {
                const emote = clean.match(/(?:^|\/)Emotes\/([^/]+)\/([^/]+)\/([^/]+)$/i);
                if (emote && /^Emote_/i.test(stem) && stem.toLowerCase().includes(emote[1].toLowerCase())) {
                    add(replaceAllInsensitive(clean, emote[1], subject), 'Emotes/<name> pattern');
                }
            }

            // If a path already contains the cosmetic name, reuse its layout
            // with the known name substituted. This covers new naming families.
            if (clean.toLowerCase().includes(subject.toLowerCase())) continue;
        }
        return [...out.keys()].slice(0, 80);
    }

    function guessSection() {
        const wrap = document.createElement('div');
        wrap.className = 'asset-guess';
        const h = document.createElement('h4');
        h.textContent = t('items.guessTitle');
        const hint = document.createElement('p');
        hint.className = 'guess-hint';
        hint.textContent = t('items.guessHint');
        const body = document.createElement('div');
        body.className = 'result-box';
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'btn btn-small';
        button.textContent = t('items.guessButton');
        button.addEventListener('click', async () => {
            setBox(body, 'loading', t('items.searching'));
            try {
                const assets = await FT.assets.load('all');
                A.guesses = guessedAssetPaths(A.item, assets);
                if (!A.guesses.length) return setBox(body, 'error', t('items.guessNone'));
                setBox(body, 'success', linesEl(A.guesses.map(value => ({ tag: t('items.guessed'), value: assetDisplay(value) }))));
            } catch (e) {
                setBox(body, 'error', t('items.assetFail'));
            }
        });
        wrap.append(h, hint, button, body);
        return wrap;
    }

    function renderAssets() {
        const host = $('r-assets');
        host.replaceChildren();
        if (!A.exact.length && !A.related.length) {
            const box = document.createElement('div');
            setBox(box, 'error', t('items.noAsset'));
            host.appendChild(box);
            host.appendChild(guessSection());
            return;
        }
        A.shown = { exact: 0, related: 0 };
        if (!A.exact.length) host.appendChild(guessSection());
        for (const kind of ['exact', 'related']) {
            if (!A[kind].length) continue;
            host.appendChild(assetSection(kind));
            fillAssets(kind, ASSET_CHUNK);
        }
    }

    function syncAssetOpts() {
        $('fmt-on').setAttribute('aria-pressed', String(S.fmt));
        $('fmt-off').setAttribute('aria-pressed', String(!S.fmt));
        $('opt-c').checked = S.addC;
        $('opt-c').disabled = !S.fmt;
    }

    async function runAssetSearch(item, token) {
        const host = $('r-assets');
        host.replaceChildren();
        const box = document.createElement('div');
        setBox(box, 'loading', t('items.searching'));
        host.appendChild(box);
        syncAssetOpts();
        try {
            const { exact, related } = await FT.assets.findContaining(item.id);
            if (token !== openToken) return;
            A.exact = exact; A.related = related; A.item = item;
            renderAssets();
        } catch (e) {
            if (token !== openToken) return;
            host.replaceChildren();
            const err = document.createElement('div');
            setBox(err, 'error', t('items.assetFail'));
            host.appendChild(err);
        }
    }

    function openDetail(id) {
        const item = S.byId.get(id);
        if (!item) return;
        S.openId = id;
        const token = ++openToken;

        // header
        const imgWrap = $('d-img').parentElement;
        imgWrap.replaceChildren(Object.assign(document.createElement('img'), { id: 'd-img', alt: item.name }));
        const big = $('d-img');
        big.src = item.large || item.small;
        big.addEventListener('error', () => { if (big.src !== item.small && item.small) big.src = item.small; }, { once: true });

        $('d-name').textContent = item.name;
        const badges = $('d-badges');
        badges.replaceChildren();
        const addBadge = (text, cls = 'badge outline') => { const b = document.createElement('span'); b.className = cls; b.textContent = text; badges.appendChild(b); };
        if (isNew(item)) addBadge(t('home.new'), 'badge');
        addBadge(catLabel(item.group, item));
        if (item.rarity) addBadge(item.rarity);

        $('d-id').textContent = item.id;
        $('d-copy').onclick = e => ui.copy(item.id, e.currentTarget);

        const meta = $('d-meta');
        meta.replaceChildren();
        const rows = [[t('items.set'), item.set], [t('items.introduced'), item.intro], [t('items.added'), fmtDate(item.added)]];
        for (const [k, v] of rows) {
            if (!v || v === '—') continue;
            const dt = document.createElement('dt'); dt.textContent = k;
            const dd = document.createElement('dd'); dd.textContent = v;
            meta.append(dt, dd);
        }
        $('d-desc').textContent = item.description;

        // EID → conversions
        const isEmote = /^EID_/i.test(item.id);
        $('d-convert').hidden = !isEmote;
        if (isEmote) {
            runConvert('r-anim', token, t('items.fetchAnim'), () => emoteToAnimation(item.id),
                r => [{ tag: t('items.male'), value: r.male }, { tag: t('items.female'), value: r.female }]);
            runConvert('r-seq', token, t('items.fetchSeq'), () => emoteToSequenceAnimation(item.id),
                r => [{ value: r }]);
            runConvert('r-audio', token, t('items.fetchAudio'), () => emoteToAudio(item.id),
                r => r.map(value => ({ value })));
        }

        // Search Assets result (for every item; it's the main result for CID etc.)
        runAssetSearch(item, token);

        document.body.style.overflow = 'hidden';
        if (!dom.dlg.open) dom.dlg.showModal();
        dom.dlg.querySelector('.d-body').scrollTop = 0;
    }

    function closeDetail() { openToken++; S.openId = null; dom.dlg.close(); }

    dom.dlg.addEventListener('close', () => { document.body.style.overflow = ''; });
    $('d-close').addEventListener('click', closeDetail);
    dom.dlg.addEventListener('click', e => { if (e.target === dom.dlg) closeDetail(); });   // backdrop tap

    dom.list.addEventListener('click', e => {
        const row = e.target.closest('.item-row');
        if (row) openDetail(row.dataset.id);
    });

    // ── Events ───────────────────────────────────────────────
    let debounce;
    dom.q.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => applyFilters(), 120); });
    [dom.rarity, dom.sort].forEach(el => el.addEventListener('change', () => applyFilters()));
    dom.cats.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const g = chip.dataset.group;
        if (S.cats.has(g)) S.cats.delete(g); else S.cats.add(g);
        chip.setAttribute('aria-pressed', String(S.cats.has(g)));
        applyFilters();
    });
    dom.reset.addEventListener('click', clearFilters);
    dom.recent.addEventListener('click', () => {
        const on = dom.recent.getAttribute('aria-pressed') !== 'true';
        dom.recent.setAttribute('aria-pressed', String(on));
        applyFilters();
    });

    // asset options in the detail sheet: formatted ⇄ raw, + _C
    function setFmt(on) {
        S.fmt = on;
        localStorage.setItem('ft.items.fmt', on ? 'formatted' : 'raw');
        syncAssetOpts();
        if (A.item && (A.exact.length || A.related.length)) renderAssets();
    }
    $('fmt-on').addEventListener('click', () => setFmt(true));
    $('fmt-off').addEventListener('click', () => setFmt(false));
    $('opt-c').addEventListener('change', e => {
        S.addC = e.target.checked;
        localStorage.setItem('ft.items.addC', S.addC ? '1' : '0');
        if (A.item && (A.exact.length || A.related.length)) renderAssets();
    });

    // site-wide language switch → reload item names in that language
    document.addEventListener('ft:langchange', e => {
        S.lang = e.detail;
        renderStatus();
        const reopen = S.openId;
        load().then(() => { if (reopen && S.byId.has(reopen)) openDetail(reopen); });
    });
    dom.refresh.addEventListener('click', () => poll({ manual: true }));

    // deep link support: items.html#EID_DanceMoves opens that item
    function openFromHash() {
        const id = decodeURIComponent(location.hash.slice(1));
        if (id && S.byId.has(id)) openDetail(id);
    }

    load().then(() => { S.lastCheck = new Date(); renderStatus(); openFromHash(); });
})();

// ─────────────────────────────────────────────────────────────
//  Shared asset helpers (used by SearchAssets, Convert, Items)
//  Everything lives under window.FT so it can't clash with page scripts.
// ─────────────────────────────────────────────────────────────
window.FT = window.FT || {};

FT.assets = (() => {
    const DATA_BASE = new URL('../data/', document.currentScript.src).href;
    const FILES = { all: 'fortnite_assets.gz', new: 'fortnite_assets_new.gz' };
    const cache = {};

    async function loadGzip(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
        const buf = await res.arrayBuffer();
        const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(stream).text();
        return text.split('\n').map(p => p.trim()).filter(Boolean);
    }

    /** kind: 'all' | 'new'. Loaded once, then cached. */
    function load(kind = 'all') {
        if (!cache[kind]) {
            cache[kind] = loadGzip(DATA_BASE + FILES[kind]).catch(e => { delete cache[kind]; throw e; });
        }
        return cache[kind];
    }

    const baseName = p => {
        const s = p.slice(p.lastIndexOf('/') + 1);
        return s.replace(/\.uasset$/i, '').toLowerCase();
    };

    /** All asset paths whose file name is exactly `id` (case-insensitive). */
    async function findById(id) {
        const target = String(id).toLowerCase();
        return (await load('all')).filter(p => baseName(p) === target);
    }

    /** Every asset path that contains `id` anywhere (case-insensitive) — exact file matches come first. */
    async function findContaining(id) {
        const target = String(id).toLowerCase();
        const exact = [], related = [];
        for (const p of await load('all')) {
            const l = p.toLowerCase();
            if (!l.includes(target)) continue;
            (baseName(p) === target ? exact : related).push(p);
        }
        return { exact, related };
    }

    /** One pass over the whole list for many ids → Map(lowercased id → paths[]). */
    async function findByIds(ids) {
        const wanted = new Set([...ids].map(i => String(i).toLowerCase()));
        const out = new Map();
        for (const p of await load('all')) {
            const n = baseName(p);
            if (wanted.has(n)) {
                if (!out.has(n)) out.set(n, []);
                out.get(n).push(p);
            }
        }
        return out;
    }

    /** "FortniteGame/Content/Athena/X.uasset" → "/Game/Athena/X.X" (+ "_C") */
    function formatPath(assetPath, addC = false) {
        let p = assetPath.trim().replace(/^\.?\//, '');
        let m;
        if (p.startsWith('FortniteGame/Content/')) {
            p = p.replace(/^FortniteGame\/Content\//, '/Game/');
        } else if ((m = p.match(/^(?:FortniteGame\/)?Plugins\/GameFeatures\/(.+?)\/Content\/(.+)$/))) {
            p = `/${m[1]}/${m[2]}`;
        } else if (p.startsWith('/Plugins/GameFeatures/') && (m = p.match(/^\/Plugins\/GameFeatures\/(.+?)\/Content\/(.+)$/))) {
            p = `/${m[1]}/${m[2]}`;
        } else if (p.startsWith('FortniteGame/')) {
            p = p.replace(/^FortniteGame\//, '/Game/');
        } else if ((m = p.match(/^([^/]+)\/Content\/(.+)$/))) {
            p = `/${m[1]}/${m[2]}`;
        }
        p = p.replace(/\.uasset$/i, '');
        const last = p.slice(p.lastIndexOf('/') + 1);
        if (!p.endsWith(`.${last}`)) p += `.${last}`;
        return addC ? p + '_C' : p;
    }

    return { load, findById, findByIds, findContaining, formatPath };
})();

// ── Small UI helpers ─────────────────────────────────────────
FT.ui = (() => {
    let toastEl, toastTimer;
    function toast(msg, ms = 2200) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'toast';
            toastEl.setAttribute('role', 'status');
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
    }

    async function copy(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); ta.remove();
        }
        toast(window.FT.i18n ? FT.i18n.t('common.copied') : 'Copied');
        if (btn) {
            const old = btn.textContent;
            btn.textContent = '✔';
            setTimeout(() => { btn.textContent = old; }, 1500);
        }
    }

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    return { toast, copy, esc };
})();

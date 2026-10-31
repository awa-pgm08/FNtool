// ─────────────────────────────────────────────────────────────
//  Fortnite-API (https://fortnite-api.com) cosmetics wrapper
//    GET /v2/cosmetics        → every cosmetic (br, tracks, instruments, cars, lego, beans…)
//    GET /v2/cosmetics/new    → newest build's additions + build hash (cheap to poll)
// ─────────────────────────────────────────────────────────────
window.FT = window.FT || {};

FT.cosmetics = (() => {
    const API = 'https://fortnite-api.com/v2/cosmetics';
    const DAY = 86400000;

    const CATEGORY_LABEL = {
        br: 'Battle Royale', tracks: 'Jam Track', instruments: 'Instrument',
        cars: 'Car', lego: 'LEGO', legoKits: 'LEGO Kit', beans: 'Bean',
    };

    const RARITY_RANK = {
        common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6,
        transcendent: 7, icon: 8, marvel: 8, dc: 8, starwars: 8, gaminglegends: 8,
        shadow: 8, slurp: 8, frozen: 8, lava: 8, dark: 8,
    };

    async function getJSON(url) {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Fortnite-API returned ${res.status}`);
        const json = await res.json();
        if (json.status && json.status !== 200) throw new Error(json.error || `API status ${json.status}`);
        return json.data;
    }

    // Fine-grained category used by the Items chips: skin, emote, pickaxe … (BR types), or the non-BR category.
    const TYPE_ALIAS = { petcarrier: 'pet' };
    function groupOf(category, typeValue) {
        if (category !== 'br') return category;
        const v = typeValue || 'other';
        return TYPE_ALIAS[v] || v;
    }

    function normalize(r, category) {
        const label = CATEGORY_LABEL[category] || category;
        const img = r.images || {};
        const small = img.smallIcon || img.small || img.icon || img.large || r.albumArt || '';
        const item = {
            id: r.id,
            name: r.name || r.title || r.id,
            description: r.description || (r.artist ? `${r.artist}${r.album ? ' — ' + r.album : ''}` : ''),
            category,
            type: r.type?.displayValue || label,
            typeValue: r.type?.value || category,
            rarity: r.rarity?.displayValue || '',
            rarityValue: r.rarity?.value || '',
            group: groupOf(category, r.type?.value),
            rarityRank: RARITY_RANK[r.rarity?.value] ?? 0,
            set: r.set?.value || '',
            intro: r.introduction?.text || '',
            added: r.added ? Date.parse(r.added) : 0,
            small,
            large: img.icon || img.featured || img.large || small,
            path: r.path || '',
        };
        item.search = [item.id, item.name, item.set, item.type, item.rarity, item.intro, r.artist || '']
            .join(' ').toLowerCase();
        return item;
    }

    /** API returns an array (br only) or an object of arrays — handle both. */
    function flatten(data) {
        const out = [];
        if (Array.isArray(data)) {
            data.forEach(r => out.push(normalize(r, 'br')));
        } else if (data && typeof data === 'object') {
            for (const [cat, list] of Object.entries(data)) {
                if (Array.isArray(list)) list.forEach(r => out.push(normalize(r, cat)));
            }
        }
        return out.filter(i => i.id);
    }

    async function loadAll(lang = 'en') {
        return flatten(await getJSON(`${API}?language=${encodeURIComponent(lang)}`));
    }

    async function checkNew(lang = 'en') {
        const d = await getJSON(`${API}/new?language=${encodeURIComponent(lang)}`);
        return { hash: d.hash || '', build: d.build || '', date: d.date || '', items: flatten(d.items) };
    }

    const isRecent = (item, days = 7) => item.added && item.added >= Date.now() - days * DAY;

    return { loadAll, checkNew, isRecent, DAY };
})();

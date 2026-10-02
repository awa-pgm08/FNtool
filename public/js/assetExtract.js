// ─────────────────────────────────────────────────────────────
//  Asset-code extraction from arbitrary files (used by SearchAssets)
//
//  Works on "any shape" of input: plain lists, JSON, CSV, logs, pasted
//  chat text, formatted paths (/Game/X.X_C), raw paths
//  (FortniteGame/Content/X.uasset) or bare IDs (CID_001_...).
//
//    FT.extract.readText(file)              → Promise<string>
//    FT.extract.collect(text, source, map)  → adds codes into `map`
// ─────────────────────────────────────────────────────────────
window.FT = window.FT || {};

FT.extract = (() => {
    const MAX_BYTES = 25 * 1024 * 1024;

    // Tokens that are file extensions / domains, never asset names.
    const NOT_NAMES = new Set([
        'uasset', 'umap', 'uexp', 'ubulk', 'uptnl', 'ufont', 'pak', 'ucas', 'utoc',
        'json', 'txt', 'csv', 'tsv', 'log', 'ini', 'xml', 'html', 'htm', 'js', 'css', 'md', 'yml', 'yaml',
        'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp3', 'wav', 'ogg', 'mp4',
        'com', 'net', 'org', 'gg', 'io', 'app', 'dev', 'http', 'https', 'www',
    ]);

    // Config/data files that really exist in the asset list under their full name.
    const DATA_EXT = new Set(['ini', 'json', 'txt', 'xml', 'csv', 'tsv', 'log', 'yml', 'yaml']);

    // path/word-ish run: optional leading "/", then letters, digits, _ - . + /
    const TOKEN = /\/?[A-Za-z0-9_][A-Za-z0-9_\-.+\/]*/g;

    /** A bare word is only treated as an asset code if it looks like one. */
    const looksLikeAsset = n => n.length >= 4 && /[A-Za-z]/.test(n) && (n.includes('_') || /\d/.test(n));

    function addCode(map, name, hint, source) {
        // "Foo_C" (blueprint class) and "Foo" are the same asset → one entry.
        const lower = name.toLowerCase();
        const key = lower.length > 4 && lower.endsWith('_c') ? lower.slice(0, -2) : lower;
        let it = map.get(key);
        if (!it) {
            it = { key, label: hint || name, hint: hint || '', count: 0, files: new Set() };
            map.set(key, it);
        } else if (hint && !it.hint) {
            it.hint = hint;
            it.label = hint;
        }
        it.count++;
        it.files.add(source);
    }

    /** Scan `text` and add every asset-like code to `map` (key → item). */
    function collect(text, source, map) {
        text = text.replace(/\\\//g, '/');            // JSON-escaped slashes
        TOKEN.lastIndex = 0;
        let m;
        while ((m = TOKEN.exec(text))) {
            const tok = m[0].replace(/[.\-+\/]+$/, '');
            if (tok.length < 3) continue;

            const slashes = (tok.match(/\//g) || []).length;
            const isPath = slashes >= 2 || (slashes === 1 && tok.startsWith('/'));
            const seg = tok.slice(tok.lastIndexOf('/') + 1);

            // "Name.Name_C", "Name.uasset", "A-B" → individual candidate names
            const pieces = seg.split(/[.\-]/).filter(p => p && !NOT_NAMES.has(p.toLowerCase()));
            const names = new Set(pieces);
            const whole = seg.replace(/\.uasset$/i, '');
            if (seg.includes('-')) names.add(whole);   // real asset names can contain "-" (e.g. M_Color_0-0-127)
            const ext = whole.match(/\.([A-Za-z0-9]+)$/);
            if (ext && DATA_EXT.has(ext[1].toLowerCase())) names.add(whole);   // e.g. DefaultGame.ini

            for (const name of names) {
                if (name.length < 2 || !/[A-Za-z]/.test(name)) continue;
                if (isPath) addCode(map, name, tok, source);
                else if (looksLikeAsset(name)) addCode(map, name, '', source);
            }
        }
        return map;
    }

    /** Read any file as text: gzip, UTF-8 / UTF-16, even binary (printable strings survive). */
    async function readText(file) {
        const tooBig = () => Object.assign(new Error('file too large'), { code: 'TOO_BIG' });
        if (file.size > MAX_BYTES) throw tooBig();

        let buf = new Uint8Array(await file.arrayBuffer());
        if (buf[0] === 0x1f && buf[1] === 0x8b) {
            const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
            buf = new Uint8Array(await new Response(stream).arrayBuffer());
            if (buf.length > MAX_BYTES) throw tooBig();
        }
        let enc = 'utf-8';
        if (buf[0] === 0xff && buf[1] === 0xfe) enc = 'utf-16le';
        else if (buf[0] === 0xfe && buf[1] === 0xff) enc = 'utf-16be';
        return new TextDecoder(enc).decode(buf).replace(/\u0000/g, ' ');
    }

    return { readText, collect, MAX_BYTES };
})();

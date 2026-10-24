(() => {
    'use strict';

    const API = 'https://api.fortniteapi.com/v1';
    let cachedLatest = null;
    let pendingLatest = null;

    async function getJson(url) {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
    }

    function hasBothTerms(path) {
        const lower = String(path || '').toLowerCase();
        return lower.includes('sm') && lower.includes('mesh');
    }

    async function fetchLatest() {
        const versions = await getJson(`${API}/versions`);
        const latest = versions.find(entry => entry.meta?.tag === 'latest' && entry.version?.id)
            || versions.find(entry => entry.meta?.state === 'READY' && entry.version?.id)
            || versions.find(entry => entry.version?.id);
        if (!latest) throw new Error('No game version is available.');
        const version = latest.version.id;

        const aesUrl = new URL(`${API}/aes`);
        aesUrl.searchParams.set('Version', version);
        const aes = await getJson(aesUrl.href);
        const pakIds = [...new Set((aes.dynamicKeys || [])
            .map(key => String(key.name || '').match(/pakchunk(\d+)/i)?.[1])
            .filter(Boolean))];
        if (!pakIds.length) throw new Error('No indexed PAKs are available for the latest version.');

        let nextIndex = 0;
        let failed = 0;
        const paths = new Set();
        const worker = async () => {
            while (true) {
                const index = nextIndex++;
                if (index >= pakIds.length) return;
                try {
                    const url = new URL(`${API}/aes/${encodeURIComponent(pakIds[index])}`);
                    url.searchParams.set('Version', version);
                    const body = await getJson(url.href);
                    for (const archive of body.data || []) {
                        for (const path of archive.files || []) {
                            if (typeof path === 'string' && hasBothTerms(path)) paths.add(path.replace(/\\/g, '/'));
                        }
                    }
                } catch (error) {
                    failed++;
                    console.warn(`FortniteAPI PAK ${pakIds[index]} failed:`, error);
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(5, pakIds.length) }, worker));
        if (failed === pakIds.length) throw new Error('All PAK index requests failed.');

        return {
            version,
            paks: pakIds.length,
            failed,
            files: [...paths].sort((a, b) => a.localeCompare(b)),
        };
    }

    async function loadLatest({ force = false } = {}) {
        if (!force && cachedLatest) return cachedLatest;
        if (!force && pendingLatest) return pendingLatest;
        pendingLatest = fetchLatest();
        try {
            cachedLatest = await pendingLatest;
            return cachedLatest;
        } finally {
            pendingLatest = null;
        }
    }

    function downloadUrl(path, version) {
        const url = new URL(`${API}/export/download`);
        url.searchParams.set('Path', path);
        url.searchParams.set('Version', version);
        return url.href;
    }

    window.FT = window.FT || {};
    window.FT.versionedMeshes = { loadLatest, downloadUrl };
})();

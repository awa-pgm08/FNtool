(() => {
    'use strict';

    const API = 'https://api.fortniteapi.com/v1';
    const $ = id => document.getElementById(id);
    const versionSelect = $('meshApiVersion');
    const loadButton = $('meshApiLoad');
    const exportButton = $('meshApiExport');
    const retryButton = $('meshApiRetry');
    const searchWrap = $('meshApiSearchWrap');
    const searchInput = $('meshApiSearch');
    const statusEl = $('meshApiStatus');
    const resultsEl = $('meshApiResults');
    const summaryEl = $('meshApiSummary');
    const listEl = $('meshApiFileList');

    const cache = new Map();
    let assets = [];
    let selectedData = null;
    let statusMessage = { key: 'meshApi.loadingVersions', params: {}, state: '' };

    const t = (key, params = {}) => window.FT?.i18n?.t(key, params) || key;

    function setStatus(key, params = {}, state = '') {
        statusMessage = { key, params, state };
        statusEl.textContent = t(key, params);
        statusEl.dataset.state = state;
    }

    async function getJson(url) {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
    }

    function renderVersions(versions) {
        versionSelect.replaceChildren();
        for (const entry of versions) {
            const version = entry.version || {};
            if (!version.id) continue;
            const option = document.createElement('option');
            option.value = version.id;
            const badge = entry.meta?.tag ? ` · ${entry.meta.tag}` : '';
            const build = version.build ? ` · build ${version.build}` : '';
            option.textContent = `${version.id}${badge}${build}`;
            versionSelect.appendChild(option);
        }
        const latest = versions.find(entry => entry.meta?.tag === 'latest' && entry.version?.id);
        if (latest) versionSelect.value = latest.version.id;
        versionSelect.disabled = versionSelect.options.length === 0;
        loadButton.disabled = versionSelect.disabled;
    }

    function isMeshAsset(path) {
        const normalized = String(path || '').replace(/\\/g, '/');
        if (!/\.uasset$/i.test(normalized)) return false;
        const basename = normalized.slice(normalized.lastIndexOf('/') + 1).replace(/\.uasset$/i, '');
        // Physics assets, materials, textures and skeleton-only packages are not mesh files.
        if (/^(?:PA_|PHYSICSASSET|M_|MI_|MF_|T_|TX_|SKEL_)/i.test(basename)) return false;
        const inMeshFolder = /\/(?:mesh|meshes|skeletalmesh|skeletalmeshes|staticmesh|staticmeshes)\//i.test(normalized);
        const meshName = /^(?:SM|SK|SKM|STATICMESH|SKELETALMESH|MESH)_/i.test(basename);
        return inMeshFolder || meshName;
    }

    async function loadPak(pakId, version) {
        const url = new URL(`${API}/aes/${encodeURIComponent(pakId)}`);
        url.searchParams.set('Version', version);
        const response = await getJson(url.href);
        const paths = [];
        for (const archive of response.data || []) {
            for (const path of archive.files || []) {
                if (typeof path === 'string' && isMeshAsset(path)) paths.push(path.replace(/\\/g, '/'));
            }
        }
        return paths;
    }

    async function fetchMeshFiles(version) {
        const aesUrl = new URL(`${API}/aes`);
        aesUrl.searchParams.set('Version', version);
        const aes = await getJson(aesUrl.href);
        const pakIds = [...new Set((aes.dynamicKeys || [])
            .map(key => String(key.name || '').match(/pakchunk(\d+)/i)?.[1])
            .filter(Boolean))];
        if (!pakIds.length) throw new Error('No indexed PAKs are available for this version.');

        let nextIndex = 0;
        let completed = 0;
        let failed = 0;
        const collected = new Set();
        const worker = async () => {
            while (true) {
                const index = nextIndex++;
                if (index >= pakIds.length) return;
                try {
                    for (const path of await loadPak(pakIds[index], version)) collected.add(path);
                } catch (error) {
                    failed++;
                    console.warn(`FortniteAPI PAK ${pakIds[index]} failed:`, error);
                } finally {
                    completed++;
                    setStatus('meshApi.loadingFiles', { version, done: completed, total: pakIds.length });
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(5, pakIds.length) }, worker));
        if (failed === pakIds.length) throw new Error('All PAK index requests failed.');
        return { version, paks: pakIds.length, failed, files: [...collected].sort((a, b) => a.localeCompare(b)) };
    }

    function updateLoadedStatus(data) {
        if (data.failed) {
            setStatus('meshApi.partial', { count: data.files.length, version: data.version, failed: data.failed }, 'error');
        } else if (!data.files.length) {
            setStatus('meshApi.noFiles');
        } else {
            setStatus('meshApi.loaded', { count: data.files.length, version: data.version, paks: data.paks });
        }
    }

    function exportList() {
        if (!selectedData) return;
        const query = searchInput.value.trim().toLowerCase();
        const exportedFiles = assets.filter(path => !query || path.toLowerCase().includes(query));
        const payload = {
            source: 'https://api.fortniteapi.com',
            version: selectedData.version,
            paksScanned: selectedData.paks,
            meshFiles: exportedFiles,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `fortnite-mesh-files-${selectedData.version}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        const objectUrl = link.href;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        setStatus('meshApi.exported');
    }

    function copyPath(path, button) {
        const done = () => {
            const old = button.textContent;
            button.textContent = t('meshApi.copied');
            setTimeout(() => { button.textContent = old; }, 1300);
        };
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(path).then(done).catch(() => fallbackCopy(path, done));
        } else fallbackCopy(path, done);
    }

    function fallbackCopy(path, done) {
        const input = document.createElement('textarea');
        input.value = path;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
        done();
    }

    function renderFiles() {
        listEl.replaceChildren();
        const query = searchInput.value.trim().toLowerCase();
        const matches = assets.filter(path => !query || path.toLowerCase().includes(query));
        summaryEl.textContent = selectedData
            ? t('meshApi.summary', { count: matches.length, total: assets.length, version: selectedData.version })
            : '';

        if (assets.length && !matches.length) {
            const empty = document.createElement('p');
            empty.className = 'mesh-api-summary';
            empty.textContent = t('meshApi.noSearchResults');
            listEl.appendChild(empty);
            return;
        }

        for (const path of matches) {
            const row = document.createElement('div');
            row.className = 'mesh-api-file-row';
            const text = document.createElement('code');
            text.className = 'mesh-api-file-path';
            text.textContent = path;

            const actions = document.createElement('div');
            actions.className = 'mesh-api-file-actions';
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'mesh-api-copy';
            copy.textContent = t('meshApi.copy');
            copy.addEventListener('click', () => copyPath(path, copy));

            const download = document.createElement('a');
            const downloadUrl = new URL(`${API}/export/download`);
            downloadUrl.searchParams.set('Path', path);
            downloadUrl.searchParams.set('Version', selectedData.version);
            download.href = downloadUrl.href;
            download.target = '_blank';
            download.rel = 'noopener noreferrer';
            download.className = 'mesh-api-download';
            download.textContent = t('meshApi.download');
            download.title = `${t('meshApi.download')} · v${selectedData.version}`;

            actions.append(copy, download);
            row.append(text, actions);
            listEl.appendChild(row);
        }
    }

    async function loadSelectedVersion() {
        const version = versionSelect.value;
        if (!version) return;
        loadButton.disabled = true;
        exportButton.hidden = true;
        searchWrap.hidden = true;
        resultsEl.hidden = true;
        searchInput.value = '';
        setStatus('meshApi.loadingFiles', { version, done: 0, total: 0 });
        try {
            selectedData = cache.get(version) || await fetchMeshFiles(version);
            cache.set(version, selectedData);
            assets = selectedData.files;
            searchWrap.hidden = false;
            searchInput.disabled = false;
            resultsEl.hidden = false;
            exportButton.hidden = !assets.length;
            renderFiles();
            updateLoadedStatus(selectedData);
        } catch (error) {
            selectedData = null;
            assets = [];
            setStatus('meshApi.loadFail', { error: error.message || String(error) }, 'error');
        } finally {
            loadButton.disabled = false;
        }
    }

    async function loadVersions() {
        retryButton.hidden = true;
        versionSelect.disabled = true;
        loadButton.disabled = true;
        setStatus('meshApi.loadingVersions');
        try {
            const data = await getJson(`${API}/versions`);
            const versions = (Array.isArray(data) ? data : []).filter(entry => entry.version?.id && entry.meta?.state !== 'FAILED');
            if (!versions.length) throw new Error('No game versions are available.');
            renderVersions(versions);
            setStatus('meshApi.versionReady');
        } catch (error) {
            setStatus('meshApi.versionFail', {}, 'error');
            retryButton.hidden = false;
        }
    }

    loadButton.addEventListener('click', loadSelectedVersion);
    retryButton.addEventListener('click', loadVersions);
    searchInput.addEventListener('input', renderFiles);
    exportButton.addEventListener('click', exportList);
    document.addEventListener('ft:langchange', () => {
        setStatus(statusMessage.key, statusMessage.params, statusMessage.state);
        if (selectedData) renderFiles();
    });

    loadVersions();
})();

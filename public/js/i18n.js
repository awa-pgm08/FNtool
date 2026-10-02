// ─────────────────────────────────────────────────────────────
//  i18n — English / 日本語 for the whole site.
//    HTML : data-i18n="key"  data-i18n-html="key"  data-i18n-placeholder="key"
//           data-i18n-title="key"  data-i18n-aria="key"
//    JS   : FT.i18n.t('key', { n: 3 })
//    Event: document 'ft:langchange' ({ detail: lang }) after a switch.
//  Language is shared by every page (localStorage "ft.lang").
// ─────────────────────────────────────────────────────────────
window.FT = window.FT || {};

FT.i18n = (() => {
    const STORE = 'ft.lang';

    const DICT = {
        en: {
            'nav.home': 'Home', 'nav.deviceMeshs': 'DeviceMeshs', 'nav.searchAssets': 'SearchAssets',
            'nav.items': 'Items', 'nav.convert': 'Convert', 'nav.pathModifier': 'PathModifier', 'nav.id': 'Id',
            'title.home': 'Fortnite Tools', 'title.items': 'Items · Fortnite Tools', 'title.searchAssets': 'Search Assets · Fortnite Tools',
            'title.convert': 'Convert · Fortnite Tools', 'title.deviceMeshs': 'DeviceMeshs · Fortnite Tools',
            'title.pathModifier': 'PathModifier · Fortnite Tools', 'title.id': 'Id · Fortnite Tools',
            'footer.help': 'If you have any problems, my Discord server is: <a href="производство">awa Community</a>.',
            'footer.helpApi': 'If you have any problems, my Discord server is: <a href="производство">awa Community</a>. Item data: <a href="https://fortnite-api.com" target="_blank" rel="noopener">Fortnite-API</a>.',
            'lang.label': 'Language', 'top': 'Back to top',

            'home.h2': 'Tools for Fortnite creators and datamining',
            'home.p': 'Look up cosmetics, find asset paths, and convert IDs into the paths you need.',
            'home.items': 'Browse every cosmetic. Search, filter by skin / emote / etc., sort, and get IDs and asset paths.',
            'home.searchAssets': 'Search the full asset list by keyword, or see assets added in the last 7 days.',
            'home.convert': 'Emote to animation, sequence and audio. Aura to VFX. Music pack to audio.',
            'home.deviceMeshs': 'Creative device meshes with playset paths and option keys.',
            'home.pathModifier': 'Turn a file path into an in-game asset path.',
            'home.id': 'Island playset and plot IDs.',
            'home.new': 'NEW',

            'common.copied': 'Copied', 'common.copy': 'Copy', 'common.close': 'Close', 'common.loading': 'Loading…',
            'common.all': 'All', 'common.new': 'New', 'common.retry': 'Retry',

            'items.search': 'Search name or ID (e.g. Renegade, EID_, CID_001)',
            'items.searchAria': 'Search items',
            'items.recent': 'Last 7 days', 'items.recentTip': 'Only items added in the last 7 days',
            'items.category': 'Category', 'items.categoryHint': 'Tap to combine. None selected = all.',
            'items.rarity': 'Rarity', 'items.sort': 'Sort', 'items.reset': 'Reset',
            'items.sort.added-desc': 'Recently added', 'items.sort.added-asc': 'Oldest added',
            'items.sort.name-asc': 'Name A → Z', 'items.sort.name-desc': 'Name Z → A',
            'items.sort.rarity-desc': 'Rarity high → low', 'items.sort.rarity-asc': 'Rarity low → high',
            'items.loading': 'Loading items…', 'items.loadFail': 'Could not load items from Fortnite-API.',
            'items.noMatch': 'No items match your filters.', 'items.clear': 'Clear filters',
            'items.count': '{n} items', 'items.countOf': '{n} of {total} items',
            'items.checked': 'checked {t}', 'items.offline': 'offline, retrying',
            'items.refresh': 'Refresh', 'items.refreshTip': 'Check for new items now',
            'items.newToast': '{n} new item(s) added', 'items.upToDate': 'Already up to date', 'items.unreachable': 'Could not reach Fortnite-API',
            'items.set': 'Set', 'items.introduced': 'Introduced', 'items.added': 'Added',
            'items.copyId': 'Copy ID',
            'items.convert': 'Convert', 'items.anim': 'Emote to Animation', 'items.seq': 'Emote to Sequence Animation', 'items.audio': 'Emote to Audio',
            'items.male': 'Male', 'items.female': 'Female',
            'items.fetchAnim': 'Fetching animation…', 'items.fetchSeq': 'Fetching sequence animation…', 'items.fetchAudio': 'Fetching audio…',
            'items.noData': 'No data found.', 'items.error': 'Something went wrong.',
            'items.assets': 'Search Assets', 'items.searching': 'Searching assets…',
            'items.noAsset': 'No asset found for this ID.', 'items.assetFail': 'Could not load the asset list.',
            'items.formatted': 'Formatted', 'items.raw': 'Raw path', 'items.addC': 'Add _C',
            'items.exact': 'Exact match ({n})', 'items.related': 'Related assets ({n})',
            'items.showMore': 'Show more ({n} left)', 'items.showAll': 'Show all',
            'items.tagPath': 'Path', 'items.tagFile': 'File',

            'sa.all': 'All', 'sa.new': 'New', 'sa.assetList': 'Asset list',
            'sa.keywords': 'Keywords separated by spaces or commas',
            'sa.formatted': 'Formatted', 'sa.addC': 'Add _C', 'sa.search': 'Search', 'sa.newAs': 'New AS',
            'sa.newAsTip': 'Assets of cosmetics added in the last 7 days',
            'sa.searching': 'Searching...', 'sa.assetPath': 'Asset Path', 'sa.showMore': 'Show more ({n} left)', 'sa.showAll': 'Show all',
            'sa.needKeyword': 'Enter at least one keyword', 'sa.loadFail': 'Failed to load the asset list',
            'sa.results': '{n} result(s) found', 'sa.none': 'No assets found.',
            'sa.findingNew': 'Finding assets added in the last 7 days...',
            'sa.newSummary': '{n} asset(s) from {c} cosmetic(s) added in the last {d} days',
            'sa.missing': '({m} not in the asset list yet)', 'sa.apiFail': 'Could not reach Fortnite-API. Try again in a moment.',
            'sa.viewJson': 'View JSON', 'sa.copyPath': 'Copy path',
            'sa.fileTitle': 'Search inside files', 'sa.fileHint': 'Upload TXT, JSON, logs, or other text files to find every asset reference inside.',
            'sa.chooseFiles': 'Choose files', 'sa.scanFiles': 'Scan files', 'sa.copyAll': 'Copy all results', 'sa.clearFiles': 'Clear',
            'sa.noFiles': 'Choose one or more files first.', 'sa.fileReadFail': 'Could not read one of the files.',
            'sa.fileSummary': '{f} file(s) scanned · {n} asset reference(s) found', 'sa.noFileMatches': 'No known asset references were found in these files.',

            'cat.outfit': 'Skin', 'cat.emote': 'Emote', 'cat.backpack': 'Back Bling', 'cat.pickaxe': 'Pickaxe',
            'cat.glider': 'Glider', 'cat.contrail': 'Contrail', 'cat.wrap': 'Wrap', 'cat.loadingscreen': 'Loading Screen',
            'cat.music': 'Lobby Music', 'cat.spray': 'Spray', 'cat.emoji': 'Emoticon', 'cat.toy': 'Toy',
            'cat.pet': 'Pet', 'cat.shoes': 'Kicks', 'cat.bannertoken': 'Banner', 'cat.cosmeticvariant': 'Variant',
            'cat.itemaccess': 'Item Access', 'cat.tracks': 'Jam Track', 'cat.instruments': 'Instrument',
            'cat.cars': 'Car', 'cat.lego': 'LEGO', 'cat.legoKits': 'LEGO Kit', 'cat.beans': 'Bean',
        },

        ja: {
            'nav.home': 'ホーム', 'nav.deviceMeshs': 'デバイスメッシュ', 'nav.searchAssets': 'アセット検索',
            'nav.items': 'アイテム', 'nav.convert': '変換', 'nav.pathModifier': 'パス変換', 'nav.id': 'ID',
            'title.home': 'Fortnite Tools', 'title.items': 'アイテム · Fortnite Tools', 'title.searchAssets': 'アセット検索 · Fortnite Tools',
            'title.convert': '変換 · Fortnite Tools', 'title.deviceMeshs': 'デバイスメッシュ · Fortnite Tools',
            'title.pathModifier': 'パス変換 · Fortnite Tools', 'title.id': 'ID · Fortnite Tools',
            'footer.help': '問題がある場合は、Discordサーバーまでご連絡ください：<a href="производство">awa Community</a>',
            'footer.helpApi': '問題がある場合は、Discordサーバーまでご連絡ください：<a href="производство">awa Community</a>　アイテムデータ：<a href="https://fortnite-api.com" target="_blank" rel="noopener">Fortnite-API</a>',
            'lang.label': '言語', 'top': 'ページの先頭へ',

            'home.h2': 'Fortniteクリエイターとデータマイニングのためのツール',
            'home.p': 'コスメティックの検索、アセットパスの検索、IDから必要なパスへの変換ができます。',
            'home.items': 'すべてのコスメティックを閲覧。スキン・エモートなどで絞り込み、並べ替え、IDやアセットパスの取得ができます。',
            'home.searchAssets': 'アセット一覧をキーワードで検索、または直近7日間に追加されたアセットを表示します。',
            'home.convert': 'エモートからアニメーション・シーケンス・オーディオへ。オーラからVFXへ。ミュージックパックからオーディオへ。',
            'home.deviceMeshs': 'クリエイティブデバイスのメッシュ（プレイセットパスとオプションキー付き）。',
            'home.pathModifier': 'ファイルパスをゲーム内アセットパスに変換します。',
            'home.id': 'アイランドのプレイセットとプロットのID。',
            'home.new': '新着',

            'common.copied': 'コピーしました', 'common.copy': 'コピー', 'common.close': '閉じる', 'common.loading': '読み込み中…',
            'common.all': 'すべて', 'common.new': '新着', 'common.retry': '再試行',

            'items.search': '名前またはIDで検索（例：Renegade、EID_、CID_001）',
            'items.searchAria': 'アイテムを検索',
            'items.recent': '直近7日間', 'items.recentTip': '直近7日間に追加されたアイテムのみ',
            'items.category': 'カテゴリ', 'items.categoryHint': 'タップで複数選択。未選択＝すべて。',
            'items.rarity': 'レアリティ', 'items.sort': '並べ替え', 'items.reset': 'リセット',
            'items.sort.added-desc': '追加が新しい順', 'items.sort.added-asc': '追加が古い順',
            'items.sort.name-asc': '名前 A → Z', 'items.sort.name-desc': '名前 Z → A',
            'items.sort.rarity-desc': 'レアリティ 高 → 低', 'items.sort.rarity-asc': 'レアリティ 低 → 高',
            'items.loading': 'アイテムを読み込み中…', 'items.loadFail': 'Fortnite-APIからアイテムを読み込めませんでした。',
            'items.noMatch': '条件に一致するアイテムがありません。', 'items.clear': '絞り込みを解除',
            'items.count': '{n} 件', 'items.countOf': '{total} 件中 {n} 件',
            'items.checked': '{t} に確認', 'items.offline': 'オフライン・再試行中',
            'items.refresh': '更新', 'items.refreshTip': '新しいアイテムを今すぐ確認',
            'items.newToast': '新しいアイテムが {n} 件追加されました', 'items.upToDate': '最新の状態です', 'items.unreachable': 'Fortnite-APIに接続できませんでした',
            'items.set': 'セット', 'items.introduced': '登場', 'items.added': '追加日',
            'items.copyId': 'IDをコピー',
            'items.convert': '変換', 'items.anim': 'エモート → アニメーション', 'items.seq': 'エモート → シーケンスアニメーション', 'items.audio': 'エモート → オーディオ',
            'items.male': '男性', 'items.female': '女性',
            'items.fetchAnim': 'アニメーションを取得中…', 'items.fetchSeq': 'シーケンスアニメーションを取得中…', 'items.fetchAudio': 'オーディオを取得中…',
            'items.noData': 'データが見つかりません。', 'items.error': 'エラーが発生しました。',
            'items.assets': 'アセット検索', 'items.searching': 'アセットを検索中…',
            'items.noAsset': 'このIDのアセットは見つかりません。', 'items.assetFail': 'アセット一覧を読み込めませんでした。',
            'items.formatted': '整形済み', 'items.raw': '元のパス', 'items.addC': '_C を付ける',
            'items.exact': '完全一致（{n}）', 'items.related': '関連アセット（{n}）',
            'items.showMore': 'さらに表示（残り {n} 件）', 'items.showAll': 'すべて表示',
            'items.tagPath': 'パス', 'items.tagFile': 'ファイル',

            'sa.all': 'すべて', 'sa.new': '新着', 'sa.assetList': 'アセット一覧',
            'sa.keywords': 'キーワード（スペースまたはカンマ区切り）',
            'sa.formatted': '整形済み', 'sa.addC': '_C を付ける', 'sa.search': '検索', 'sa.newAs': '新着AS',
            'sa.newAsTip': '直近7日間に追加されたコスメティックのアセット',
            'sa.searching': '検索中...', 'sa.assetPath': 'アセットパス', 'sa.showMore': 'さらに表示（残り {n} 件）', 'sa.showAll': 'すべて表示',
            'sa.needKeyword': 'キーワードを1つ以上入力してください', 'sa.loadFail': 'アセット一覧の読み込みに失敗しました',
            'sa.results': '{n} 件見つかりました', 'sa.none': 'アセットが見つかりません。',
            'sa.findingNew': '直近7日間に追加されたアセットを検索中...',
            'sa.newSummary': '直近{d}日間に追加された {c} 件のコスメティックから {n} 件のアセット',
            'sa.missing': '（{m} 件はまだアセット一覧にありません）', 'sa.apiFail': 'Fortnite-APIに接続できませんでした。しばらくしてからもう一度お試しください。',
            'sa.viewJson': 'JSONを表示', 'sa.copyPath': 'パスをコピー',
            'sa.fileTitle': 'ファイル内をアセット検索', 'sa.fileHint': 'TXT・JSON・ログなどをアップロードすると、ファイル内のアセット参照をすべて検索します。',
            'sa.chooseFiles': 'ファイルを選択', 'sa.scanFiles': 'ファイルを検索', 'sa.copyAll': '結果をすべてコピー', 'sa.clearFiles': 'クリア',
            'sa.noFiles': '先にファイルを1つ以上選択してください。', 'sa.fileReadFail': 'ファイルの読み込みに失敗しました。',
            'sa.fileSummary': '{f} ファイルを検索 · {n} 件のアセット参照を検出', 'sa.noFileMatches': '既知のアセット参照は見つかりませんでした。',

            'cat.outfit': 'スキン', 'cat.emote': 'エモート', 'cat.backpack': 'バックアクセサリー', 'cat.pickaxe': 'ツルハシ',
            'cat.glider': 'グライダー', 'cat.contrail': 'コントレイル', 'cat.wrap': 'ラップ', 'cat.loadingscreen': 'ロード画面',
            'cat.music': 'ロビーミュージック', 'cat.spray': 'スプレー', 'cat.emoji': 'エモーティコン', 'cat.toy': 'おもちゃ',
            'cat.pet': 'ペット', 'cat.shoes': 'シューズ', 'cat.bannertoken': 'バナー', 'cat.cosmeticvariant': 'バリアント',
            'cat.itemaccess': 'アイテムアクセス', 'cat.tracks': 'ジャムトラック', 'cat.instruments': '楽器',
            'cat.cars': '車', 'cat.lego': 'LEGO', 'cat.legoKits': 'LEGOキット', 'cat.beans': 'ビーン',
        },
    };

    const initial = () => {
        try {
            const saved = localStorage.getItem(STORE) || localStorage.getItem('ft.items.lang');
            if (saved === 'en' || saved === 'ja') return saved;
        } catch { /* storage blocked */ }
        return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
    };

    let lang = initial();

    /** key → string; {vars} are substituted. Falls back to English, then the key. */
    function t(key, vars) {
        let s = (DICT[lang] && DICT[lang][key]) ?? DICT.en[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
        return s;
    }
    const has = key => key in DICT.en;

    const NAV_KEYS = {
        'index.html': 'nav.home', 'deviceMeshs.html': 'nav.deviceMeshs', 'searchAssets.html': 'nav.searchAssets',
        'items.html': 'nav.items', 'convert.html': 'nav.convert', 'pathModifier.html': 'nav.pathModifier', 'id.html': 'nav.id',
    };
    const page = () => (location.pathname.split('/').pop() || 'index.html');
    const TITLE_KEYS = {
        'index.html': 'title.home', 'items.html': 'title.items', 'searchAssets.html': 'title.searchAssets',
        'convert.html': 'title.convert', 'deviceMeshs.html': 'title.deviceMeshs',
        'pathModifier.html': 'title.pathModifier', 'id.html': 'title.id',
    };

    function apply(root = document) {
        document.documentElement.lang = lang;
        root.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
        root.querySelectorAll('[data-i18n-html]').forEach(e => { e.innerHTML = t(e.dataset.i18nHtml); });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(e => { e.placeholder = t(e.dataset.i18nPlaceholder); });
        root.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
        root.querySelectorAll('[data-i18n-aria]').forEach(e => { e.setAttribute('aria-label', t(e.dataset.i18nAria)); });
        if (root === document) {
            // nav links are translated by target page, so no per-page markup is needed
            document.querySelectorAll('nav a[href]').forEach(a => {
                const key = NAV_KEYS[a.getAttribute('href').split('/').pop()] || (a.getAttribute('aria-current') ? NAV_KEYS[page()] : null);
                if (key) a.textContent = t(key);
            });
            const tk = TITLE_KEYS[page()];
            if (tk) document.title = t(tk);
            document.querySelectorAll('.header-arrow-up').forEach(a => a.setAttribute('aria-label', t('top')));
            document.querySelectorAll('.lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
        }
    }

    function set(next) {
        if (next !== 'en' && next !== 'ja') return;
        lang = next;
        try { localStorage.setItem(STORE, lang); localStorage.setItem('ft.items.lang', lang); } catch { /* ignore */ }
        apply();
        document.dispatchEvent(new CustomEvent('ft:langchange', { detail: lang }));
    }

    function mountSwitcher() {
        const bar = document.getElementById('header-container');
        if (!bar || bar.querySelector('.lang-switch')) return;
        const box = document.createElement('div');
        box.className = 'lang-switch';
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', t('lang.label'));
        for (const [code, label] of [['en', 'EN'], ['ja', '日本語']]) {
            const b = document.createElement('button');
            b.type = 'button'; b.dataset.lang = code; b.textContent = label;
            b.addEventListener('click', () => set(code));
            box.appendChild(b);
        }
        bar.appendChild(box);
    }

    const ready = () => { mountSwitcher(); apply(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();

    return { t, has, apply, set, get lang() { return lang; } };
})();

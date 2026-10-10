# FortniteToolsWeb

Static site (no build step). Serve the folder with any static host, e.g. `python3 -m http.server`.

## Pages
- **Items** – all cosmetics from [Fortnite-API](https://fortnite-api.com): search, filter (category chips such as skin / emote / pickaxe – multi-select, rarity, last 7 days), sort, auto-refresh every 2 min. Tap an item for ID, converter results (EID_*) and Search Assets results (every match: exact file name first, then related assets; Formatted ⇄ Raw path toggle, Add _C, Show all).
- **SearchAssets** – keyword search in the asset list. **New AS** = assets of cosmetics added in the last 7 days.
- **File search** – upload one or more TXT, JSON, log, or other text files to extract known Unreal asset references. Results support raw/formatted paths, `_C`, per-row copy, and copy-all.
- **Automatic data sync** – GitHub Actions checks `awa/FortniteToolsWeb` every 6 hours and updates the four files in `public/data` automatically. It can also be started manually from the Actions tab.
- **Convert / DeviceMeshs / PathModifier / Id** – unchanged features, new black & white theme.

## Structure
- `public/style/common.css` – shared theme (light/dark follows the OS)
- `public/js/assetLib.js` – asset list loading + path formatting (shared)
- `public/js/cosmeticsApi.js` – Fortnite-API wrapper (shared)
- `public/js/i18n.js` – English / 日本語 (header switch, saved in `localStorage` as `ft.lang`). Add text with `data-i18n="key"` in HTML or `FT.i18n.t('key')` in JS; keys live in the `DICT` object.

## Language
The whole site follows one language setting. On Items it also switches the item names/descriptions (Fortnite-API `language=en|ja`).
Nav, footer, home, Items and SearchAssets are fully translated; Convert / DeviceMeshs / PathModifier / Id currently translate the header, nav, title and footer only.

// ─────────────────────────────────────────────────────────────
//  Glass sidebar menu shared by every page.
//  Load in <head> (sync) together with style/sidebar.css and after
//  nothing else: it only needs FT.i18n at DOMContentLoaded.
//  Collapsed state is stored in localStorage "ft.sb" ("col" | "open").
// ─────────────────────────────────────────────────────────────
(function () {
    'use strict';

    // Put your Discord invite URL here. Leave empty to hide the Discord row.
    var DISCORD_URL = '';

    var SRC = document.currentScript && document.currentScript.src;
    if (!SRC) return;
    var root = document.documentElement;
    var KEY = 'ft.sb';
    var mq = window.matchMedia('(max-width:760px)');

    function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } }
    var saved = read();
    var col = saved ? saved === 'col' : window.innerWidth < 1000;

    root.classList.add('has-sb');
    if (col && !mq.matches) root.classList.add('sb-col');

    var ICON = {
        home: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3 2.8 11.2h2.6V20h5v-5.6h3.2V20h5v-8.8h2.6z"/></svg>',
        items: '<svg class="i" viewBox="0 0 24 24"><rect x="5" y="6.5" width="14" height="14.5" rx="2.6"/><rect x="7.5" y="3" width="9" height="2.2" rx="1" opacity=".55"/><path class="cut" d="M11 10.500h2v3.600l1.500-1.500 1.300 1.300L12 17.200l-3.800-3.300 1.300-1.300 1.500 1.500z"/></svg>',
        search: '<svg class="i" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7.500" ry="3"/><path d="M4.500 9.500v4c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3v-4c0 1.700-3.400 3-7.500 3s-7.500-1.300-7.500-3zM4.500 16v2c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3v-2c0 1.700-3.400 3-7.500 3s-7.500-1.300-7.500-3z"/></svg>',
        convert: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/></svg>',
        dev: '<svg class="i" viewBox="0 0 24 24"><rect x="2.500" y="4.500" width="13.500" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 19h6.500M9.200 14.500V19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="15" y="10" width="6.500" height="10.500" rx="1.700"/><circle class="cut" cx="18.250" cy="17.800" r=".9"/></svg>',
        path: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/></svg>',
        id: '<svg class="i" viewBox="0 0 24 24"><path d="M3 4.500v7.200l9.200 9.200a2 2 0 0 0 2.800 0l5.900-5.900a2 2 0 0 0 0-2.800L11.700 3.100H4.400A1.400 1.400 0 0 0 3 4.500z"/><circle class="cut" cx="8" cy="8" r="1.700"/></svg>'
    };
    var ITEMS = [
        { f: null,              k: 'nav.home',         i: 'home' },
        { f: 'items.html',      k: 'nav.items',        i: 'items',   badge: true },
        { f: 'searchAssets.html', k: 'nav.searchAssets', i: 'search' },
        { f: 'deviceMeshs.html', k: 'nav.deviceMeshs', i: 'dev' },
        { f: 'convert.html',    k: 'nav.convert',      i: 'convert' },
        { f: 'pathModifier.html', k: 'nav.pathModifier', i: 'path' },
        { f: 'id.html',         k: 'nav.id',           i: 'id' }
    ];
    var EN = { 'nav.home': 'Home', 'nav.items': 'Items', 'nav.searchAssets': 'SearchAssets', 'nav.convert': 'Convert', 'nav.deviceMeshs': 'DeviceMeshs', 'nav.pathModifier': 'PathModifier', 'nav.id': 'Id' };

    function hrefOf(it) { return new URL(it.f ? '../html/' + it.f : '../../index.html', SRC).href; }
    function pageName() { var p = location.pathname.split('/').pop(); return p || 'index.html'; }

    function build() {
        var cur = pageName();
        var nav = ITEMS.map(function (it) {
            var file = it.f || 'index.html';
            var on = file === cur;
            return '<a class="it' + (on ? ' on' : '') + '" href="' + hrefOf(it) + '"' + (on ? ' aria-current="page"' : '') + '>' +
                ICON[it.i] + '<span class="lb" data-i18n="' + it.k + '">' + EN[it.k] + '</span>' +
                (it.badge ? '<span class="bdg" data-i18n="home.new">NEW</span><span class="dot"></span>' : '') + '</a>';
        }).join('');

        var discord = DISCORD_URL ?
            '<a class="br up" href="' + DISCORD_URL + '" target="_blank" rel="noopener"><span class="ic"><span class="pro"><svg viewBox="0 0 24 24"><path d="M19.300 5.300A17 17 0 0 0 15.100 4l-.5 1a15 15 0 0 0-5.200 0l-.5-1a17 17 0 0 0-4.200 1.300C2 9.300 1.300 13.200 1.600 17a17 17 0 0 0 5.200 2.600l1.100-1.800a11 11 0 0 1-1.700-.8l.4-.3a12 12 0 0 0 10.800 0l.4.3a11 11 0 0 1-1.700.8l1.100 1.800a17 17 0 0 0 5.200-2.600c.4-4.400-.7-8.300-3.100-11.700zM8.700 14.800c-1 0-1.800-.9-1.800-2s.8-2 1.800-2 1.800.9 1.800 2-.8 2-1.800 2zm6.600 0c-1 0-1.800-.9-1.800-2s.8-2 1.800-2 1.800.9 1.800 2-.8 2-1.800 2z"/></svg></span></span><span class="lb" data-i18n="sb.discord">Join Discord</span>' +
            '<svg class="ar" viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6"/></svg></a>' : '';

        var html =
            '<aside id="sb" class="sb" aria-label="Sidebar"><div class="in">' +
            '<div class="wc" aria-hidden="true"><svg viewBox="0 0 10 10"><path d="M1.500 5h7"/></svg><svg viewBox="0 0 10 10"><rect x="1.800" y="1.800" width="6.400" height="6.400" rx="1.200"/></svg><svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2 2 8"/></svg></div>' +
            '<a class="hd" href="' + hrefOf(ITEMS[0]) + '" aria-label="Fortnite Tools"><svg class="lg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18.200" fill="#08090b" stroke="#fff" stroke-width="3.200"/><path fill="#fff" d="M11.200 31.300c-.9-5.400.6-9.600 4.300-12.600-.5-3 .3-5.600 2.500-8.200l1.100 4.300 3.900-5.400-.4 6.700c3.300 1.200 5.600 3.800 6.300 7.600-1.800-1.300-3.600-1.600-5.200-1 1.700.7 2.800 2.100 3 4.100-2-1.100-3.900-1.100-5.300.2.600 1.500.1 3.100-1.200 4.300-.4-2.500-1.700-3.800-3.700-3.700-.2 1.900-1.300 3.400-3 4.500z"/><path fill="#fff" d="M25.400 11.200c2.600.9 4.800 2.700 6 5.200-1.600-.5-3-.5-4.300.1.400-1.800.1-3.600-1.700-5.300z"/></svg><span class="tt">Fortnite Tools</span></a>' +
            '<label class="sr" id="sbs"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/></svg><input type="text" placeholder="Search" data-i18n-placeholder="sb.search" data-i18n-aria="sb.search" aria-label="Search" autocomplete="off"></label>' +
            '<div class="ml" data-i18n="sb.menu">Menu</div>' +
            '<div class="nv" role="navigation" aria-label="Menu">' + nav + '</div>' +
            '<div class="bt">' + discord +
            '<button class="br dl" type="button" id="sbLang"><span class="ic"><svg class="g" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.800 2.600 4 5.600 4 9s-1.200 6.400-4 9c-2.800-2.600-4-5.600-4-9s1.200-6.400 4-9z"/></svg></span><span class="lb" data-i18n="sb.lang">Language: English</span></button>' +
            '</div></div>' +
            '<button class="tg" id="sbt" type="button" aria-expanded="true"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button></aside>' +
            '<button class="sb-burger" id="sbb" type="button" data-i18n-aria="sb.open" aria-label="Open menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
            '<div class="sb-scrim" id="sbx"></div>';
        var box = document.createElement('div');
        box.innerHTML = html;
        while (box.firstChild) document.body.appendChild(box.firstChild);
    }

    function init() {
        build();
        var sb = document.getElementById('sb'), tg = document.getElementById('sbt');
        var input = sb.querySelector('input'), items = sb.querySelectorAll('.it');
        var t = function (k, d) { return (window.FT && FT.i18n) ? FT.i18n.t(k) : d; };

        function labels() {
            var c = sb.classList.contains('col');
            Array.prototype.forEach.call(items, function (a) {
                var l = a.querySelector('.lb').textContent;
                if (c) a.title = l; else a.removeAttribute('title');
            });
            tg.setAttribute('aria-expanded', String(!c));
            tg.setAttribute('aria-label', mq.matches ? t('sb.collapse', 'Close menu') : (c ? t('sb.expand', 'Expand sidebar') : t('sb.collapse', 'Collapse sidebar')));
        }
        function setCol(c, persist) {
            if (mq.matches) c = false;
            col = c;
            sb.classList.toggle('col', c);
            root.classList.toggle('sb-col', c);
            if (c) input.blur();
            if (persist) write(c ? 'col' : 'open');
            labels();
        }
        setCol(col, false);
        requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('sb-anim'); }); });

        tg.addEventListener('click', function () {
            if (mq.matches) root.classList.remove('sb-open'); else setCol(!sb.classList.contains('col'), true);
        });
        document.getElementById('sbs').addEventListener('click', function () {
            if (sb.classList.contains('col')) { setCol(false, true); setTimeout(function () { input.focus(); }, 320); }
        });
        document.getElementById('sbb').addEventListener('click', function () { root.classList.add('sb-open'); });
        document.getElementById('sbx').addEventListener('click', function () { root.classList.remove('sb-open'); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') root.classList.remove('sb-open'); });
        var onMq = function () { setCol(mq.matches ? false : (read() ? read() === 'col' : window.innerWidth < 1000), false); root.classList.remove('sb-open'); };
        if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);

        input.addEventListener('input', function () {
            var q = input.value.trim().toLowerCase();
            Array.prototype.forEach.call(items, function (a) {
                a.style.display = (!q || a.textContent.toLowerCase().indexOf(q) > -1) ? '' : 'none';
            });
        });
        document.getElementById('sbLang').addEventListener('click', function () {
            if (window.FT && FT.i18n) FT.i18n.set(FT.i18n.lang === 'ja' ? 'en' : 'ja');
        });
        document.addEventListener('ft:langchange', labels);
        window.addEventListener('load', labels);
        if (window.FT && FT.i18n) { FT.i18n.apply(); labels(); }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

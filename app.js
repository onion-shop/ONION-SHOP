/* Onion Shop · приложение: навигация, тема, аккаунты, кабинет, уровни, промокоды, калькулятор. */
(function () {
  'use strict';
  var O = window.ONION, SEC = window.OnionSec, QR = window.OnionQR;
  var root = document.documentElement;

  /* ============================== утилиты ============================== */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NB = ' ';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var I = function (n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var ICO = function (n, cls) { return '<span class="ico' + (cls ? ' ' + cls : '') + '">' + I(n) + '</span>'; };
  var fmt = function (n) { return (Math.round(n * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }); };
  var fmtInt = function (n) { return Math.round(n).toLocaleString('ru-RU'); };
  var rng = function (a, b, u) { return (Math.abs(a - b) < 0.005 ? fmt(a) : fmt(a) + '–' + fmt(b)) + (u ? NB + u : ''); };
  var plural = function (n, f) { n = Math.abs(Math.round(n)); var a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 10 || b >= 20)) ? 1 : 2]; };
  var daysWord = function (n) { return plural(n, ['день', 'дня', 'дней']); };
  var dateFmt = function (ts) { return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); };
  var dtFmt = function (ts) { return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toast(msg, type, icon) {
    var box = $('#toasts'); if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML = I(icon || (type === 'err' ? 'alert' : 'check-circle')) + '<span>' + msg + '</span>';
    box.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, 3200);
  }
  function copyText(text, selEl) {
    var done = function () { toast('Скопировано', 'ok', 'copy'); };
    var fallback = function () {
      if (selEl) { var r = document.createRange(); r.selectNodeContents(selEl); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast('Текст выделен — нажмите «Копировать»', 'ok', 'copy');
    };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }
  function shortUA() {
    var u = navigator.userAgent, os = /iPhone|iPad/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Mac OS/.test(u) ? 'macOS' : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : 'Устройство';
    var br = /YaBrowser/.test(u) ? 'Яндекс Браузер' : /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Браузер';
    return br + ' · ' + os;
  }

  /* ============================== хранилище ============================== */
  var Store = (function () {
    var mem = {}, ok = true;
    try { localStorage.setItem('__onion', '1'); localStorage.removeItem('__onion'); } catch (e) { ok = false; }
    return {
      ok: ok,
      get: function (k, d) {
        if (ok) { try { var v = localStorage.getItem(k); if (v != null) return JSON.parse(v); } catch (e) { } }
        return k in mem ? JSON.parse(mem[k]) : d;
      },
      set: function (k, v) { var s = JSON.stringify(v); mem[k] = s; if (ok) { try { localStorage.setItem(k, s); } catch (e) { } } },
      del: function (k) { delete mem[k]; if (ok) { try { localStorage.removeItem(k); } catch (e) { } } }
    };
  })();
  var K_USERS = 'onion.users.v1', K_SESSION = 'onion.session.v1';

  /* ============================== тема ============================== */
  var Theme = {
    mode: function () { try { var m = localStorage.getItem('onion.theme'); return m === 'dark' || m === 'light' ? m : 'auto'; } catch (e) { return root.getAttribute('data-ui') || 'auto'; } },
    set: function (m) {
      try { if (m === 'auto') localStorage.removeItem('onion.theme'); else localStorage.setItem('onion.theme', m); } catch (e) { }
      if (m === 'dark' || m === 'light') root.setAttribute('data-ui', m); else root.removeAttribute('data-ui');
      Theme.sync();
    },
    effective: function () { return /light/.test(getComputedStyle(root).colorScheme || '') ? 'light' : 'dark'; },
    sync: function () {
      var light = Theme.effective() === 'light';
      root.classList.toggle('is-light', light);
      var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', light ? '#eef3fc' : '#050a1d');
      var b = $('#themeBtn'); if (b) b.setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
      $$('.theme-pick button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.mode === Theme.mode())); });
    }
  };
  $('#themeBtn').addEventListener('click', function () { Theme.set(Theme.effective() === 'light' ? 'dark' : 'light'); });
  if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: light)'); (mq.addEventListener ? mq.addEventListener('change', Theme.sync) : mq.addListener(Theme.sync)); }
  new MutationObserver(Theme.sync).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  Theme.sync();

  /* ============================== аккаунты ============================== */
  var Acc = {
    all: function () { return Store.get(K_USERS, {}); },
    get: function (id) { return Acc.all()[id] || null; },
    byName: function (name) { var n = String(name || '').trim().toLowerCase(), a = Acc.all(); for (var k in a) if (a[k].uname === n) return a[k]; return null; },
    save: function (u) { var a = Acc.all(); a[u.id] = u; Store.set(K_USERS, a); },
    remove: function (id) { var a = Acc.all(); delete a[id]; Store.set(K_USERS, a); },
    newId: function () { var a = Acc.all(), id; do { id = 'ON-' + (100000 + (SEC.rand(4).reduce(function (s, x) { return s * 256 + x; }, 0) % 900000)); } while (a[id]); return id; }
  };
  var Session = {
    user: function () {
      var s = Store.get(K_SESSION, null);
      if (!s) return null;
      if (s.exp < Date.now()) { Store.del(K_SESSION); return null; }
      var u = Acc.get(s.uid);
      if (!u || u.token !== s.token) return null;
      return u;
    },
    start: function (u, remember) {
      u.token = SEC.token(16);
      u.logins = [{ at: Date.now(), ua: shortUA() }].concat(u.logins || []).slice(0, 6);
      Acc.save(u);
      Store.set(K_SESSION, { uid: u.id, token: u.token, exp: Date.now() + (remember ? 30 : 1) * 864e5 });
    },
    end: function () { Store.del(K_SESSION); }
  };

  function xpOf(u) { return (u.events || []).reduce(function (s, e) { return s + (e.xp || 0); }, 0); }
  function levelOf(xp) { var L = O.levels[0]; O.levels.forEach(function (l) { if (xp >= l.xp) L = l; }); return L; }
  function nextOf(L) { return O.levels.filter(function (l) { return l.n === L.n + 1; })[0] || null; }
  function initials(u) { var n = (u.profile && u.profile.name) || u.username; var p = n.trim().split(/\s+/); return ((p[0] || '')[0] + ((p[1] || '')[0] || (p[0] || '')[1] || '')).toUpperCase(); }
  function orderXp(o) { return O.orderXp.base + Math.floor(o.amount / 100) * O.orderXp.per100rub; }

  // Начислить очки один раз за ключ (задание, промокод, заказ)
  function grant(u, key, xp, title, opts) {
    u.events = u.events || [];
    if (u.events.some(function (e) { return e.k === key; })) return false;
    var before = levelOf(xpOf(u));
    u.events.push({ k: key, xp: xp, t: title, at: Date.now() });
    if (key.indexOf('quest:') === 0) { u.quests = u.quests || {}; u.quests[key.slice(6)] = true; }
    Acc.save(u);
    var after = levelOf(xpOf(u));
    if (!(opts && opts.silent)) {
      toast('<b>+' + xp + ' XP</b> · ' + esc(title), 'ok', 'sparkles');
      if (after.n > before.n) setTimeout(function () { levelUpModal(after); }, 450);
    }
    refreshChrome();
    return true;
  }
  function questDone(u, id) { return !!(u.quests && u.quests[id]); }
  function questGrant(u, id) { var q = O.quests.filter(function (x) { return x.id === id; })[0]; if (q && u) return grant(u, 'quest:' + id, q.xp, q.title); return false; }

  /* ============================== модальное окно ============================== */
  var lastFocus = null;
  function openModal(html, focusSel) {
    var m = $('#modal'), c = $('#modalCard');
    lastFocus = document.activeElement;
    c.innerHTML = html; m.hidden = false;
    var f = $(focusSel || 'button', c); if (f) f.focus();
  }
  function closeModal() { $('#modal').hidden = true; $('#modalCard').innerHTML = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  function levelUpModal(L) {
    var rays = ''; for (var k = 0; k < 12; k++) rays += '<i style="--a:' + (k * 30) + 'deg"></i>';
    openModal('<div class="burst" style="--c:' + L.color + '">' + rays + '<span class="lv-badge" style="--c:' + L.color + '">' + L.n + '</span></div>' +
      '<h2 id="modalTitle">Новый уровень: ' + esc(L.name) + '</h2><p>Теперь вам доступно:</p><ul>' +
      L.perks.map(function (p) { return '<li>' + I('check') + '<span>' + esc(p) + '</span></li>'; }).join('') + '</ul>' +
      '<button class="btn btn-block" type="button" data-close>Отлично</button>');
  }

  /* ============================== маршрутизация ============================== */
  var view = 'home';
  function showView(v) {
    var changed = v !== view; view = v;
    ['home', 'auth', 'cabinet'].forEach(function (x) { $('#view-' + x).hidden = x !== v; });
    $('.footer').hidden = v !== 'home';
    if (changed) window.scrollTo(0, 0);
    setTab();
    if (v === 'home' && window.OnionGlobe) window.OnionGlobe.redraw();
  }
  function route() {
    var h = decodeURIComponent((location.hash || '').slice(1));
    var u = Session.user();
    closeMenu();
    if (h === 'login' || h === 'signup') {
      if (u) { navigate('cabinet', true); return; }
      showView('auth'); authMode(h); return;
    }
    if (h === 'cabinet') {
      if (!u) { showView('auth'); authMode('login'); return; }
      showView('cabinet'); renderCabinet(); return;
    }
    var wasHome = view === 'home';
    showView('home');
    var el = h && h !== 'top' ? document.getElementById(h) : null;
    if (el && el.closest('#view-home')) {
      requestAnimationFrame(function () { el.scrollIntoView({ behavior: wasHome && !reduceMotion ? 'smooth' : 'auto', block: 'start' }); });
    } else if (h === 'top') window.scrollTo({ top: 0, behavior: wasHome && !reduceMotion ? 'smooth' : 'auto' });
  }
  function navigate(h, replace) {
    if (location.hash.slice(1) !== h) { try { history[replace ? 'replaceState' : 'pushState'](null, '', '#' + h); } catch (e) { location.hash = h; return; } }
    route();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-nav]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '#') return;
    e.preventDefault(); navigate(href.slice(1));
  });
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);

  // мобильное меню
  var burger = $('#burger'), mnav = $('#mnav');
  function closeMenu() { mnav.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Открыть меню'); }
  burger.addEventListener('click', function () {
    var open = mnav.hidden; mnav.hidden = !open;
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });

  // активная вкладка нижней панели
  var TAB_SECTIONS = ['tariffs', 'calc', 'levels'];
  function setTab() {
    var cur = 'top';
    if (view !== 'home') cur = 'cabinet';
    else {
      var line = window.innerHeight * 0.4;
      TAB_SECTIONS.forEach(function (id) { var el = document.getElementById(id); if (el && el.getBoundingClientRect().top < line) cur = id; });
      var lv = document.getElementById('levels');
      if (cur === 'levels' && lv && lv.getBoundingClientRect().bottom < line) cur = '';
    }
    $$('.tabbar a').forEach(function (a) { if (a.dataset.tab === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  var tick = false;
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; setTab(); }); } }, { passive: true });

  /* ============================== шапка ============================== */
  function refreshChrome() {
    var u = Session.user(), b = $('#acctBtn');
    if (u) {
      var L = levelOf(xpOf(u));
      b.className = 'acct in'; b.setAttribute('href', '#cabinet');
      b.style.setProperty('--lvl', L.color);
      b.setAttribute('aria-label', 'Личный кабинет: ' + u.username);
      b.innerHTML = '<span class="ava">' + esc(initials(u)) + '</span><span class="nm"><span>' + esc(u.username) + '</span><span class="lv">Ур. ' + L.n + ' · ' + esc(L.name) + '</span></span>';
    } else {
      b.className = 'acct'; b.setAttribute('href', '#login'); b.removeAttribute('aria-label'); b.style.removeProperty('--lvl');
      b.innerHTML = I('user') + '<span>Войти</span>';
    }
    $$('[data-guest]').forEach(function (x) { x.hidden = !!u; });
    renderLadder(); calc();
  }

  /* ============================== главная: сроки ============================== */
  (function () {
    var colors = ['var(--link)', 'var(--cyan)', 'var(--ok)', 'var(--warn)', 'var(--blue)'];
    var box = $('#tDest');
    var maxAll = Math.max.apply(null, O.timing.map(function (t) { return O.stages.reduce(function (s, x) { return s + x.days[1]; }, 0) + O.dest[t.id].days[1]; }));
    var scaleMax = Math.ceil(maxAll / 10) * 10;
    $('#tScale').innerHTML = [0, scaleMax / 2, scaleMax].map(function (v) { return '<span>' + v + ' дн</span>'; }).join('');
    box.innerHTML = O.timing.map(function (t, i) { return '<button type="button" aria-pressed="' + (i === 0) + '" data-id="' + t.id + '">' + I(t.icon) + t.label + '</button>'; }).join('');
    function render(id) {
      var d = O.dest[id];
      var st = O.stages.concat([{ name: d.mode === 'авиа' ? 'Авиадоставка до Москвы' : 'Доставка от склада к вам', days: d.days, label: rng(d.days[0], d.days[1]) + NB + 'дн', sub: d.mode === 'авиа' ? '40 $ за 1 кг' : 'от нашего склада' }]);
      var mn = Math.ceil(st.reduce(function (s, x) { return s + x.days[0]; }, 0)), mx = Math.ceil(st.reduce(function (s, x) { return s + x.days[1]; }, 0));
      $('#tBar').innerHTML = st.map(function (s, i) { return '<span style="width:' + (s.days[1] / scaleMax * 100).toFixed(2) + '%;background:' + colors[i] + '"></span>'; }).join('');
      $('#tList').innerHTML = st.map(function (s, i) { return '<li><span class="dot" style="background:' + colors[i] + '"></span><span>' + s.name + '<small>' + s.sub + '</small></span><span class="v num">' + s.label + '</span></li>'; }).join('');
      $('#tTotal').textContent = mn + '–' + mx + NB + daysWord(mx);
      var w0 = Math.max(1, Math.round(mn / 7)), w1 = Math.max(w0, Math.round(mx / 7));
      $('#tWeeks').textContent = '≈ ' + (w0 === w1 ? w0 : w0 + '–' + w1) + ' ' + plural(w1, ['неделя', 'недели', 'недель']);
      $('#tNote').textContent = d.local || 'Срок считается от вашей оплаты до прибытия посылки в страну.';
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render(b.dataset.id);
    });
    render(O.timing[0].id);
  })();

  /* ============================== главная: тарифы ============================== */
  (function () {
    var tabs = $('#tabTariffs'), panel = $('#tariffPanel');
    tabs.innerHTML = O.groups.map(function (g, i) { return '<button type="button" role="tab" id="tt' + i + '" aria-selected="' + (i === 0) + '" aria-controls="tariffPanel" data-i="' + i + '">' + g.title + '</button>'; }).join('');
    function render(i) {
      var g = O.groups[i], cols = O.dest[g.rows[0]].tiers.map(function (t) { return t[0]; }), last = cols.length - 1;
      var head = '<tr><th scope="col" style="text-align:left">Направление</th>' + cols.map(function (c, j) { return '<th scope="col">' + c + (j === last ? '+' : '') + ' кг</th>'; }).join('') + '</tr>';
      var body = g.rows.map(function (id) {
        var d = O.dest[id], mn = Math.min.apply(null, d.tiers.map(function (t) { return t[1]; }));
        return '<tr><th scope="row"><span class="cc">' + d.code + '</span>' + d.name + '</th>' + d.tiers.map(function (t) { return '<td class="' + (t[1] === mn && t[1] !== d.tiers[0][1] ? 'low' : '') + '">' + fmt(t[1]) + '</td>'; }).join('') + '</tr>';
      }).join('');
      panel.setAttribute('aria-labelledby', 'tt' + i);
      panel.innerHTML = '<div class="tbl-wrap"><table><caption>Цена в $ за 1 кг. Зелёным — самая выгодная цена за килограмм.</caption><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
        '<ul class="notes">' + g.notes.map(function (n) { return '<li class="' + (n[2] || '') + '">' + ICO(n[0], 'ico-sm') + '<span>' + n[1].replace(/ (\$|кг|дней|дня)/g, NB + '$1') + '</span></li>'; }).join('') + '</ul>';
    }
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', tabs).forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      render(+b.dataset.i);
    });
    render(0);
  })();

  /* ============================== главная: калькулятор ============================== */
  var calc = (function () {
    var sel = $('#cDest'), cats = $('#cCats'), list = $('#cItems'), out = $('#cResult');
    var groups = [['Россия, Беларусь, Казахстан', ['ru', 'ru_air', 'by', 'kz']], ['Европа', ['eu', 'se', 'fi', 'dk', 'mt', 'cy', 'no']], ['Северная Америка и Швейцария', ['us', 'ca', 'ch']]];
    sel.innerHTML = groups.map(function (g) { return '<optgroup label="' + g[0] + '">' + g[1].map(function (id) { return '<option value="' + id + '">' + O.dest[id].name + (id === 'ru' ? ' (авто)' : '') + '</option>'; }).join('') + '</optgroup>'; }).join('');
    var qty = { 'shoes:0': 1, 'clothes:0': 2 }, cat = 'shoes', isExample = true;
    function rateFor(d, w) { var r = d.tiers[0][1]; d.tiers.forEach(function (t) { if (w >= t[0]) r = t[1]; }); return r; }
    function countIn(cid) { var n = 0; for (var k in qty) if (k.indexOf(cid + ':') === 0) n += qty[k]; return n; }
    function renderCats() {
      cats.innerHTML = O.cats.map(function (c) { var n = countIn(c.id); return '<button type="button" aria-pressed="' + (c.id === cat) + '" data-id="' + c.id + '">' + I(c.icon) + c.name + (n ? '<span class="cnt">' + n + '</span>' : '') + '</button>'; }).join('');
    }
    function renderItems() {
      var c = O.cats.filter(function (x) { return x.id === cat; })[0];
      list.innerHTML = c.items.map(function (it, i) {
        var k = cat + ':' + i, q = qty[k] || 0;
        return '<li class="item' + (q ? ' on' : '') + '"><div><b>' + it.n + '</b><small>физ. ' + rng(it.p[0], it.p[1], 'кг') + ' · объём. ' + rng(it.v[0], it.v[1], 'кг') + '</small></div>' +
          '<div class="stepper"><button type="button" data-k="' + k + '" data-d="-1" aria-label="Убрать: ' + it.n + '"' + (q ? '' : ' disabled') + '>' + I('minus') + '</button><output aria-live="polite">' + q + '</output><button type="button" data-k="' + k + '" data-d="1" aria-label="Добавить: ' + it.n + '">' + I('plus') + '</button></div></li>';
      }).join('');
    }
    function run() {
      var d = O.dest[sel.value], p0 = 0, p1 = 0, v0 = 0, v1 = 0, n = 0;
      Object.keys(qty).forEach(function (k) {
        var q = qty[k]; if (!q) return;
        var parts = k.split(':'), it = O.cats.filter(function (c) { return c.id === parts[0]; })[0].items[+parts[1]];
        p0 += it.p[0] * q; p1 += it.p[1] * q; v0 += it.v[0] * q; v1 += it.v[1] * q; n += q;
      });
      $('#cHint').hidden = !isExample;
      if (!n) { out.innerHTML = '<div class="r-empty">' + ICO('box', 'ico-lg') + '<b>Посылка пока пустая</b><span>Добавьте товары — здесь появится примерная стоимость доставки.</span></div>'; return; }
      var up = function (x) { return Math.ceil(x * 10 - 1e-9) / 10; };
      var b0 = up(Math.max(p0, v0)), b1 = up(Math.max(p1, v1)), r0 = rateFor(d, b0), r1 = rateFor(d, b1);
      var s0 = b0 * r0, s1 = b1 * r1, pack = d.pack == null ? 0 : d.pack;
      var u = Session.user(), L = u ? levelOf(xpOf(u)) : null, disc = L ? L.delivery : 0;
      if (L && L.n >= 4 && d.pack) pack = 0; // бесплатная упаковка с 4 уровня
      var t0 = s0 * (1 - disc) + pack, t1 = s1 * (1 - disc) + pack, full0 = s0 + (d.pack || 0), full1 = s1 + (d.pack || 0);
      var rateTxt = r0 === r1 ? fmt(r0) + NB + '$/кг' : fmt(Math.min(r0, r1)) + '–' + fmt(Math.max(r0, r1)) + NB + '$/кг';
      var html = (isExample ? '<span class="chip">Пример — измените под свой заказ</span>' : '<span class="chip">Ваш расчёт</span>') +
        '<dl class="r-rows">' +
        '<div><dt>Направление</dt><dd><span class="cc">' + d.code + '</span> ' + d.name + '</dd></div>' +
        '<div><dt>В посылке</dt><dd>' + n + NB + plural(n, ['вещь', 'вещи', 'вещей']) + '</dd></div>' +
        '<div><dt>Физический вес</dt><dd>≈ ' + rng(p0, p1, 'кг') + '</dd></div>' +
        '<div><dt>Объёмный вес</dt><dd>≈ ' + rng(v0, v1, 'кг') + '</dd></div>' +
        '<div><dt>Вес к оплате</dt><dd>≈ ' + rng(b0, b1, 'кг') + '</dd></div>' +
        '<div><dt>Тариф логиста</dt><dd>' + rateTxt + '</dd></div>' +
        '<div><dt>Доставка</dt><dd>≈ ' + rng(s0, s1, '$') + '</dd></div>' +
        (disc ? '<div class="disc"><dt>Скидка уровня «' + esc(L.name) + '»</dt><dd>−' + Math.round(disc * 100) + '% · −' + rng(s0 * disc, s1 * disc, '$') + '</dd></div>' : '') +
        (d.pack == null ? '' : '<div' + (pack === 0 && d.pack ? ' class="disc"' : '') + '><dt>Упаковка и оформление</dt><dd>' + (pack === 0 && d.pack ? 'бесплатно' : fmt(pack) + NB + '$') + '</dd></div>') +
        '</dl>' +
        '<div class="r-total"><span class="k">Примерно за доставку из Китая</span><span class="big">≈ ' + rng(t0, t1, '$') + (disc || (pack === 0 && d.pack) ? ' <s>' + rng(full0, full1, '$') + '</s>' : '') + '</span></div>' +
        '<div class="r-extra"><p>' + I('timer') + '<span>В пути от нашего склада: ' + rng(d.days[0], d.days[1]) + NB + daysWord(d.days[1]) + '.</span></p>' +
        (d.local ? '<p class="w">' + I('alert') + '<span>' + d.local + '</span></p>' : '') +
        (d.noIns ? '<p class="w">' + I('alert') + '<span>Страховка в эту страну недоступна.</span></p>' : '') + '</div>' +
        (u ? (disc ? '' : '<div class="lvl-hint">' + I('crown') + '<span>Скидка на доставку откроется на уровне «' + esc(O.levels[1].name) + '». <a href="#cabinet" data-nav>Мой прогресс</a></span></div>')
          : '<div class="lvl-hint">' + I('crown') + '<span>Со скидкой уровня до −12%. <a href="#signup" data-nav>Создайте аккаунт</a>, и она применится автоматически.</span></div>') +
        '<p class="small">Стоимость самого товара сюда не входит. Расчёт по типичному весу вещей, точную сумму назовём после взвешивания на складе.</p>' +
        '<a class="btn" href="' + O.contacts.support + '" target="_blank" rel="noopener">' + I('send') + 'Уточнить у менеджера</a>';
      out.innerHTML = html;
    }
    function touched() { isExample = false; var u = Session.user(); if (u && !questDone(u, 'calc')) questGrant(u, 'calc'); }
    function all() { renderCats(); renderItems(); run(); }
    cats.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; cat = b.dataset.id; renderCats(); renderItems(); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]'); if (!b) return;
      var k = b.dataset.k, d = +b.dataset.d; qty[k] = Math.max(0, (qty[k] || 0) + d); if (!qty[k]) delete qty[k];
      all(); touched();
      var again = $('button[data-k="' + k + '"][data-d="' + d + '"]', list);
      (again && !again.disabled ? again : $('button[data-k="' + k + '"][data-d="1"]', list)).focus();
    });
    sel.addEventListener('change', function () { run(); touched(); });
    $('#cReset').addEventListener('click', function () { qty = {}; isExample = false; all(); });
    all();
    return run;
  })();

  /* ============================== главная: уровни ============================== */
  function ladderHtml(u) {
    var xp = u ? xpOf(u) : -1, cur = u ? levelOf(xp) : null;
    return O.levels.map(function (L) {
      var state = !u ? '' : L.n === cur.n ? ' cur' : L.n > cur.n ? ' locked' : '';
      var chip = !u ? '<span class="chip dim">' + (L.xp ? 'от ' + fmtInt(L.xp) + ' XP' : 'сразу после регистрации') + '</span>'
        : L.n === cur.n ? '<span class="chip">Ваш уровень</span>' : L.n < cur.n ? '<span class="chip ok">' + I('check') + 'Пройден</span>' : '<span class="chip dim">' + I('lock') + 'ещё ' + fmtInt(L.xp - xp) + ' XP</span>';
      return '<div class="lv-card' + state + '" style="--c:' + L.color + '"><div class="lv-top"><span class="lv-badge">' + L.n + '</span><div><div class="lv-name">' + esc(L.name) + '</div><div class="lv-xp num">' + fmtInt(L.xp) + ' XP</div></div></div>' +
        '<ul>' + L.perks.map(function (p) { return '<li>' + I('check') + '<span>' + esc(p) + '</span></li>'; }).join('') + '</ul>' + chip + '</div>';
    }).join('');
  }
  function renderLadder() {
    $('#ladder').innerHTML = ladderHtml(Session.user());
    $('#earnList').innerHTML = '<li>' + ICO('box-check', 'ico-sm') + '<span>Выкупленный заказ</span><b>+' + O.orderXp.base + ' XP</b></li>' +
      '<li>' + ICO('wallet', 'ico-sm') + '<span>Каждые 100 ₽ в заказе</span><b>+' + O.orderXp.per100rub + ' XP</b></li>' +
      O.quests.map(function (q) { return '<li>' + ICO(q.icon, 'ico-sm') + '<span>' + esc(q.title) + '</span><b>+' + q.xp + ' XP</b></li>'; }).join('');
  }

  /* ============================== вход и регистрация ============================== */
  var pending = null; // ожидание кода 2FA
  function authMode(m) {
    var login = m !== 'signup';
    $('#tabLogin').setAttribute('aria-selected', String(login)); $('#tabSignup').setAttribute('aria-selected', String(!login));
    $('#fLogin').hidden = !login || !!pending; $('#fOtp').hidden = !login || !pending; $('#fSignup').hidden = login;
    $('[data-demo]').hidden = !O.demoEnabled || !!pending;
    var note = $('.store-note');
    note.innerHTML = I('lock') + (Store.ok ? (O.accountsOnDeviceNote ? 'Аккаунт хранится на этом устройстве, пароль — в зашифрованном виде.' : 'Пароли хранятся только в зашифрованном виде.')
      : 'Браузер не сохраняет данные сайта: аккаунт пропадёт после закрытия страницы.');
  }
  function formErr(form, msg, field) {
    var p = $('.form-err', form); $$('[aria-invalid]', form).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (!msg) { p.hidden = true; return; }
    p.textContent = msg; p.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function busy(form, on) { var b = $('button[type=submit]', form); if (b) { b.disabled = on; } }
  $$('.pw-eye').forEach(function (b) {
    b.addEventListener('click', function () {
      var inp = b.parentNode.querySelector('input'), show = inp.type === 'password';
      inp.type = show ? 'text' : 'password'; b.innerHTML = I(show ? 'eye-off' : 'eye'); b.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    });
  });
  var USER_RE = /^[A-Za-z0-9_]{3,20}$/, TG_RE = /^[A-Za-z0-9_]{5,32}$/;
  function pwScore(p) { var s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-zа-я]/.test(p) && /[A-ZА-Я]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-zА-Яа-я0-9]/.test(p)) s++; return Math.min(4, s); }
  function pwProblem(p) { if (p.length < 8) return 'Пароль должен быть не короче 8 символов.'; if (!/[A-Za-zА-Яа-яЁё]/.test(p) || !/\d/.test(p)) return 'В пароле нужны и буквы, и цифры.'; return ''; }
  $('#sPass').addEventListener('input', function () {
    var v = this.value, s = pwScore(v), bar = $('.meter span');
    var lbl = ['Слабый', 'Слабый', 'Средний', 'Хороший', 'Надёжный'][s], col = ['var(--danger)', 'var(--danger)', 'var(--warn)', 'var(--accent)', 'var(--ok)'][s];
    bar.style.width = (v ? (s + 1) * 20 : 0) + '%'; bar.style.background = col;
    $('#sMeter').textContent = v ? 'Надёжность: ' + lbl + (pwProblem(v) ? '. ' + pwProblem(v) : '') : 'Минимум 8 символов, буквы и цифры.';
  });

  $('#fSignup').addEventListener('submit', async function (e) {
    e.preventDefault(); var f = this;
    var name = $('#sUser').value.trim(), tg = $('#sTg').value.trim().replace(/^@/, ''), p1 = $('#sPass').value, p2 = $('#sPass2').value;
    if (!USER_RE.test(name)) return formErr(f, 'Имя пользователя: 3–20 символов, только латинские буквы, цифры и «_».', $('#sUser'));
    if (Acc.byName(name)) return formErr(f, 'Это имя уже занято. Попробуйте другое.', $('#sUser'));
    if (tg && !TG_RE.test(tg)) return formErr(f, 'Проверьте Telegram: 5–32 символа, латиница, цифры и «_».', $('#sTg'));
    var pp = pwProblem(p1); if (pp) return formErr(f, pp, $('#sPass'));
    if (p1 !== p2) return formErr(f, 'Пароли не совпадают.', $('#sPass2'));
    if (!$('#sAgree').checked) return formErr(f, 'Отметьте, что ознакомились с условиями предзаказа.', $('#sAgree'));
    if (!SEC.ready()) return formErr(f, 'Браузер не поддерживает шифрование. Откройте сайт по защищённому адресу (https).');
    formErr(f, ''); busy(f, true);
    try {
      var u = { id: Acc.newId(), username: name, uname: name.toLowerCase(), pass: await SEC.hashPassword(p1), createdAt: Date.now(),
        profile: { name: '', telegram: tg ? '@' + tg : '', phone: '', city: '', email: '' }, events: [], quests: {}, promos: {}, orders: [], totp: null, failed: 0, lockUntil: 0, logins: [] };
      Acc.save(u); Session.start(u, true);
      grant(u, 'quest:register', 50, 'Создать аккаунт', { silent: true });
      f.reset(); $('.meter span').style.width = '0';
      navigate('cabinet', true);
      toast('Аккаунт создан. Ваш ID: <b>' + u.id + '</b>', 'ok', 'sparkles');
    } catch (err) { formErr(f, 'Не удалось создать аккаунт. Обновите страницу и попробуйте снова.'); }
    busy(f, false);
  });

  $('#fLogin').addEventListener('submit', async function (e) {
    e.preventDefault(); var f = this;
    var name = $('#lUser').value.trim(), pw = $('#lPass').value;
    if (!name) return formErr(f, 'Введите имя пользователя.', $('#lUser'));
    if (!pw) return formErr(f, 'Введите пароль.', $('#lPass'));
    if (!SEC.ready()) return formErr(f, 'Браузер не поддерживает шифрование. Откройте сайт по защищённому адресу (https).');
    busy(f, true);
    try {
      var u = Acc.byName(name);
      if (u && u.lockUntil > Date.now()) { busy(f, false); return formErr(f, 'Слишком много попыток. Попробуйте через ' + Math.ceil((u.lockUntil - Date.now()) / 1000) + ' сек.'); }
      var ok = u && u.pass ? await SEC.verifyPassword(pw, u.pass) : (await SEC.hashPassword(pw), false);
      if (!ok) {
        if (u) { u.failed = (u.failed || 0) + 1; if (u.failed >= 5) { u.failed = 0; u.lockUntil = Date.now() + 60000; } Acc.save(u); }
        busy(f, false); return formErr(f, 'Неверное имя пользователя или пароль.', $('#lPass'));
      }
      u.failed = 0; u.lockUntil = 0; Acc.save(u);
      formErr(f, '');
      if (u.totp && u.totp.on) { pending = { uid: u.id, remember: $('#lRemember').checked, backup: false, tries: 0 }; otpMode(false); authMode('login'); $('#oCode').focus(); }
      else { Session.start(u, $('#lRemember').checked); f.reset(); navigate('cabinet', true); toast('С возвращением, <b>' + esc(u.username) + '</b>!', 'ok', 'user'); }
    } catch (err) { formErr(f, 'Не удалось войти. Обновите страницу и попробуйте снова.'); }
    busy(f, false);
  });

  function otpMode(backup) {
    pending.backup = backup;
    $('#oLabel').textContent = backup ? 'Резервный код' : 'Код из приложения';
    var inp = $('#oCode'); inp.value = ''; inp.setAttribute('inputmode', backup ? 'text' : 'numeric'); inp.setAttribute('placeholder', backup ? 'XXXX-XXXX' : '000 000');
    inp.classList.toggle('otp-input', !backup);
    $('#oBackup').textContent = backup ? 'Ввести код из приложения' : 'Использовать резервный код';
    formErr($('#fOtp'), '');
  }
  $('#oBackup').addEventListener('click', function () { if (pending) { otpMode(!pending.backup); $('#oCode').focus(); } });
  $('#oCancel').addEventListener('click', function () { pending = null; authMode('login'); $('#lPass').value = ''; $('#lPass').focus(); });
  $('#fOtp').addEventListener('submit', async function (e) {
    e.preventDefault(); var f = this; if (!pending) return;
    var u = Acc.get(pending.uid); if (!u) { pending = null; authMode('login'); return; }
    var code = $('#oCode').value.trim(), ok = false;
    busy(f, true);
    if (pending.backup) {
      var norm = code.toUpperCase().replace(/[^A-Z0-9]/g, ''); norm = norm.slice(0, 4) + '-' + norm.slice(4);
      var h = await SEC.sha256(norm), idx = (u.totp.backup || []).indexOf(h);
      if (idx >= 0) { ok = true; u.totp.backup.splice(idx, 1); Acc.save(u); }
    } else ok = await SEC.verifyTotp(u.totp.secret, code);
    busy(f, false);
    if (!ok) {
      pending.tries++;
      if (pending.tries >= 5) { pending = null; authMode('login'); return formErr($('#fLogin'), 'Слишком много неверных кодов. Войдите заново.'); }
      return formErr(f, pending.backup ? 'Резервный код не подошёл или уже использован.' : 'Код не подошёл. Проверьте время на телефоне и введите новый код.', $('#oCode'));
    }
    var rem = pending.remember; pending = null;
    Session.start(Acc.get(u.id), rem); $('#fLogin').reset(); authMode('login');
    navigate('cabinet', true); toast('Вход подтверждён', 'ok', 'shield');
  });

  /* ============================== демо-кабинет ============================== */
  function seedDemo() {
    var day = 864e5, now = Date.now(), id = 'ON-777777';
    var orders = [
      { id: 'A-1042', title: 'Кроссовки беговые, 42 EU · белые', amount: 12900, status: 'arrived', at: now - 92 * day, dest: 'Москва' },
      { id: 'A-1067', title: 'Худи оверсайз, L · чёрное', amount: 8450, status: 'arrived', at: now - 74 * day, dest: 'Москва' },
      { id: 'A-1103', title: 'Сумка через плечо · коричневая', amount: 24300, status: 'arrived', at: now - 58 * day, dest: 'Казань' },
      { id: 'A-1151', title: 'Пуховик укороченный, M · графит', amount: 15800, status: 'arrived', at: now - 41 * day, dest: 'Москва' },
      { id: 'A-1188', title: 'Джинсы прямые, 31 · голубые', amount: 9900, status: 'arrived', at: now - 33 * day, dest: 'Москва' },
      { id: 'A-1236', title: 'Кроссовки массивные, 43 EU · серые', amount: 17600, status: 'shipping', at: now - 19 * day, dest: 'Москва' },
      { id: 'A-1270', title: 'Кепка, универсальный · синяя', amount: 6200, status: 'bought', at: now - 2 * day, dest: 'Москва' }];
    var ev = [], t = now - 100 * day;
    function e(k, xp, title, at) { ev.push({ k: k, xp: xp, t: title, at: at }); }
    e('quest:register', 50, 'Создать аккаунт', t); e('quest:profile', 50, 'Заполнить профиль', t + 3e5); e('quest:channel', 25, 'Открыть официальный канал', t + 6e5);
    e('promo:WELCOME', 50, 'Промокод WELCOME', t + 9e5); e('quest:promo', 50, 'Активировать промокод из канала', t + 9e5 + 1);
    e('quest:calc', 25, 'Рассчитать доставку', t + 2 * day); e('quest:reviews', 25, 'Посмотреть отзывы покупателей', t + 3 * day);
    e('promo:ONION2026', 100, 'Промокод ONION2026', now - 20 * day);
    orders.forEach(function (o) { if (o.status === 'arrived') e('order:' + o.id, orderXp(o), 'Заказ ' + o.id, o.at + 21 * day); });
    ev.sort(function (a, b) { return a.at - b.at; });
    var u = { id: id, username: 'demo_onion', uname: 'demo_onion', pass: null, demo: true, createdAt: t,
      profile: { name: 'Алексей Смирнов', telegram: '@demo_onion', phone: '', city: 'Москва', email: '' },
      events: ev, quests: { register: true, profile: true, channel: true, promo: true, calc: true, reviews: true }, promos: { WELCOME: t + 9e5, ONION2026: now - 20 * day },
      orders: orders.reverse(), totp: null, failed: 0, lockUntil: 0, logins: [] };
    Acc.save(u); return u;
  }
  $('#demoBtn').addEventListener('click', function () { var u = seedDemo(); Session.start(u, false); navigate('cabinet', true); toast('Это демо-кабинет с примерными данными', 'ok', 'sparkles'); });

  /* ============================== кабинет ============================== */
  var cabTab = 'overview', tfa = { step: 'idle' }, confirmDel = false, confirmOff = false;
  var TABS = [['overview', 'Обзор', 'home'], ['orders', 'Заказы', 'receipt'], ['bonus', 'Бонусы', 'crown'], ['promo', 'Промокоды', 'ticket'], ['security', 'Безопасность', 'shield'], ['profile', 'Профиль', 'user']];

  function renderCabinet() {
    var u = Session.user(); if (!u) { navigate('login', true); return; }
    refreshChrome();
    var xp = xpOf(u), L = levelOf(xp), N = nextOf(L);
    var pct = N ? Math.min(100, (xp - L.xp) / (N.xp - L.xp) * 100) : 100, C = 2 * Math.PI * 41;
    $('#cabDemo').innerHTML = u.demo ? '<div class="demo-bar">' + I('sparkles') + '<span>Демо-кабинет: заказы и очки примерные. Так кабинет выглядит у постоянного клиента.</span><a class="btn btn-sm" href="#signup" data-nav data-logout>Создать свой аккаунт</a></div>' : '';
    var head = $('#cabHead'); head.style.setProperty('--lvl', L.color);
    head.innerHTML = '<div class="cab-ava"><svg viewBox="0 0 88 88" aria-hidden="true"><circle class="ring-bg" cx="44" cy="44" r="41" fill="none" stroke-width="4"/><circle class="ring" cx="44" cy="44" r="41" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/></svg><span class="ava">' + esc(initials(u)) + '</span><span class="lvn">' + L.n + '</span></div>' +
      '<div class="cab-who"><h1>' + esc(u.profile.name || u.username) + '</h1>' +
      '<div class="cab-meta"><button class="idchip" type="button" data-copy="' + u.id + '" aria-label="Скопировать ID клиента ' + u.id + '">ID ' + u.id + I('copy') + '</button><span class="chip" style="--c:' + L.color + '">' + I('crown') + 'Ур. ' + L.n + ' · ' + esc(L.name) + '</span>' + (u.totp && u.totp.on ? '<span class="chip ok">' + I('shield') + '2FA</span>' : '') + '</div>' +
      '<div class="xp-line"><div class="xp-bar"><span style="width:' + pct.toFixed(1) + '%"></span></div><div class="xp-txt num"><span>' + fmtInt(xp) + ' XP</span><span>' + (N ? 'до «' + esc(N.name) + '» — ' + fmtInt(N.xp - xp) + ' XP' : 'Максимальный уровень') + '</span></div></div></div>' +
      '<div class="cab-disc"><b class="num">−' + Math.round(L.delivery * 100) + '%</b><span>скидка на доставку</span></div>';
    $('#cabTabs').innerHTML = TABS.map(function (t) {
      var dot = (t[0] === 'security' && !(u.totp && u.totp.on)) || (t[0] === 'profile' && !questDone(u, 'profile'));
      return '<button type="button" role="tab" aria-selected="' + (t[0] === cabTab) + '" data-tab="' + t[0] + '">' + I(t[2]) + t[1] + (dot ? '<span class="dotn" aria-label="есть задание"></span>' : '') + '</button>';
    }).join('');
    var body = $('#cabBody');
    body.innerHTML = ({ overview: tabOverview, orders: tabOrders, bonus: tabBonus, promo: tabPromo, security: tabSecurity, profile: tabProfile })[cabTab](u, xp, L, N);
    afterRender(u);
  }
  $('#cabTabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]'); if (!b) return;
    cabTab = b.dataset.tab; tfa = { step: 'idle' }; confirmDel = false; confirmOff = false; renderCabinet();
    var t = $('#cabTabs button[aria-selected="true"]'); if (t) { t.focus(); t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  });
  function goTab(t) { cabTab = t; tfa = { step: 'idle' }; renderCabinet(); var top = $('#cabTabs'); if (top) top.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }

  function questsHtml(u, limit) {
    var qs = O.quests.slice().sort(function (a, b) { return questDone(u, a.id) - questDone(u, b.id); });
    if (limit) qs = qs.slice(0, limit);
    return '<ul class="qlist">' + qs.map(function (q) {
      var done = questDone(u, q.id), act = '';
      if (!done) {
        if (q.link) act = '<a class="btn btn-ghost btn-sm act" href="' + O.contacts[q.link] + '" target="_blank" rel="noopener" data-quest="' + q.id + '">Открыть</a>';
        else if (q.go) act = '<button class="btn btn-ghost btn-sm act" type="button" data-go="' + q.go + '">Перейти</button>';
        else if (q.href) act = '<a class="btn btn-ghost btn-sm act" href="' + q.href + '" data-nav>Перейти</a>';
      }
      return '<li class="q' + (done ? ' done' : '') + '">' + ICO(done ? 'check' : q.icon, 'ico-sm') + '<div><b>' + esc(q.title) + '</b>' + (q.hint ? '<small>' + esc(q.hint) + '</small>' : '') + '</div>' +
        (done ? '<span class="xp">+' + q.xp + ' XP</span>' : '<div class="row-btns" style="align-items:center;gap:10px"><span class="xp">+' + q.xp + '</span>' + act + '</div>') + '</li>';
    }).join('') + '</ul>';
  }
  function orderCard(o) {
    var idx = O.orderStatuses.map(function (s) { return s.id; }).indexOf(o.status), st = O.orderStatuses[idx];
    var chip = o.status === 'arrived' ? '<span class="chip ok">' + I('check') + st.name + '</span>' : '<span class="chip">' + st.name + '</span>';
    return '<div class="card ord"><div class="ord-top"><b>' + esc(o.title) + '</b>' + chip + '<span class="sum num">' + fmtInt(o.amount) + NB + '₽</span></div>' +
      '<div class="ord-meta"><span>Заказ ' + esc(o.id) + '</span><span>от ' + dateFmt(o.at) + '</span><span>Получение: ' + esc(o.dest) + '</span>' + (o.status === 'arrived' ? '<span>+' + orderXp(o) + ' XP</span>' : '<span>+' + orderXp(o) + ' XP после получения</span>') + '</div>' +
      '<ol class="track">' + O.orderStatuses.map(function (s, i) { return '<li class="' + (i < idx ? 'done' : i === idx ? 'now' : '') + '"><span>' + s.name + '</span></li>'; }).join('') + '</ol></div>';
  }
  function emptyOrders(u) {
    return '<div class="card empty">' + ICO('receipt', 'ico-lg') + '<h3>Заказов пока нет</h3><p>Выберите товар в нашем канале и напишите менеджеру. Назовите ваш ID <b>' + u.id + '</b>, чтобы заказ засчитался в уровень.</p>' +
      '<div class="row-btns" style="justify-content:center"><a class="btn" href="' + O.contacts.support + '" target="_blank" rel="noopener">' + I('send') + 'Написать менеджеру</a><a class="btn btn-ghost" href="' + O.contacts.channel + '" target="_blank" rel="noopener" data-quest="channel">' + I('megaphone') + 'Открыть канал</a></div></div>';
  }

  function tabOverview(u, xp, L, N) {
    var orders = u.orders || [], active = orders.filter(function (o) { return o.status !== 'arrived'; });
    var codes = O.levels.filter(function (l) { return l.reward && l.n <= L.n; }).length + Object.keys(u.promos || {}).length;
    return '<div class="cab-grid">' +
      '<div class="span-12 stats"><div class="stat"><b>' + fmtInt(xp) + '</b><span>очков опыта</span></div><div class="stat"><b>' + orders.length + '</b><span>' + plural(orders.length, ['заказ', 'заказа', 'заказов']) + '</span></div><div class="stat"><b>' + codes + '</b><span>' + plural(codes, ['промокод', 'промокода', 'промокодов']) + '</span></div></div>' +
      '<div class="card panel span-7"><h2>' + ICO('target') + 'Задания</h2>' + questsHtml(u, 4) + '<button class="linkbtn" type="button" data-go="bonus">Все задания и история очков</button></div>' +
      '<div class="card panel span-5"><h2>' + ICO(N ? 'trophy' : 'crown') + (N ? 'Следующий уровень' : 'Максимальный уровень') + '</h2>' +
      (N ? '<div class="lv-top" style="--c:' + N.color + '"><span class="lv-badge">' + N.n + '</span><div><div class="lv-name">' + esc(N.name) + '</div><div class="lv-xp num">осталось ' + fmtInt(N.xp - xp) + ' XP</div></div></div>' +
        '<ul class="dots">' + N.perks.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>'
        : '<p>Вы достигли уровня «' + esc(L.name) + '». Все бонусы программы открыты.</p>') +
      '<button class="linkbtn" type="button" data-go="bonus">Все уровни</button></div>' +
      '<div class="card panel span-12"><h2>' + ICO('receipt') + (active.length ? 'Активные заказы' : 'Заказы') + '</h2>' +
      (orders.length ? (active.length ? active : orders.slice(0, 1)).map(orderCard).join('') + '<button class="linkbtn" type="button" data-go="orders">Все заказы</button>' : '<p>Здесь будут ваши заказы и их статусы. Чтобы оформить заказ, напишите менеджеру и назовите ваш ID <b>' + u.id + '</b>.</p>') + '</div>' +
      '</div>';
  }
  function tabOrders(u) {
    var orders = u.orders || [];
    if (!orders.length) return emptyOrders(u);
    var spent = orders.reduce(function (s, o) { return s + o.amount; }, 0);
    return '<div class="cab-grid"><div class="span-12 stats"><div class="stat"><b>' + orders.length + '</b><span>всего заказов</span></div><div class="stat"><b>' + orders.filter(function (o) { return o.status !== 'arrived'; }).length + '</b><span>в процессе</span></div><div class="stat"><b class="num">' + fmtInt(spent) + NB + '₽</b><span>сумма заказов</span></div></div>' +
      '<div class="span-12" style="display:grid;gap:12px">' + orders.map(orderCard).join('') + '</div></div>';
  }
  function tabBonus(u, xp, L) {
    var hist = (u.events || []).slice().sort(function (a, b) { return b.at - a.at; }).slice(0, 12);
    return '<div class="cab-grid"><div class="span-12"><div class="ladder">' + ladderHtml(u) + '</div></div>' +
      '<div class="card panel span-7"><h2>' + ICO('target') + 'Задания</h2>' + questsHtml(u) + '<p class="small">За каждый выкупленный заказ: +' + O.orderXp.base + ' XP и +' + O.orderXp.per100rub + ' XP за каждые 100 ₽ суммы.</p></div>' +
      '<div class="card panel span-5"><h2>' + ICO('sparkles') + 'История очков</h2><ul class="hist">' + hist.map(function (e) { return '<li><span>' + esc(e.t) + ' <b style="color:var(--ok)">+' + e.xp + '</b></span><span>' + dtFmt(e.at) + '</span></li>'; }).join('') + '</ul></div></div>';
  }
  function tabPromo(u, xp, L) {
    var digits = u.id.replace(/\D/g, '');
    var mine = O.levels.filter(function (l) { return l.reward; }).map(function (l) {
      var open = l.n <= L.n, code = 'ONION-' + l.reward.prefix + '-' + digits;
      return '<div class="promo' + (open ? '' : ' locked') + '"><div class="row-between"><span class="chip" style="--c:' + l.color + '">Ур. ' + l.n + ' · ' + esc(l.name) + '</span>' + (open ? '' : I('lock')) + '</div>' +
        '<code' + (open ? '' : ' aria-hidden="true"') + '>' + (open ? code : 'ONION-XXXX-' + '•'.repeat(6)) + '</code><span class="muted">' + esc(l.reward.title) + '</span>' +
        (open ? '<button class="btn btn-ghost btn-sm" type="button" data-copy="' + code + '">' + I('copy') + 'Скопировать</button>' : '<span class="small">Откроется на уровне «' + esc(l.name) + '»</span>') + '</div>';
    }).join('');
    var used = Object.keys(u.promos || {});
    return '<div class="cab-grid">' +
      '<div class="card panel span-12"><h2>' + ICO('ticket') + 'Активировать промокод</h2><p>Промокоды публикуем в <a href="' + O.contacts.channel + '" target="_blank" rel="noopener" data-quest="channel">официальном канале</a>. Каждый код даёт бонусные очки.</p>' +
      '<form class="inline-form" id="fPromo" novalidate><label class="sr" for="pCode" style="position:absolute;left:-9999px">Промокод</label><input id="pCode" placeholder="Например, WELCOME" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24"><button class="btn" type="submit">Активировать</button><p class="form-err" role="alert" hidden style="flex-basis:100%"></p></form>' +
      (used.length ? '<p class="small">Уже активированы: ' + used.map(esc).join(', ') + '</p>' : '') + '</div>' +
      '<div class="card panel span-12"><h2>' + ICO('gift') + 'Личные промокоды за уровень</h2><p>Назовите код менеджеру при оформлении заказа. Каждый код можно использовать один раз.</p><div class="promo-list">' + mine + '</div></div></div>';
  }
  function tabSecurity(u) {
    var on = u.totp && u.totp.on, h = '';
    if (tfa.step === 'setup') {
      var uri = SEC.otpauthUri(tfa.secret, u.username, O.brand), qr = '';
      try { qr = QR.toSvg(uri, { label: 'QR-код для приложения-аутентификатора' }); } catch (e) { qr = ''; }
      h = '<div class="card panel span-12"><h2>' + ICO('shield') + 'Подключение двухфакторной защиты</h2>' +
        '<div class="qr-box">' + (qr ? '<div class="qr">' + qr + '</div>' : '') + '<div style="display:grid;gap:14px;min-width:0">' +
        '<ol class="dots" style="list-style:none"><li>Установите приложение-аутентификатор: Google Authenticator, Яндекс Ключ, Microsoft Authenticator или аналог.</li><li>Отсканируйте QR-код или введите ключ вручную.</li><li>Введите 6-значный код из приложения.</li></ol>' +
        '<div class="field"><span class="small">Ключ для ручного ввода</span><div class="row-btns" style="align-items:center"><span class="secret" id="tfaSecret">' + tfa.secret.replace(/(.{4})/g, '$1 ').trim() + '</span><button class="btn btn-ghost btn-sm" type="button" data-copy="' + tfa.secret + '">' + I('copy') + 'Скопировать</button></div></div>' +
        '<form class="inline-form" id="fTfa" novalidate><input id="tfaCode" class="otp-input num" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000" aria-label="Код из приложения"><button class="btn" type="submit">Подтвердить</button><button class="btn btn-ghost" type="button" data-tfa="cancel">Отмена</button><p class="form-err" role="alert" hidden style="flex-basis:100%"></p></form>' +
        '</div></div></div>';
    } else if (tfa.step === 'codes') {
      h = '<div class="card panel span-12"><h2>' + ICO('key', 'ico-ok') + 'Сохраните резервные коды</h2><p>Если телефон потеряется, войти можно будет одним из этих кодов. Каждый код работает один раз. Больше мы их не покажем.</p>' +
        '<div class="codes">' + tfa.codes.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>' +
        '<div class="row-btns"><button class="btn btn-ghost" type="button" data-copy="' + tfa.codes.join('\n') + '">' + I('copy') + 'Скопировать все</button><button class="btn" type="button" data-tfa="done">Я сохранил коды</button></div></div>';
    } else {
      h = '<div class="card panel span-7"><h2>' + ICO('shield', on ? 'ico-ok' : '') + 'Двухфакторная защита</h2>' +
        (on ? '<div class="status-line"><span class="chip ok">' + I('check') + 'Включена</span><span class="small">с ' + dateFmt(u.totp.at) + ' · резервных кодов: ' + (u.totp.backup || []).length + '</span></div><p>При входе кроме пароля потребуется код из приложения.</p>' +
          (confirmOff ? '<form class="confirm" id="fTfaOff" novalidate><b>Отключить защиту?</b><span class="small">Введите текущий код из приложения.</span><div class="inline-form"><input id="offCode" class="otp-input num" inputmode="numeric" maxlength="7" placeholder="000000" aria-label="Код из приложения"><button class="btn btn-danger" type="submit">Отключить</button><button class="btn btn-ghost" type="button" data-tfa="keep">Оставить</button></div><p class="form-err" role="alert" hidden></p></form>'
            : '<div class="row-btns"><button class="btn btn-ghost" type="button" data-tfa="off">Отключить</button></div>')
          : '<p>Защитите аккаунт: при входе кроме пароля нужен будет 6-значный код из приложения на телефоне.</p><div class="row-btns"><button class="btn" type="button" data-tfa="start">' + I('shield') + 'Включить защиту</button><span class="chip">+100 XP</span></div>') + '</div>' +
        '<div class="card panel span-5"><h2>' + ICO('clock') + 'Последние входы</h2><ul class="hist">' + (u.logins || []).map(function (l, i) { return '<li><span>' + esc(l.ua) + (i === 0 ? ' <span class="chip ok">сейчас</span>' : '') + '</span><span>' + dtFmt(l.at) + '</span></li>'; }).join('') + '</ul></div>';
    }
    var pw = u.pass ? '<div class="card panel span-12"><h2>' + ICO('lock') + 'Смена пароля</h2><form id="fPass" class="form-2" novalidate>' +
      '<div class="field full"><label for="cpOld">Текущий пароль</label><input id="cpOld" type="password" autocomplete="current-password"></div>' +
      '<div class="field"><label for="cpNew">Новый пароль</label><input id="cpNew" type="password" autocomplete="new-password"><small class="help">Минимум 8 символов, буквы и цифры.</small></div>' +
      '<div class="field"><label for="cpNew2">Повторите новый пароль</label><input id="cpNew2" type="password" autocomplete="new-password"></div>' +
      '<p class="form-err full" role="alert" hidden></p><div class="full"><button class="btn" type="submit">Сохранить пароль</button></div></form></div>'
      : '<div class="card panel span-12"><h2>' + ICO('lock') + 'Пароль</h2><p>В демо-кабинете пароль не используется. В своём аккаунте здесь можно сменить пароль.</p></div>';
    return '<div class="cab-grid">' + h + pw + '</div>';
  }
  function tabProfile(u) {
    var p = u.profile || {};
    var mode = Theme.mode();
    return '<div class="cab-grid">' +
      '<div class="card panel span-7"><h2>' + ICO('id') + 'Личные данные</h2>' + (questDone(u, 'profile') ? '' : '<p>Заполните имя, Telegram и город, чтобы получить <b>+50 XP</b>. Так менеджеру будет проще связаться с вами.</p>') +
      '<form id="fProfile" class="form-2" novalidate>' +
      '<div class="field"><label for="pfName">Имя</label><input id="pfName" autocomplete="name" maxlength="40" value="' + esc(p.name) + '"></div>' +
      '<div class="field"><label for="pfTg">Telegram</label><input id="pfTg" autocapitalize="off" spellcheck="false" maxlength="33" placeholder="@username" value="' + esc(p.telegram) + '"></div>' +
      '<div class="field"><label for="pfCity">Город</label><input id="pfCity" autocomplete="address-level2" maxlength="40" value="' + esc(p.city) + '"></div>' +
      '<div class="field"><label for="pfPhone">Телефон <span class="opt">необязательно</span></label><input id="pfPhone" type="tel" autocomplete="tel" maxlength="20" placeholder="+7" value="' + esc(p.phone) + '"></div>' +
      '<div class="field full"><label for="pfEmail">Email <span class="opt">необязательно</span></label><input id="pfEmail" type="email" autocomplete="email" maxlength="60" value="' + esc(p.email) + '"></div>' +
      '<p class="form-err full" role="alert" hidden></p><div class="full"><button class="btn" type="submit">Сохранить</button></div></form></div>' +
      '<div class="span-5" style="display:grid;gap:16px;align-content:start">' +
      '<div class="card panel"><h2>' + ICO('sun') + 'Оформление</h2><div class="theme-pick">' +
      [['auto', 'Как в системе', 'monitor'], ['dark', 'Тёмная', 'moon'], ['light', 'Светлая', 'sun']].map(function (t) { return '<button type="button" data-mode="' + t[0] + '" aria-pressed="' + (mode === t[0]) + '">' + I(t[2]) + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="card panel"><h2>' + ICO('smartphone') + 'Приложение на телефоне</h2><p class="small">Android: кнопка «Установить приложение» или меню браузера → «Добавить на главный экран». iPhone: «Поделиться» → «На экран „Домой“».</p><button class="btn btn-ghost" type="button" data-install hidden>' + I('download') + 'Установить приложение</button></div>' +
      '<div class="card panel"><h2>' + ICO('logout') + 'Аккаунт</h2><p class="small">Зарегистрирован ' + dateFmt(u.createdAt) + '. ID ' + u.id + '.</p>' +
      '<div class="row-btns"><button class="btn btn-ghost" type="button" data-logout>' + I('logout') + 'Выйти</button>' + (u.demo ? '' : '<button class="btn btn-danger" type="button" data-del>' + I('trash') + 'Удалить аккаунт</button>') + '</div>' +
      (confirmDel ? '<form class="confirm" id="fDel" novalidate><b>Удалить аккаунт навсегда?</b><span class="small">Уровень, очки и промокоды пропадут. Введите пароль для подтверждения.</span><input id="delPass" type="password" autocomplete="current-password" aria-label="Пароль"><div class="row-btns"><button class="btn btn-danger" type="submit">Удалить</button><button class="btn btn-ghost" type="button" data-del-cancel>Отмена</button></div><p class="form-err" role="alert" hidden></p></form>' : '') +
      '</div></div></div>';
  }

  function afterRender(u) {
    $$('[data-install]').forEach(function (b) { b.hidden = !installEvt; });
    function on(sel, fn) { var form = $(sel); if (form) fn(form); }
    on('#fPromo', function (f) { f.addEventListener('submit', function (e) {
      e.preventDefault(); var inp = $('#pCode'), code = inp.value.trim().toUpperCase(), me = Session.user();
      if (!code) return formErr(f, 'Введите промокод.', inp);
      var p = O.promoCodes[code];
      if (!p) return formErr(f, 'Такого промокода нет. Проверьте написание.', inp);
      if (me.promos && me.promos[code]) return formErr(f, 'Этот промокод уже активирован.', inp);
      me.promos = me.promos || {}; me.promos[code] = Date.now(); Acc.save(me);
      grant(me, 'promo:' + code, p.xp, 'Промокод ' + code + ' · ' + p.title);
      if (!questDone(me, 'promo')) questGrant(Session.user(), 'promo');
      renderCabinet();
    }); });
    on('#fTfa', function (f) {
      $('#tfaCode').focus();
      f.addEventListener('submit', async function (e) {
        e.preventDefault(); var code = $('#tfaCode').value;
        if (!(await SEC.verifyTotp(tfa.secret, code))) return formErr(f, 'Код не подошёл. Убедитесь, что время на телефоне точное, и введите новый код.', $('#tfaCode'));
        var codes = SEC.backupCodes(8), me = Session.user();
        me.totp = { on: true, secret: tfa.secret, at: Date.now(), backup: await Promise.all(codes.map(SEC.sha256)) };
        Acc.save(me); tfa = { step: 'codes', codes: codes };
        questGrant(Session.user(), 'twofa'); renderCabinet();
      });
    });
    on('#fTfaOff', function (f) {
      $('#offCode').focus();
      f.addEventListener('submit', async function (e) {
        e.preventDefault(); var me = Session.user();
        if (!(await SEC.verifyTotp(me.totp.secret, $('#offCode').value))) return formErr(f, 'Код не подошёл.', $('#offCode'));
        me.totp = null; Acc.save(me); confirmOff = false; renderCabinet(); toast('Двухфакторная защита отключена', 'ok', 'shield');
      });
    });
    on('#fPass', function (f) { f.addEventListener('submit', async function (e) {
      e.preventDefault(); var me = Session.user(), o = $('#cpOld'), n1 = $('#cpNew'), n2 = $('#cpNew2');
      if (!(await SEC.verifyPassword(o.value, me.pass))) return formErr(f, 'Текущий пароль указан неверно.', o);
      var pp = pwProblem(n1.value); if (pp) return formErr(f, pp, n1);
      if (n1.value !== n2.value) return formErr(f, 'Новые пароли не совпадают.', n2);
      me.pass = await SEC.hashPassword(n1.value); Acc.save(me); f.reset(); formErr(f, ''); toast('Пароль изменён', 'ok', 'lock');
    }); });
    on('#fProfile', function (f) { f.addEventListener('submit', function (e) {
      e.preventDefault(); var me = Session.user();
      var name = $('#pfName').value.trim(), tg = $('#pfTg').value.trim().replace(/^@/, ''), city = $('#pfCity').value.trim(), phone = $('#pfPhone').value.trim(), email = $('#pfEmail').value.trim();
      if (tg && !TG_RE.test(tg)) return formErr(f, 'Проверьте Telegram: 5–32 символа, латиница, цифры и «_».', $('#pfTg'));
      if (phone && !/^[+\d][\d\s()-]{5,19}$/.test(phone)) return formErr(f, 'Проверьте номер телефона.', $('#pfPhone'));
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return formErr(f, 'Проверьте email.', $('#pfEmail'));
      me.profile = { name: name, telegram: tg ? '@' + tg : '', city: city, phone: phone, email: email }; Acc.save(me);
      formErr(f, ''); toast('Профиль сохранён', 'ok', 'id');
      if (name && tg && city) questGrant(Session.user(), 'profile');
      renderCabinet();
    }); });
    on('#fDel', function (f) {
      $('#delPass').focus();
      f.addEventListener('submit', async function (e) {
        e.preventDefault(); var me = Session.user();
        if (!(await SEC.verifyPassword($('#delPass').value, me.pass))) return formErr(f, 'Неверный пароль.', $('#delPass'));
        Acc.remove(me.id); Session.end(); confirmDel = false; cabTab = 'overview'; refreshChrome(); navigate('top', true); toast('Аккаунт удалён', 'ok', 'trash');
      });
    });
  }

  // общие действия по клику
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-copy]');
    if (t) { var sel = t.dataset.copySel ? $(t.dataset.copySel) : null; copyText(t.dataset.copy, sel); return; }
    if ((t = e.target.closest('[data-quest]'))) { var u = Session.user(); if (u) setTimeout(function () { if (questGrant(u, t.dataset.quest) && view === 'cabinet') renderCabinet(); }, 300); return; }
    if ((t = e.target.closest('[data-go]'))) { goTab(t.dataset.go); return; }
    if ((t = e.target.closest('[data-tfa]'))) {
      var a = t.dataset.tfa;
      if (a === 'start') tfa = { step: 'setup', secret: SEC.newSecret() };
      else if (a === 'cancel' || a === 'done') tfa = { step: 'idle' };
      else if (a === 'off') confirmOff = true;
      else if (a === 'keep') confirmOff = false;
      if (a === 'done') toast('Двухфакторная защита включена', 'ok', 'shield');
      renderCabinet(); return;
    }
    if ((t = e.target.closest('[data-mode]'))) { Theme.set(t.dataset.mode); return; }
    if ((t = e.target.closest('[data-logout]'))) {
      var me = Session.user(); Session.end(); cabTab = 'overview'; refreshChrome();
      if (me && me.demo) Acc.remove(me.id);
      if (!t.matches('a')) { navigate('top', true); toast('Вы вышли из аккаунта', 'ok', 'logout'); }
      return;
    }
    if ((t = e.target.closest('[data-del]'))) { confirmDel = true; renderCabinet(); return; }
    if ((t = e.target.closest('[data-del-cancel]'))) { confirmDel = false; renderCabinet(); return; }
    if ((t = e.target.closest('[data-install]'))) {
      if (installEvt) { installEvt.prompt(); installEvt.userChoice.then(function () { installEvt = null; $$('[data-install]').forEach(function (b) { b.hidden = true; }); }); }
    }
  }, true);

  /* ============================== установка как приложение ============================== */
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; $$('[data-install]').forEach(function (b) { b.hidden = false; }); });

  /* ============================== старт ============================== */
  authMode('login');
  refreshChrome();
  route();
})();

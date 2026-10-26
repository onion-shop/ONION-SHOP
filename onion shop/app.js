/* Onion Shop · приложение: навигация, тема, сроки, тарифы, калькулятор, хэллоуинские украшения и плашка с промокодом.
   Регистрации, личного кабинета и бонусов на сайте сейчас нет: сайт справочный. */
(function () {
  'use strict';
  var O = window.ONION, HW = O.halloween || {};
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NB = ' ';
  var I = function (n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var ICO = function (n, cls) { return '<span class="ico' + (cls ? ' ' + cls : '') + '">' + I(n) + '</span>'; };
  var fmt = function (n) { return (Math.round(n * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }); };
  var rng = function (a, b, u) { return (Math.abs(a - b) < 0.005 ? fmt(a) : fmt(a) + '–' + fmt(b)) + (u ? NB + u : ''); };
  var plural = function (n, f) { n = Math.abs(Math.round(n)); var a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 10 || b >= 20)) ? 1 : 2]; };
  var daysWord = function (n) { return plural(n, ['день', 'дня', 'дней']); };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /* ---------- уборка: на сайте больше нет аккаунтов, стираем старые данные кабинета из браузера ---------- */
  try {
    var keep = { 'onion.theme': 1, 'onion.game.best': 1, 'onion.promo.closed': 1 };
    for (var k = localStorage.length - 1; k >= 0; k--) {
      var key = localStorage.key(k);
      if (key && key.indexOf('onion.') === 0 && !keep[key]) localStorage.removeItem(key);
    }
    for (var j = sessionStorage.length - 1; j >= 0; j--) {
      var sk = sessionStorage.key(j);
      if (sk && sk.indexOf('onion.') === 0) sessionStorage.removeItem(sk);
    }
  } catch (e) { }

  function toast(msg, type, icon) {
    var box = $('#toasts'); if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML = I(icon || (type === 'err' ? 'alert' : 'check-circle')) + '<span>' + msg + '</span>';
    box.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, 3200);
  }
  function copyText(text, selEl) {
    var done = function () { toast('Скопировано: <b>' + text.replace(/</g, '&lt;') + '</b>', 'ok', 'copy'); };
    var fallback = function () {
      if (selEl) { var r = document.createRange(); r.selectNodeContents(selEl); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast('Текст выделен — нажмите «Копировать»', 'ok', 'copy');
    };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }

  /* ---------- Хэллоуин и промокод (время — московское, UTC+3) ---------- */
  if (HW.theme === false) root.classList.remove('s-hw'); else root.classList.add('s-hw');
  var promo = (function () {
    var p = HW.promo; if (!p || !p.code || !p.until) return { active: false };
    var d = p.until.split('-').map(Number);
    var end = Date.UTC(d[0], d[1] - 1, d[2], 23, 59, 59) - 3 * 3600 * 1000; // конец дня по Москве
    return { active: Date.now() <= end, code: p.code, perk: p.perk || '', end: end, untilText: 'до ' + d[2] + ' ' + MONTHS_GEN[d[1] - 1] };
  })();
  function leftText() {
    var ms = promo.end - Date.now(); if (ms <= 0) return 'Акция закончилась';
    var h = Math.floor(ms / 3600000), dd = Math.floor(h / 24); h = h % 24;
    var m = Math.floor(ms / 60000) % 60;
    return promo.untilText + ' включительно · осталось ' + (dd ? dd + NB + 'дн ' + h + NB + 'ч' : h ? h + NB + 'ч ' + m + NB + 'мин' : m + NB + 'мин');
  }
  (function () {
    var pill = $('#heroPill span');
    $$('[data-promo-only]').forEach(function (el) { el.hidden = !promo.active; });
    $$('[data-promo-until]').forEach(function (el) { el.textContent = promo.untilText || ''; });
    if (!promo.active || HW.theme === false) return;
    if (pill) pill.innerHTML = 'Хэллоуин: промокод <b>' + promo.code + '</b> ' + promo.untilText;
    var box = $('#promoFly'); if (!box) return;
    var mark = promo.code + promo.end, closed = false;
    try { closed = localStorage.getItem('onion.promo.closed') === String(mark); } catch (e) { }
    $('#pfCode b').textContent = promo.code;
    $('#pfCode').setAttribute('aria-label', 'Скопировать промокод ' + promo.code);
    var perk = $('#pfPerk');
    perk.textContent = promo.perk ? promo.perk : 'Назовите код менеджеру, когда оформляете предзаказ.';
    function tick() { $('#pfTime').textContent = leftText(); if (Date.now() > promo.end) box.hidden = true; }
    tick(); setInterval(tick, 30000);
    $('#pfCode').addEventListener('click', function () { copyText(promo.code); });
    var mini = $('#pfMini'), timer = 0;
    function hideCard(cb) {
      clearTimeout(timer);
      if (reduceMotion || box.hidden) { box.hidden = true; if (cb) cb(); return; }
      box.classList.add('out'); setTimeout(function () { box.hidden = true; box.classList.remove('out'); if (cb) cb(); }, 450);
    }
    function showCard() {
      mini.hidden = true; box.hidden = false;
      clearTimeout(timer); timer = setTimeout(function () { hideCard(function () { mini.hidden = false; }); }, 12000); // через 12 с сворачивается в тыковку
    }
    // крестик — убрать насовсем; тыковка — открыть снова
    $('.pf-x', box).addEventListener('click', function () {
      try { localStorage.setItem('onion.promo.closed', String(mark)); } catch (e) { }
      mini.hidden = true; hideCard();
    });
    box.addEventListener('pointerenter', function () { clearTimeout(timer); });
    box.addEventListener('focusin', function () { clearTimeout(timer); });
    mini.addEventListener('click', showCard);
    if (!closed) setTimeout(showCard, reduceMotion ? 300 : 1600);
  })();

  /* ---------- тема ---------- */
  var Theme = {
    set: function (m) {
      try { localStorage.setItem('onion.theme', m); } catch (e) { }
      root.setAttribute('data-ui', m); Theme.sync();
    },
    effective: function () { return /light/.test(getComputedStyle(root).colorScheme || '') ? 'light' : 'dark'; },
    sync: function () {
      var light = Theme.effective() === 'light';
      root.classList.toggle('is-light', light);
      var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', light ? '#f8f2ff' : '#0f0818');
      var b = $('#themeBtn'); if (b) b.setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
      if (window.OnionGlobe) window.OnionGlobe.redraw();
    }
  };
  $('#themeBtn').addEventListener('click', function () { Theme.set(Theme.effective() === 'light' ? 'dark' : 'light'); });
  if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: light)'); (mq.addEventListener ? mq.addEventListener('change', Theme.sync) : mq.addListener(Theme.sync)); }
  new MutationObserver(Theme.sync).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  Theme.sync();

  /* ---------- навигация по разделам ---------- */
  var OLD = { login: 1, signup: 1, cabinet: 1, admin: 1, levels: 1 }; // старые адреса кабинета ведут на главную
  function go(h, smooth) {
    closeMenu();
    if (OLD[h]) { h = 'top'; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } }
    var el = h && h !== 'top' ? document.getElementById(h) : null;
    var beh = smooth && !reduceMotion ? 'smooth' : 'auto';
    if (el) requestAnimationFrame(function () { el.scrollIntoView({ behavior: beh, block: 'start' }); });
    else if (h === 'top' || !h) window.scrollTo({ top: 0, behavior: beh });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-nav]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '#') return;
    e.preventDefault();
    var h = href.slice(1);
    try { history.pushState(null, '', h === 'top' ? location.pathname + location.search : '#' + h); } catch (err) { }
    go(h, true);
  });
  window.addEventListener('popstate', function () { go(decodeURIComponent(location.hash.slice(1)), true); });

  var burger = $('#burger'), mnav = $('#mnav');
  function closeMenu() { mnav.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Открыть меню'); }
  burger.addEventListener('click', function () {
    var open = mnav.hidden; mnav.hidden = !open;
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });

  // активная вкладка нижней панели
  var TAB_SECTIONS = ['tariffs', 'calc', 'game', 'contacts'];
  function setTab() {
    var cur = 'top', line = window.innerHeight * 0.45;
    TAB_SECTIONS.forEach(function (id) { var el = document.getElementById(id); if (el && el.getBoundingClientRect().top < line) cur = id; });
    var c = document.getElementById(cur);
    if (cur !== 'top' && cur !== 'contacts' && c && c.getBoundingClientRect().bottom < line) cur = '';
    $$('.tabbar a').forEach(function (a) { if (a.dataset.tab === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; setTab(); }); } }, { passive: true });

  /* ============================== главная: сроки ============================== */
  (function () {
    var colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];
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
  (function () {
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
      var s0 = b0 * r0, s1 = b1 * r1, pack = d.pack == null ? 0 : d.pack, t0 = s0 + pack, t1 = s1 + pack;
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
        (d.pack == null ? '' : '<div><dt>Упаковка и оформление</dt><dd>' + fmt(pack) + NB + '$</dd></div>') +
        '</dl>' +
        '<div class="r-total"><span class="k">Примерно за доставку из Китая</span><span class="big">≈ ' + rng(t0, t1, '$') + '</span></div>' +
        '<div class="r-extra"><p>' + I('timer') + '<span>В пути от нашего склада: ' + rng(d.days[0], d.days[1]) + NB + daysWord(d.days[1]) + '.</span></p>' +
        (d.local ? '<p class="w">' + I('alert') + '<span>' + d.local + '</span></p>' : '') +
        (d.noIns ? '<p class="w">' + I('alert') + '<span>Страховка в эту страну недоступна.</span></p>' : '') + '</div>' +
        '<p class="small">Стоимость самого товара сюда не входит. Расчёт по типичному весу вещей, точную сумму назовём после взвешивания на складе.</p>' +
        '<a class="btn" href="' + O.contacts.support + '" target="_blank" rel="noopener">' + I('send') + 'Уточнить у менеджера</a>';
      out.innerHTML = html;
    }
    function all() { renderCats(); renderItems(); run(); }
    cats.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; cat = b.dataset.id; renderCats(); renderItems(); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]'); if (!b) return;
      var k = b.dataset.k, d = +b.dataset.d; qty[k] = Math.max(0, (qty[k] || 0) + d); if (!qty[k]) delete qty[k];
      isExample = false; all();
      var again = $('button[data-k="' + k + '"][data-d="' + d + '"]', list);
      (again && !again.disabled ? again : $('button[data-k="' + k + '"][data-d="1"]', list)).focus();
    });
    sel.addEventListener('change', function () { isExample = false; run(); });
    $('#cReset').addEventListener('click', function () { qty = {}; isExample = false; all(); });
    all();
  })();


  /* ---------- появление блоков при прокрутке ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var SEL = ['.sec-head', '.quote', '.pc-card', '.gloss .g', '.step', '.t-card', '.total', '.f-item', '.w-card', '#tariffPanel',
      '.c-panel', '.result', '.r-card', '.g-stage', '.g-side', '.dep-col', '.faq details', '.cta', '.links li', '.tile', '.foot-col', '.foot-brand'];
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    var vh = window.innerHeight;
    $$(SEL.join(',')).forEach(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.92) return; // то, что видно сразу, не прячем
      var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      el.style.setProperty('--d', Math.min(sib, 6) * 0.06 + 's');
      el.classList.add('rv'); io.observe(el);
    });
  }

  /* ---------- паучок: по нажатию спускается и поднимается ---------- */
  var spider = $('.hw-spider');
  if (spider) spider.addEventListener('click', function () {
    spider.classList.remove('drop'); void spider.offsetWidth; spider.classList.add('drop');
    setTimeout(function () { spider.classList.remove('drop'); }, 1700);
  });

  /* ---------- иногда через экран пролетает летучая мышь ---------- */
  if (!reduceMotion && HW.theme !== false) {
    var flyby = function () {
      if (!document.hidden) {
        var b = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        b.setAttribute('viewBox', '0 0 100 42'); b.setAttribute('class', 'flyby'); b.setAttribute('aria-hidden', 'true');
        b.innerHTML = '<use href="#bat-shape"/>';
        b.style.top = (18 + Math.random() * 50) + '%';
        document.body.appendChild(b);
        setTimeout(function () { b.remove(); }, 8200);
      }
      setTimeout(flyby, 28000 + Math.random() * 26000);
    };
    setTimeout(flyby, 9000);
  }

  /* ---------- установка как приложение, копирование ---------- */
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; $$('[data-install]').forEach(function (b) { b.hidden = false; }); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-copy]');
    if (t) { var sel = t.dataset.copySel ? $(t.dataset.copySel) : null; copyText(t.dataset.copy, sel); return; }
    if ((t = e.target.closest('[data-install]')) && installEvt) {
      installEvt.prompt(); installEvt.userChoice.then(function () { installEvt = null; $$('[data-install]').forEach(function (b) { b.hidden = true; }); });
    }
  });

  // во время игры плашка и пролетающие мыши не мешают
  document.addEventListener('onion:game', function (e) { root.classList.toggle('gaming', !!(e.detail && e.detail.playing)); });

  window.OnionUI = { I: I, toast: toast, copyText: copyText, promo: promo, reduceMotion: reduceMotion };

  /* ---------- старт ---------- */
  setTab();
  if (location.hash) go(decodeURIComponent(location.hash.slice(1)), false);
})();

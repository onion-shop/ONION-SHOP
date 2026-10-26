/* Onion Shop · мини-игра «Тыквопад»: ловите тыквы и конфеты в котёл, уворачивайтесь от летучих мышей.
   Рекорд хранится только в этом браузере. Никаких призов и очков магазина игра не даёт. */
(function () {
  'use strict';
  var stage = document.querySelector('[data-game]');
  if (!stage) return;
  var O = window.ONION || {}, CFG = O.game || {}, UI = window.OnionUI || {};
  var cv = stage.querySelector('canvas'), ctx = cv.getContext('2d');
  var $g = function (n) { return stage.querySelector('[data-g="' + n + '"]'); };
  var elScore = $g('score'), elTime = $g('time'), elLives = $g('lives'), elMul = $g('mul'), over = $g('over');
  var SECS = CFG.seconds || 60, LIVES = CFG.lives || 3;
  var reduce = !!UI.reduceMotion;
  var I = UI.I || function (n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };

  /* ---------- рекорд ---------- */
  var memBest = 0;
  function getBest() { try { return Math.max(memBest, +localStorage.getItem('onion.game.best') || 0); } catch (e) { return memBest; } }
  function setBest(v) { memBest = v; try { localStorage.setItem('onion.game.best', String(v)); } catch (e) { } }
  function showBest() { document.querySelectorAll('[data-g="best"]').forEach(function (el) { el.textContent = getBest(); }); }

  /* ---------- размеры ---------- */
  var W = 0, H = 0, dpr = 1, S = 1, stars = [];
  function resize() {
    var r = cv.getBoundingClientRect(); if (!r.width) return;
    W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    S = Math.max(.72, Math.min(1.25, Math.min(W / 640, H / 470)));
    P.y = H - 62 * S; P.x = clamp(P.x || W / 2, cw() / 2, W - cw() / 2); P.tx = P.x;
    stars = []; for (var i = 0; i < 46; i++) stars.push([Math.random(), Math.random() * .62, Math.random() * 1.3 + .4, Math.random() * 6.28]);
    if (st !== 'play') draw(0);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function cw() { return 92 * S; }

  /* ---------- состояние ---------- */
  var st = 'idle', P = { x: 0, tx: 0, y: 0 }, items = [], parts = [], texts = [];
  var score = 0, lives = LIVES, elapsed = 0, streak = 0, spawnT = 0, inv = 0, shake = 0, last = 0, raf = 0, keys = {};
  var TYPES = {
    pumpkin: { r: 18, pts: 1, sp: 1, col: '#ff9a3c' },
    candy: { r: 13, pts: 2, sp: 1.28, col: '#c084fc' },
    gold: { r: 19, pts: 5, sp: 1.18, col: '#ffd84d' },
    bat: { r: 20, pts: 0, sp: .92, col: '#b48cff', bad: true }
  };
  function mult() { return 1 + Math.min(2, Math.floor(streak / 8)); }
  function pick() {
    var t = elapsed / SECS, bat = .15 + .15 * t, gold = .05, candy = .22, r = Math.random();
    if (r < bat) return 'bat'; r -= bat; if (r < gold) return 'gold'; r -= gold; if (r < candy) return 'candy'; return 'pumpkin';
  }
  function spawn() {
    var k = pick(), T = TYPES[k], r = T.r * S, x = r + Math.random() * (W - 2 * r);
    items.push({ k: k, x: x, x0: x, y: -r - 6, r: r, vy: (115 + elapsed * 3.4) * S * T.sp * (.85 + Math.random() * .3), ph: Math.random() * 6.28, a: 0, rot: (Math.random() - .5) * .8, spin: (Math.random() - .5) * 2 });
  }

  /* ---------- игра ---------- */
  function start() {
    score = 0; lives = LIVES; elapsed = 0; streak = 0; spawnT = .4; inv = 0; shake = 0; items = []; parts = []; texts = []; keys = {};
    P.x = P.tx = W / 2;
    st = 'play'; stage.classList.add('playing'); over.hidden = true; over.innerHTML = ''; notify(true);
    hud(); last = 0; loop();
  }
  function pause() {
    if (st !== 'play') return;
    st = 'pause'; shake = 0; keys = {}; stage.classList.remove('playing'); cancelAnimationFrame(raf); raf = 0; notify(false);
    screen('<div class="g-pk"></div><h3>Пауза</h3><p>Котёл ждёт. Продолжим?</p><button class="btn" type="button" data-g-act="resume">' + I('play') + 'Продолжить</button>');
  }
  function resume() { if (st !== 'pause') return; st = 'play'; stage.classList.add('playing'); over.hidden = true; last = 0; notify(true); loop(); }
  function notify(on) { try { document.dispatchEvent(new CustomEvent('onion:game', { detail: { playing: on } })); } catch (e) { } }
  function end(why) {
    st = 'over'; shake = 0; keys = {}; stage.classList.remove('playing'); cancelAnimationFrame(raf); raf = 0; notify(false); draw(0);
    var best = getBest(), rec = score > best && score > 0;
    if (rec) setBest(score);
    showBest();
    var pr = UI.promo && UI.promo.active ? '<p class="g-promo">Промокод <b>' + UI.promo.code + '</b> действует ' + UI.promo.untilText + ' — назовите его менеджеру.</p>' : '';
    screen('<h3>' + (why === 'lives' ? 'Мыши победили!' : 'Время вышло!') + '</h3>' +
      '<div class="g-score num">' + score + '</div>' +
      (rec ? '<span class="g-rec">' + I('trophy') + 'Новый рекорд!</span>' : '<p>Ваш рекорд: <b>' + Math.max(best, score) + '</b></p>') +
      '<button class="btn" type="button" data-g-act="start">' + I('refresh') + 'Ещё раз</button>' + pr);
  }
  function screen(html) { over.innerHTML = html; over.hidden = false; }
  function idle() {
    screen('<div class="g-pk"></div><h3>Тыквопад</h3><p>Ведите котёл и ловите тыквы с конфетами. Летучие мыши отнимают жизнь.</p>' +
      '<button class="btn btn-glow" type="button" data-g-act="start">' + I('play') + 'Играть</button>');
  }

  function hud() {
    elScore.textContent = score;
    elTime.textContent = Math.ceil(Math.max(0, SECS - elapsed));
    var m = mult();
    if (m > 1) { if (elMul.hidden || elMul.textContent !== '×' + m) { elMul.textContent = '×' + m; elMul.hidden = false; elMul.style.animation = 'none'; void elMul.offsetWidth; elMul.style.animation = ''; } }
    else elMul.hidden = true;
    var h = ''; for (var i = 0; i < LIVES; i++) h += '<span class="' + (i < lives ? '' : 'off') + '"></span>';
    if (elLives.innerHTML !== h) elLives.innerHTML = h;
  }

  function burst(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, v = (60 + Math.random() * 160) * S;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * S, life: .6 + Math.random() * .4, t: 0, col: col, r: (1.5 + Math.random() * 2.5) * S });
    }
  }
  function floatText(x, y, txt, col) { texts.push({ x: x, y: y, txt: txt, col: col, t: 0 }); }

  function update(dt) {
    elapsed += dt;
    if (inv > 0) inv -= dt;
    if (shake > 0) shake -= dt;
    var spd = 700 * S, half = cw() / 2;
    if (keys.l) P.tx -= spd * dt;
    if (keys.r) P.tx += spd * dt;
    P.tx = clamp(P.tx, half, W - half);
    P.x += (P.tx - P.x) * Math.min(1, dt * 16);

    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(.3, .82 - elapsed * .009) * (.7 + Math.random() * .6); }

    var top = P.y - 14 * S;
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i], T = TYPES[it.k];
      it.y += it.vy * dt; it.a += dt; it.rot += it.spin * dt;
      if (it.k === 'bat') it.x = clamp(it.x0 + Math.sin(it.a * 2.6 + it.ph) * 46 * S, it.r, W - it.r);
      // попало в котёл
      if (it.y + it.r * .5 >= top && it.y - it.r * .5 <= top + 16 * S && Math.abs(it.x - P.x) < half - it.r * .2) {
        items.splice(i, 1);
        if (T.bad) {
          if (inv <= 0) {
            lives--; inv = 1; shake = reduce ? 0 : .35; streak = 0;
            burst(it.x, top, '#b48cff', 16); floatText(it.x, top - 10 * S, '−1 жизнь', '#ff8fa3');
            if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { }
            if (lives <= 0) { hud(); end('lives'); return; }
          }
        } else {
          streak++;
          var pts = T.pts * mult(); score += pts;
          burst(it.x, top, T.col, it.k === 'gold' ? 22 : 10);
          floatText(it.x, top - 10 * S, '+' + pts, it.k === 'gold' ? '#ffd84d' : '#ffe2c2');
        }
        continue;
      }
      if (it.y - it.r > H) { items.splice(i, 1); if (!T.bad) streak = 0; }
    }
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.vy += 380 * S * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > .9) texts.splice(i, 1); }
    if (elapsed >= SECS) { hud(); end('time'); return; }
    hud();
  }

  /* ---------- рисование ---------- */
  var batPath = typeof Path2D !== 'undefined' ? new Path2D('M50 18C47 14 46 10 47 5L43.5 10C40 8 36 9 33 12 27 8 14 6 2 14 10 15 14 20 14 27 19 24 25 25 28 30 32 27 38 27 41 31 44 30 47 33 50 39 53 33 56 30 59 31 62 27 68 27 72 30 75 25 81 24 86 27 86 20 90 15 98 14 86 6 73 8 67 12 64 9 60 8 56.5 10L53 5C54 10 53 14 50 18Z') : null;

  function sky(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#12061f'); g.addColorStop(.55, '#2a0f45'); g.addColorStop(1, '#3d1450');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // луна
    var mx = W * .84, my = H * .18, mr = 26 * S;
    var gl = ctx.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4);
    gl.addColorStop(0, 'rgba(255,214,150,.28)'); gl.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, 7); ctx.fill();
    var mg = ctx.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr);
    mg.addColorStop(0, '#fffaf0'); mg.addColorStop(.5, '#ffe7b8'); mg.addColorStop(1, '#f2b65a');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(196,128,48,.25)';
    ctx.beginPath(); ctx.arc(mx - mr * .3, my - mr * .15, mr * .2, 0, 7); ctx.arc(mx + mr * .3, my + mr * .3, mr * .25, 0, 7); ctx.fill();
    // звёзды
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = .35 + .45 * Math.abs(Math.sin(t * .0012 + s[3]));
      ctx.fillStyle = 'rgba(255,240,220,' + a.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(s[0] * W, s[1] * H, s[2] * S * .8, 0, 7); ctx.fill();
    }
    // холмы и надгробия
    ctx.fillStyle = '#170826';
    ctx.beginPath(); ctx.moveTo(0, H);
    ctx.lineTo(0, H - 34 * S);
    ctx.quadraticCurveTo(W * .2, H - 60 * S, W * .42, H - 36 * S);
    ctx.quadraticCurveTo(W * .66, H - 14 * S, W * .82, H - 42 * S);
    ctx.quadraticCurveTo(W * .93, H - 56 * S, W, H - 40 * S);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0e0418';
    [[.1, 1], [.17, .8], [.88, 1.1], [.95, .75]].forEach(function (g2) {
      var x = g2[0] * W, w = 16 * S * g2[1], h = 24 * S * g2[1], y = H - 30 * S;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y + h * .4); ctx.lineTo(x - w / 2, y - h * .3);
      ctx.arc(x, y - h * .3, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y + h * .4); ctx.closePath(); ctx.fill();
    });
  }

  function pumpkin(x, y, r, gold, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    var g = ctx.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.15);
    if (gold) { g.addColorStop(0, '#fff6c4'); g.addColorStop(.5, '#ffd84d'); g.addColorStop(1, '#c98a00'); }
    else { g.addColorStop(0, '#ffc47a'); g.addColorStop(.55, '#ff7a18'); g.addColorStop(1, '#a8380a'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(-r * .42, r * .04, r * .6, r * .82, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * .42, r * .04, r * .6, r * .82, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, r * .66, r * .9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = gold ? 'rgba(140,90,0,.35)' : 'rgba(120,40,0,.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * .3, r * .88, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#4d7c0f'; ctx.beginPath(); ctx.moveTo(-r * .08, -r * .78); ctx.lineTo(-r * .02, -r * 1.12); ctx.lineTo(r * .18, -r * 1.08); ctx.lineTo(r * .1, -r * .76); ctx.fill();
    ctx.fillStyle = gold ? '#6b3d00' : '#3b1200';
    ctx.beginPath(); ctx.moveTo(-r * .42, -r * .12); ctx.lineTo(-r * .14, -r * .3); ctx.lineTo(-r * .16, r * .02); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * .42, -r * .12); ctx.lineTo(r * .14, -r * .3); ctx.lineTo(r * .16, r * .02); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * .44, r * .26); ctx.quadraticCurveTo(0, r * .62, r * .44, r * .26); ctx.quadraticCurveTo(0, r * .42, -r * .44, r * .26); ctx.fill();
    ctx.restore();
  }
  function candy(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#d8b4fe';
    ctx.beginPath(); ctx.moveTo(-r * .7, 0); ctx.lineTo(-r * 1.75, -r * .8); ctx.lineTo(-r * 1.55, 0); ctx.lineTo(-r * 1.75, r * .8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * .7, 0); ctx.lineTo(r * 1.75, -r * .8); ctx.lineTo(r * 1.55, 0); ctx.lineTo(r * 1.75, r * .8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = r * .28;
    for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-r + k * r * .7, -r); ctx.lineTo(r + k * r * .7, r); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  function bat(x, y, r, a) {
    if (!batPath) return;
    var w = r * 2.6, fl = .55 + .45 * Math.abs(Math.sin(a * 14));
    ctx.save(); ctx.translate(x, y); ctx.scale(w / 100, w / 100 * fl); ctx.translate(-50, -21);
    ctx.shadowColor = 'rgba(255,138,31,.8)'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#12061f'; ctx.fill(batPath);
    ctx.shadowBlur = 0; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,138,31,.75)'; ctx.stroke(batPath);
    ctx.restore();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(x - r * .14, y - r * .02, r * .07, 0, 7); ctx.arc(x + r * .14, y - r * .02, r * .07, 0, 7); ctx.fill();
  }
  function cauldron(x, y, t) {
    var w = cw(), h = w * .62;
    ctx.save(); ctx.translate(x, y);
    if (inv > 0 && Math.floor(inv * 12) % 2) ctx.globalAlpha = .45;
    var gl = ctx.createRadialGradient(0, -h * .1, 2, 0, -h * .1, w * .85);
    gl.addColorStop(0, 'rgba(200,120,255,.4)'); gl.addColorStop(1, 'rgba(200,120,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -h * .1, w * .85, 0, 7); ctx.fill();
    ctx.fillStyle = '#0d0618';
    ctx.fillRect(-w * .34, h * .62, w * .1, h * .3); ctx.fillRect(w * .24, h * .62, w * .1, h * .3);
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#4a3470'); bg.addColorStop(1, '#130a22');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(-w * .47, 0);
    ctx.bezierCurveTo(-w * .62, h * .55, -w * .3, h * .92, 0, h * .92);
    ctx.bezierCurveTo(w * .3, h * .92, w * .62, h * .55, w * .47, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.ellipse(-w * .2, h * .35, w * .07, h * .2, -.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1d40'; ctx.strokeStyle = '#8a6cc4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, w * .53, h * .17, 0, 0, 7); ctx.fill(); ctx.stroke();
    var pg = ctx.createRadialGradient(0, 0, 2, 0, 0, w * .45);
    pg.addColorStop(0, '#f0c2ff'); pg.addColorStop(1, '#9d4edd');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(0, 1, w * .44, h * .11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,255,.85)';
    for (var b = 0; b < 3; b++) {
      var ph = (t * .002 + b * .33) % 1, bx = (b - 1) * w * .2 + Math.sin(t * .003 + b) * 4;
      ctx.globalAlpha = (inv > 0 && Math.floor(inv * 12) % 2 ? .45 : 1) * (1 - ph);
      ctx.beginPath(); ctx.arc(bx, -ph * h * .45, (2 + b) * S * (1 - ph * .4), 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function draw(t) {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * 10 * S, (Math.random() - .5) * 8 * S);
    sky(t);
    if (st === 'idle') {
      pumpkin(W * .13, H * .3, 20 * S, false, -.2); candy(W * .16, H * .64, 13 * S, .5); pumpkin(W * .87, H * .6, 19 * S, true, .25); bat(W * .8, H * .36, 20 * S, t * .001);
    }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.k === 'pumpkin' || it.k === 'gold') pumpkin(it.x, it.y, it.r, it.k === 'gold', it.rot);
      else if (it.k === 'candy') candy(it.x, it.y, it.r, it.rot * 2);
      else bat(it.x, it.y, it.r, it.a);
    }
    cauldron(P.x, P.y, t);
    for (i = 0; i < parts.length; i++) {
      var p = parts[i]; ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.font = '700 ' + Math.round(18 * S) + 'px Unbounded, system-ui, sans-serif';
    for (i = 0; i < texts.length; i++) {
      var tx = texts[i]; ctx.globalAlpha = 1 - tx.t / .9; ctx.fillStyle = tx.col;
      ctx.fillText(tx.txt, tx.x, tx.y - tx.t * 46 * S);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function loop(t) {
    raf = requestAnimationFrame(function (now) {
      if (st !== 'play') return;
      var dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      update(dt);
      if (st === 'play') { draw(now); loop(); } else draw(now);
    });
  }

  /* ---------- управление ---------- */
  function px(e) { var r = cv.getBoundingClientRect(); return e.clientX - r.left; }
  stage.addEventListener('pointermove', function (e) { if (st === 'play') P.tx = px(e); });
  stage.addEventListener('pointerdown', function (e) { if (st === 'play') { P.tx = px(e); } });
  document.addEventListener('keydown', function (e) {
    if (st !== 'play') return;
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ф' || k === 'Ф') { keys.l = true; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'в' || k === 'В') { keys.r = true; e.preventDefault(); }
    else if (k === 'Escape' || k === 'p' || k === 'P' || k === 'з' || k === 'З') { pause(); }
    else if (k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') e.preventDefault();
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || /^[aAфФ]$/.test(e.key)) keys.l = false;
    if (e.key === 'ArrowRight' || /^[dDвВ]$/.test(e.key)) keys.r = false;
  });
  over.addEventListener('click', function (e) {
    var b = e.target.closest('[data-g-act]'); if (!b) return;
    var a = b.dataset.gAct;
    if (a === 'start') start(); else if (a === 'resume') resume();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (!es[0].isIntersecting) pause(); }, { threshold: .25 }).observe(stage);
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); }).observe(stage);

  resize(); showBest(); hud(); idle();
  // в покое луна и звёзды тоже чуть мерцают
  if (!reduce) {
    (function idleLoop(t) { if (st === 'idle' || st === 'over' || st === 'pause') { if (stage.getBoundingClientRect().bottom > 0 && stage.getBoundingClientRect().top < innerHeight && !document.hidden) draw(t || 0); } setTimeout(function () { requestAnimationFrame(idleLoop); }, 120); })();
  }
})();

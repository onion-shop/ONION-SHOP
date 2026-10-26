/* Onion Shop · анимированный глобус: точки материков, маршрут «склад в Китае → вы», самолёт, карточка посылки. */
(function () {
  'use strict';
  var box = document.querySelector('[data-globe]');
  if (!box) return;
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  var lblFrom = box.querySelector('[data-pin="from"]'), lblTo = box.querySelector('[data-pin="to"]');
  var bar = document.querySelector('[data-parcel-bar]'), pct = document.querySelector('[data-parcel-pct]');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var D = Math.PI / 180;
  var FROM = [23.1, 113.3], TO = [55.75, 37.6]; // Гуанчжоу → Москва

  // Грубые очертания материков эллипсами: [широта, долгота, радиус по широте, радиус по долготе]
  var LAND = [[55, 40, 12, 30], [48, 10, 9, 16], [62, 100, 12, 46], [41, 70, 9, 22], [33, 106, 12, 17], [22, 79, 9, 7], [15, 102, 7, 6],
    [24, 46, 8, 10], [38, 34, 4, 9], [65, 16, 7, 9], [36, 138, 6, 3], [-2, 114, 5, 13], [18, 10, 12, 25], [1, 22, 12, 14], [-18, 26, 11, 10],
    [-20, 47, 5, 2.5], [56, -105, 13, 32], [40, -98, 10, 22], [20, -100, 6, 8], [71, -42, 8, 14], [-5, -62, 13, 15], [-25, -60, 12, 10],
    [-42, -68, 10, 5], [-25, 134, 10, 16], [64, 160, 8, 18]];
  var dots = [];
  for (var la = -60; la <= 78; la += 3.4) {
    var step = 3.4 / Math.max(.25, Math.cos(la * D));
    for (var lo = -180; lo < 180; lo += step) {
      for (var k = 0; k < LAND.length; k++) {
        var L = LAND[k], dl = ((lo - L[1] + 540) % 360) - 180;
        if (Math.pow((la - L[0]) / L[2], 2) + Math.pow(dl / L[3], 2) <= 1) { dots.push([la * D, lo * D]); break; }
      }
    }
  }
  var plane = typeof Path2D !== 'undefined' ? new Path2D('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z') : null;

  function vec(lat, lon) { return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]; }
  function slerp(a, b, t) {
    var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], om = Math.acos(Math.min(1, Math.max(-1, dot))), s = Math.sin(om);
    var k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }
  var A = vec(FROM[0] * D, FROM[1] * D), B = vec(TO[0] * D, TO[1] * D);

  var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  function resize() {
    var r = box.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    R = W * 0.36; cx = W * 0.54; cy = H * 0.47;
  }
  // орфографическая проекция; поворот: долгота центра lam0, наклон phi0
  var lam0 = 75 * D, phi0 = 26 * D, sp = Math.sin(phi0), cp = Math.cos(phi0);
  function projV(v, alt) {
    // v — единичный вектор (x к 0°/0°, y к 90°E, z к полюсу)
    var cl = Math.cos(-lam0), sl = Math.sin(-lam0);
    var x = v[0] * cl - v[1] * sl, y = v[0] * sl + v[1] * cl, z = v[2];
    var X = y, Y = z * cp - x * sp, Z = x * cp + z * sp, s = R * (alt || 1);
    return [cx + X * s, cy - Y * s, Z];
  }
  function proj(lat, lon, alt) { return projV(vec(lat, lon), alt); }

  function frame(t) {
    lam0 = (72 + 16 * Math.sin(t * 0.00022)) * D;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // свечение
    var g = ctx.createRadialGradient(cx, cy, R * .6, cx, cy, R * 1.55);
    g.addColorStop(0, 'rgba(47,114,255,.42)'); g.addColorStop(1, 'rgba(47,114,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, 7); ctx.fill();
    // сфера
    var s = ctx.createRadialGradient(cx - R * .38, cy - R * .42, R * .05, cx, cy, R);
    s.addColorStop(0, '#8fdcff'); s.addColorStop(.22, '#2f72ff'); s.addColorStop(.7, '#0d1f55'); s.addColorStop(1, '#060d27');
    ctx.fillStyle = s; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    // сетка
    ctx.strokeStyle = 'rgba(127,211,255,.16)'; ctx.lineWidth = 1;
    var la, lo, p, started;
    for (la = -60; la <= 60; la += 30) { ctx.beginPath(); started = false; for (lo = -180; lo <= 180; lo += 4) { p = proj(la * D, lo * D); if (p[2] > 0) { started ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); started = true; } else started = false; } ctx.stroke(); }
    for (lo = -180; lo < 180; lo += 30) { ctx.beginPath(); started = false; for (la = -88; la <= 88; la += 4) { p = proj(la * D, lo * D); if (p[2] > 0) { started ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); started = true; } else started = false; } ctx.stroke(); }
    // материки
    var r0 = Math.max(1, R / 120);
    for (var i = 0; i < dots.length; i++) {
      p = proj(dots[i][0], dots[i][1]);
      if (p[2] <= 0.02) continue;
      ctx.fillStyle = 'rgba(160,226,255,' + (0.18 + 0.7 * p[2]).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p[0], p[1], r0 * (0.6 + 0.6 * p[2]), 0, 7); ctx.fill();
    }
    // обод
    ctx.strokeStyle = 'rgba(23,205,247,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();

    // маршрут по дуге большого круга, приподнятый над поверхностью
    var pts = [], N = 64;
    for (i = 0; i <= N; i++) { var u = i / N; pts.push(projV(slerp(A, B, u), 1 + 0.2 * Math.sin(Math.PI * u))); }
    ctx.save();
    ctx.strokeStyle = 'rgba(127,211,255,.95)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.setLineDash([2, 8]); ctx.lineDashOffset = reduce ? 0 : -t * 0.02;
    ctx.shadowColor = 'rgba(23,205,247,.8)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (i = 1; i <= N; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    ctx.restore();

    // точки отправления и прибытия
    var pf = proj(FROM[0] * D, FROM[1] * D), pt = proj(TO[0] * D, TO[1] * D);
    [pf, pt].forEach(function (q, j) {
      var ph = reduce ? 0.4 : ((t / 1600 + j * .5) % 1);
      ctx.strokeStyle = 'rgba(127,211,255,' + (0.9 * (1 - ph)).toFixed(3) + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(q[0], q[1], 5 + ph * 14, 0, 7); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#17cdf7'; ctx.beginPath(); ctx.arc(q[0], q[1], 2.4, 0, 7); ctx.fill();
    });
    if (lblFrom) lblFrom.style.transform = 'translate(' + (pf[0] - 12).toFixed(1) + 'px,' + (pf[1] + 12).toFixed(1) + 'px) translateX(-100%)';
    if (lblTo) lblTo.style.transform = 'translate(' + (pt[0] - 10).toFixed(1) + 'px,' + (pt[1] - 14).toFixed(1) + 'px) translate(-100%,-100%)';

    // самолёт
    var prog = reduce ? 0.55 : ((t / 9000) % 1);
    var e = prog < .5 ? 2 * prog * prog : 1 - Math.pow(-2 * prog + 2, 2) / 2;
    var fi = e * N, i0 = Math.min(N - 1, Math.floor(fi)), fr = fi - i0;
    var px = pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * fr, py = pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * fr;
    var ang = Math.atan2(pts[i0 + 1][1] - pts[i0][1], pts[i0 + 1][0] - pts[i0][0]);
    if (plane) {
      var sc = Math.max(.85, W / 400) * 1.05;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang + Math.PI / 4); ctx.scale(sc, sc); ctx.translate(-12, -12);
      ctx.shadowColor = 'rgba(127,211,255,.9)'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff'; ctx.fill(plane);
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(47,114,255,.9)'; ctx.lineWidth = 1; ctx.stroke(plane);
      ctx.restore();
    }
    if (bar) bar.style.width = Math.round(e * 100) + '%';
    if (pct) pct.textContent = Math.round(e * 100) + '%';
  }

  var raf = 0, visible = true;
  function loop(t) { frame(t); raf = (visible && !reduce) ? requestAnimationFrame(loop) : 0; }
  function start() { if (!raf) raf = requestAnimationFrame(loop); }
  resize(); frame(0);
  if (!reduce) start();
  window.addEventListener('resize', function () { resize(); frame(performance.now()); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; if (visible && !reduce) start(); }).observe(box);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible && !reduce) start(); });
  window.OnionGlobe = { redraw: function () { resize(); frame(performance.now()); } };
})();

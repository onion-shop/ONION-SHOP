/* Onion Shop · QR-кодер (байтовый режим, уровень коррекции M, версии 1–10).
   Нужен, чтобы показать QR для подключения приложения-аутентификатора без внешних библиотек. */
(function (root) {
  'use strict';
  // [ec-кодов на блок, [число блоков, данных в блоке], ...] для уровня M
  var BLOCKS = [null,
    [10, [1, 16]], [16, [1, 28]], [26, [1, 44]], [18, [2, 32]], [24, [2, 43]],
    [16, [4, 27]], [18, [4, 31]], [22, [2, 38], [2, 39]], [22, [3, 36], [2, 37]], [26, [4, 43], [1, 44]]];
  var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  var EXP = new Array(512), LOG = new Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function gmul(a, b) { return (a && b) ? EXP[LOG[a] + LOG[b]] : 0; }
  function rsGen(n) { var p = [1]; for (var i = 0; i < n; i++) { var r = new Array(p.length + 1).fill(0); for (var j = 0; j < p.length; j++) { r[j] ^= p[j]; r[j + 1] ^= gmul(p[j], EXP[i]); } p = r; } return p; }
  function rsRem(data, n) { var g = rsGen(n), res = new Array(n).fill(0); for (var k = 0; k < data.length; k++) { var f = data[k] ^ res.shift(); res.push(0); for (var i = 0; i < n; i++) res[i] ^= gmul(g[i + 1], f); } return res; }
  function bchDigit(d) { var n = 0; while (d) { n++; d >>>= 1; } return n; }
  function bch(data, g, shift) { var d = data << shift; while (bchDigit(d) - bchDigit(g) >= 0) d ^= g << (bchDigit(d) - bchDigit(g)); return (data << shift) | d; }
  var MASKS = [
    function (i, j) { return (i + j) % 2 === 0; }, function (i) { return i % 2 === 0; },
    function (i, j) { return j % 3 === 0; }, function (i, j) { return (i + j) % 3 === 0; },
    function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; },
    function (i, j) { return (i * j) % 2 + (i * j) % 3 === 0; },
    function (i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 === 0; },
    function (i, j) { return ((i * j) % 3 + (i + j) % 2) % 2 === 0; }];

  function utf8(s) { if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(s)); return unescape(encodeURIComponent(s)).split('').map(function (c) { return c.charCodeAt(0); }); }

  function encode(text) {
    var bytes = utf8(text), ver, total;
    for (ver = 1; ver <= 10; ver++) {
      var b = BLOCKS[ver]; total = 0; for (var k = 1; k < b.length; k++) total += b[k][0] * b[k][1];
      if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= total * 8) break;
    }
    if (ver > 10) throw new Error('QR: слишком длинный текст');
    // поток битов
    var bits = [];
    function put(v, n) { for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); }
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(function (x) { put(x, 8); });
    if (bits.length + 4 <= total * 8) put(0, 4);
    while (bits.length % 8) bits.push(0);
    var data = []; for (var i = 0; i < bits.length; i += 8) { var v = 0; for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; data.push(v); }
    for (var pad = 0; data.length < total; pad++) data.push(pad % 2 ? 0x11 : 0xEC);
    // блоки и коррекция ошибок
    var spec = BLOCKS[ver], ecn = spec[0], dBlocks = [], eBlocks = [], off = 0, maxD = 0;
    for (k = 1; k < spec.length; k++) for (var c = 0; c < spec[k][0]; c++) {
      var blk = data.slice(off, off + spec[k][1]); off += spec[k][1];
      dBlocks.push(blk); eBlocks.push(rsRem(blk, ecn)); maxD = Math.max(maxD, blk.length);
    }
    var cw = [];
    for (i = 0; i < maxD; i++) dBlocks.forEach(function (bl) { if (i < bl.length) cw.push(bl[i]); });
    for (i = 0; i < ecn; i++) eBlocks.forEach(function (bl) { cw.push(bl[i]); });

    var n = ver * 4 + 17, best = null, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      var mod = build(n, ver, cw, m), sc = penalty(mod, n);
      if (sc < bestScore) { bestScore = sc; best = mod; }
    }
    return { size: n, modules: best, version: ver };
  }

  function build(n, ver, cw, mask) {
    var M = []; for (var r = 0; r < n; r++) M.push(new Array(n).fill(null));
    function probe(row, col) {
      for (var r = -1; r <= 7; r++) { if (row + r < 0 || row + r >= n) continue;
        for (var c = -1; c <= 7; c++) { if (col + c < 0 || col + c >= n) continue;
          M[row + r][col + c] = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4); } }
    }
    probe(0, 0); probe(n - 7, 0); probe(0, n - 7);
    var pos = ALIGN[ver];
    for (var a = 0; a < pos.length; a++) for (var b = 0; b < pos.length; b++) {
      var row = pos[a], col = pos[b]; if (M[row][col] !== null) continue;
      for (r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++) M[row + r][col + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
    }
    for (r = 8; r < n - 8; r++) { if (M[r][6] === null) M[r][6] = r % 2 === 0; if (M[6][r] === null) M[6][r] = r % 2 === 0; }
    // информация о формате (уровень M = 0)
    var fb = bch((0 << 3) | mask, 0x537, 10) ^ 0x5412;
    for (var i = 0; i < 15; i++) {
      var on = ((fb >> i) & 1) === 1;
      if (i < 6) M[i][8] = on; else if (i < 8) M[i + 1][8] = on; else M[n - 15 + i][8] = on;
      if (i < 8) M[8][n - i - 1] = on; else if (i < 9) M[8][15 - i] = on; else M[8][14 - i] = on;
    }
    M[n - 8][8] = true;
    if (ver >= 7) {
      var vb = bch(ver, 0x1F25, 12);
      for (i = 0; i < 18; i++) { var o = ((vb >> i) & 1) === 1; M[Math.floor(i / 3)][i % 3 + n - 11] = o; M[i % 3 + n - 11][Math.floor(i / 3)] = o; }
    }
    // данные
    var inc = -1, rr = n - 1, bit = 7, byte = 0, fn = MASKS[mask];
    for (var col2 = n - 1; col2 > 0; col2 -= 2) {
      if (col2 === 6) col2--;
      for (;;) {
        for (var cc = 0; cc < 2; cc++) {
          if (M[rr][col2 - cc] === null) {
            var dark = byte < cw.length && ((cw[byte] >>> bit) & 1) === 1;
            if (fn(rr, col2 - cc)) dark = !dark;
            M[rr][col2 - cc] = dark;
            if (--bit < 0) { byte++; bit = 7; }
          }
        }
        rr += inc;
        if (rr < 0 || rr >= n) { rr -= inc; inc = -inc; break; }
      }
    }
    return M;
  }

  function penalty(M, n) {
    var s = 0, r, c, run, dark = 0;
    for (r = 0; r < n; r++) for (var dir = 0; dir < 2; dir++) {
      run = 1;
      for (c = 1; c < n; c++) {
        var a = dir ? M[c][r] : M[r][c], b = dir ? M[c - 1][r] : M[r][c - 1];
        if (a === b) { run++; if (c === n - 1 && run >= 5) s += run - 2; }
        else { if (run >= 5) s += run - 2; run = 1; }
      }
    }
    for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) { var v = M[r][c]; if (v === M[r + 1][c] && v === M[r][c + 1] && v === M[r + 1][c + 1]) s += 3; }
    var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (r = 0; r < n; r++) for (c = 0; c <= n - 11; c++) {
      var h1 = true, h2 = true, v1 = true, v2 = true;
      for (var k = 0; k < 11; k++) {
        var hv = M[r][c + k] ? 1 : 0, vv = M[c + k][r] ? 1 : 0;
        if (hv !== P1[k]) h1 = false; if (hv !== P2[k]) h2 = false; if (vv !== P1[k]) v1 = false; if (vv !== P2[k]) v2 = false;
      }
      s += 40 * ((h1 ? 1 : 0) + (h2 ? 1 : 0) + (v1 ? 1 : 0) + (v2 ? 1 : 0));
    }
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (M[r][c]) dark++;
    s += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
    return s;
  }

  function toSvg(text, opts) {
    opts = opts || {};
    var q = encode(text), n = q.size, pad = 4, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.modules[r][c]) d += 'M' + (c + pad) + ' ' + (r + pad) + 'h1v1h-1z';
    var S = n + pad * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + S + ' ' + S + '" shape-rendering="crispEdges" role="img" aria-label="' + (opts.label || 'QR-код') + '">' +
      '<rect width="' + S + '" height="' + S + '" fill="' + (opts.bg || '#fff') + '"/><path d="' + d + '" fill="' + (opts.fg || '#03112c') + '"/></svg>';
  }

  root.OnionQR = { encode: encode, toSvg: toSvg };
})(typeof window !== 'undefined' ? window : globalThis);

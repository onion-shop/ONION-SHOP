/* Onion Shop · безопасность: хеш паролей (PBKDF2-SHA256), одноразовые коды 2FA (TOTP, RFC 6238), резервные коды. */
(function (root) {
  'use strict';
  var C = root.crypto, S = C && C.subtle;
  var enc = function (s) { return new TextEncoder().encode(s); };
  var hex = function (buf) { return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); };
  var unhex = function (h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; };
  function rand(n) { var a = new Uint8Array(n); C.getRandomValues(a); return a; }
  function ready() { return !!S; }

  var ITER = 150000;
  async function hashPassword(password, saltHex, iter) {
    var salt = saltHex ? unhex(saltHex) : rand(16);
    iter = iter || ITER;
    var key = await S.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
    var bits = await S.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter }, key, 256);
    return { hash: hex(bits), salt: hex(salt), iter: iter };
  }
  function safeEqual(a, b) { if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
  async function verifyPassword(password, rec) { var h = await hashPassword(password, rec.salt, rec.iter); return safeEqual(h.hash, rec.hash); }
  async function sha256(s) { return hex(await S.digest('SHA-256', enc(s))); }

  var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function b32encode(bytes) { var bits = 0, val = 0, out = ''; for (var i = 0; i < bytes.length; i++) { val = (val << 8) | bytes[i]; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out; }
  function b32decode(s) { s = s.toUpperCase().replace(/[^A-Z2-7]/g, ''); var bits = 0, val = 0, out = []; for (var i = 0; i < s.length; i++) { val = (val << 5) | B32.indexOf(s[i]); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); }
  function newSecret() { return b32encode(rand(20)); }

  async function hotp(keyBytes, counter, digits) {
    var msg = new Uint8Array(8), c = counter;
    for (var i = 7; i >= 0; i--) { msg[i] = c & 255; c = Math.floor(c / 256); }
    var key = await S.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    var h = new Uint8Array(await S.sign('HMAC', key, msg));
    var o = h[h.length - 1] & 15;
    var code = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
    return String(code % Math.pow(10, digits)).padStart(digits, '0');
  }
  async function totp(secretB32, timeSec, digits, period) {
    period = period || 30; digits = digits || 6;
    var t = Math.floor((timeSec == null ? Date.now() / 1000 : timeSec) / period);
    return hotp(b32decode(secretB32), t, digits);
  }
  // Проверка с допуском ±1 шаг (30 секунд) на расхождение часов
  async function verifyTotp(secretB32, code, timeSec) {
    code = String(code || '').replace(/\D/g, '');
    if (code.length !== 6) return false;
    var now = timeSec == null ? Date.now() / 1000 : timeSec;
    for (var w = -1; w <= 1; w++) if (await totp(secretB32, now + w * 30) === code) return true;
    return false;
  }
  function otpauthUri(secret, account, issuer) {
    return 'otpauth://totp/' + encodeURIComponent(issuer + ':' + account) + '?secret=' + secret + '&issuer=' + encodeURIComponent(issuer) + '&digits=6&period=30';
  }
  function backupCodes(n) {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = [];
    for (var k = 0; k < (n || 8); k++) { var b = rand(8), s = ''; for (var i = 0; i < 8; i++) { s += abc[b[i] % abc.length]; if (i === 3) s += '-'; } out.push(s); }
    return out;
  }
  function token(n) { return hex(rand(n || 16)); }

  root.OnionSec = { ready: ready, hashPassword: hashPassword, verifyPassword: verifyPassword, sha256: sha256, newSecret: newSecret,
    b32encode: b32encode, b32decode: b32decode, totp: totp, verifyTotp: verifyTotp, otpauthUri: otpauthUri, backupCodes: backupCodes, token: token, rand: rand };
})(typeof window !== 'undefined' ? window : globalThis);

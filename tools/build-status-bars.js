#!/usr/bin/env node
'use strict';
// Builds the 16 status bars of the tablet (700x34 PNG, icons sbar00..sbar15) from the two original bars in tools/fixtures/status-bar:
// bit 3 = 5G (the original 5G bar), bit 2 = USB (CARLS radio connected), bits 0-1 = wifi level 0..3 (0 nothing, 1-3 waves).
// Icons are drawn here (white, anti-aliased) over the original bar; the result goes into mission-src/icons/01-interface-icons.json.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = path.resolve(__dirname, '..');
const W = 700, H = 34;

function decode(file) {
  const b = fs.readFileSync(file);
  let p = 8; const idat = [];
  while (p < b.length) { const l = b.readUInt32BE(p); const t = b.toString('latin1', p + 4, p + 8); if (t === 'IDAT') idat.push(b.subarray(p + 8, p + 8 + l)); p += 12 + l; }
  const raw = zlib.inflateSync(Buffer.concat(idat)); const bpp = 4, stride = W * bpp; const out = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, up = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return out;
}
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function encode(pix) {
  const stride = W * 4; const raw = Buffer.alloc(H * (stride + 1));
  for (let y = 0; y < H; y++) { raw[y * (stride + 1)] = 0; pix.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// shapes: function (x, y) -> inside, sampled 4x4 per pixel
const disc = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const seg = (x0, y0, x1, y1, w) => (x, y) => { const dx = x1 - x0, dy = y1 - y0; const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy))); return (x - x0 - t * dx) ** 2 + (y - y0 - t * dy) ** 2 <= (w / 2) ** 2; };
const tri = (ax, ay, bx, by, cx, cy) => (x, y) => { const s = (px, py, qx, qy) => (x - qx) * (py - qy) - (px - qx) * (y - qy); const d1 = s(ax, ay, bx, by), d2 = s(bx, by, cx, cy), d3 = s(cx, cy, ax, ay); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
const arc = (cx, cy, r, w) => (x, y) => { const d = Math.hypot(x - cx, y - cy); if (Math.abs(d - r) > w / 2) return false; const a = Math.atan2(x - cx, cy - y); return Math.abs(a) <= 0.82; };
function wifiShapes(level, cx, base) { const s = [disc(cx, base, 1.9)]; for (let i = 1; i <= level; i++) s.push(arc(cx, base, 3.2 + i * 3.7, 1.9)); return s; }
// the USB trident drawn upright in local coordinates (tip up), then turned by 90 degrees (tip to the right) and scaled to sit in the blue part of the bar
function usbShapes(cx) {
  const lu = 0, s = 0.8, cy = 11.5; // local u offset, scale, centre line in the blue part (y 1..22)
  const local = [seg(lu, 6, lu, 26, 2.4), tri(lu - 3.4, 8.8, lu + 3.4, 8.8, lu, 2.5), disc(lu, 27, 3),
    seg(lu, 20, lu - 6, 15.5, 2), seg(lu - 6, 15.5, lu - 6, 11, 2), rect(lu - 8.2, 7.8, lu - 3.8, 11.6),
    seg(lu, 16, lu + 6, 12.5, 2), seg(lu + 6, 12.5, lu + 6, 10, 2), disc(lu + 6, 8.3, 2.6)];
  // device (x, y) -> local (u, v): tip (v = 2.5) at the right, base (v = 27) at the left
  return local.map((f) => (x, y) => f((y - cy) / s, 16 - (x - cx) / s));
}
function paint(pix, shapes) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let hit = 0; for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) { const px = x + (sx + 0.5) / 4, py = y + (sy + 0.5) / 4; if (shapes.some((f) => f(px, py))) hit++; }
    if (!hit) continue; const a = hit / 16, o = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) pix[o + k] = Math.round(pix[o + k] * (1 - a) + 255 * a);
    pix[o + 3] = Math.max(pix[o + 3], Math.round(255 * a));
  }
}
const fix = path.join(__dirname, 'fixtures', 'status-bar');
const base = [decode(path.join(fix, 'homebar.png')), decode(path.join(fix, 'homebar5g.png'))];
const bars = {};
for (let id = 0; id < 16; id++) {
  const g5 = (id >> 3) & 1, usb = (id >> 2) & 1, wifi = id & 3; const pix = Buffer.from(base[g5]); const shapes = [];
  const ux = g5 ? 578 : 636, wx = g5 ? 604 : 664;
  if (usb) shapes.push(...usbShapes(ux));
  if (wifi) shapes.push(...wifiShapes(wifi, wx, 16.3));
  paint(pix, shapes); bars['sbar' + String(id).padStart(2, '0')] = 'data:image/png;base64,' + encode(pix).toString('base64');
}
if (process.argv[2] === '--preview') { const dir = process.argv[3]; for (const [k, v] of Object.entries(bars)) fs.writeFileSync(path.join(dir, k + '.png'), Buffer.from(v.split(',')[1], 'base64')); process.exit(0); }
const file = path.join(root, 'mission-src', 'icons', '01-interface-icons.json');
const icons = JSON.parse(fs.readFileSync(file, 'utf8')); const out = {};
for (const [k, v] of Object.entries(icons)) { if (k === 'homebar' || k === 'homebar5g') continue; if (/^sbar\d\d$/.test(k)) continue; out[k] = v; }
Object.assign(out, bars);
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log('status bars written:', Object.keys(bars).length);

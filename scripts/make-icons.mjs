/**
 * Erzeugt die App-Icons (PNG) ohne externe Abhaengigkeiten.
 * Aufruf: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/* ---------- PNG-Encoder ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // Filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- Zeichnen (mit Supersampling) ---------- */

const SS = 4;

function render(size, { rounded = true, safe = false } = {}) {
  const S = size * SS;
  const buf = new Float32Array(S * S * 4);

  const top = [23, 207, 146];
  const bottom = [8, 151, 106];

  // Hintergrund
  for (let y = 0; y < S; y++) {
    const t = y / (S - 1);
    const r = top[0] + (bottom[0] - top[0]) * t;
    const g = top[1] + (bottom[1] - top[1]) * t;
    const b = top[2] + (bottom[2] - top[2]) * t;
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }

  // Abgerundete Ecken (nicht bei maskable)
  if (rounded) {
    const radius = S * 0.235;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const cx = Math.min(x, S - 1 - x);
        const cy = Math.min(y, S - 1 - y);
        if (cx < radius && cy < radius) {
          const dx = radius - cx;
          const dy = radius - cy;
          if (Math.hypot(dx, dy) > radius) {
            const i = (y * S + x) * 4;
            buf[i + 3] = 0;
          }
        }
      }
    }
  }

  // Weisses "K" als Linien
  const scale = safe ? 0.66 : 0.78; // maskable: mehr Innenabstand
  const w = S * 0.115 * (scale / 0.78);
  const cx0 = S * 0.5 - S * 0.26 * (scale / 0.78);
  const top1 = S * 0.5 - S * 0.30 * (scale / 0.78);
  const bottom1 = S * 0.5 + S * 0.30 * (scale / 0.78);
  const midY = S * 0.5;
  const right = cx0 + S * 0.30 * (scale / 0.78);

  const drawLine = (x1, y1, x2, y2, width) => {
    const half = width / 2;
    const minX = Math.floor(Math.min(x1, x2) - half - 2);
    const maxX = Math.ceil(Math.max(x1, x2) + half + 2);
    const minY = Math.floor(Math.min(y1, y2) - half - 2);
    const maxY = Math.ceil(Math.max(y1, y2) + half + 2);
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy || 1;

    for (let y = Math.max(0, minY); y < Math.min(S, maxY); y++) {
      for (let x = Math.max(0, minX); x < Math.min(S, maxX); x++) {
        const px = x + 0.5 - x1;
        const py = y + 0.5 - y1;
        const t = Math.max(0, Math.min(1, (px * vx + py * vy) / len2));
        const dx = px - vx * t;
        const dy = py - vy * t;
        const dist = Math.hypot(dx, dy);
        if (dist <= half) {
          const i = (y * S + x) * 4;
          const a = 1;
          buf[i] = buf[i] * (1 - a) + 255 * a;
          buf[i + 1] = buf[i + 1] * (1 - a) + 255 * a;
          buf[i + 2] = buf[i + 2] * (1 - a) + 255 * a;
        }
      }
    }
  };

  drawLine(cx0, top1, cx0, bottom1, w);
  drawLine(cx0 + w * 0.15, midY, right, top1 + S * 0.02, w);
  drawLine(cx0 + w * 0.15, midY, right, bottom1 - S * 0.02, w);

  // Auf Zielgrösse mitteln
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * S + (x * SS + sx)) * 4;
          const alpha = buf[i + 3] / 255;
          r += buf[i] * alpha;
          g += buf[i + 1] * alpha;
          b += buf[i + 2] * alpha;
          a += alpha;
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      const alphaAvg = a / n;
      out[o] = a ? Math.round(r / a) : 0;
      out[o + 1] = a ? Math.round(g / a) : 0;
      out[o + 2] = a ? Math.round(b / a) : 0;
      out[o + 3] = Math.round(alphaAvg * 255);
    }
  }
  return out;
}

mkdirSync(OUT, { recursive: true });

const jobs = [
  { file: 'icon-180.png', size: 180, opts: { rounded: true } },
  { file: 'icon-192.png', size: 192, opts: { rounded: true } },
  { file: 'icon-512.png', size: 512, opts: { rounded: true } },
  { file: 'icon-maskable-512.png', size: 512, opts: { rounded: false, safe: true } },
];

for (const job of jobs) {
  const rgba = render(job.size, job.opts);
  writeFileSync(path.join(OUT, job.file), encodePng(job.size, job.size, rgba));
  console.log(`✓ ${job.file}`);
}

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal pure Node.js PNG generator without external dependencies
function createPNG(width, height, colorFn) {
  // RGBA buffer: each row has 1 filter byte (0 = None) followed by width * 4 bytes
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = colorFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Compress IDAT data
  const compressed = zlib.deflateSync(rawData);

  // Helper to create chunk
  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    // CRC32 of type + data
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Standard CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Color generator with Mario Cat + Question block theme
function marioCatIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background: dark navy (#0f172a) with golden circular border
  const maxR = w * (isMaskable ? 0.48 : 0.44);

  // Red Mario Cap / Ears
  if (dist < maxR * 0.75) {
    // Cap
    if (dy < -maxR * 0.15 && dy > -maxR * 0.65 && Math.abs(dx) < maxR * 0.55) {
      // Red Cap
      if (Math.sqrt(dx * dx + (dy + maxR * 0.35) * (dy + maxR * 0.35)) < maxR * 0.18) {
        return [255, 255, 255, 255]; // White M badge
      }
      return [220, 38, 38, 255]; // Red
    }
    // Cat Head
    if (dist < maxR * 0.55 && dy < maxR * 0.35) {
      // White muzzle
      if (dy > -maxR * 0.05 && dist < maxR * 0.3) {
        return [255, 255, 255, 255];
      }
      // Eyes
      if (dy > -maxR * 0.25 && dy < -maxR * 0.08 && (Math.abs(dx - maxR * 0.2) < maxR * 0.06 || Math.abs(dx + maxR * 0.2) < maxR * 0.06)) {
        return [0, 0, 0, 255];
      }
      return [249, 115, 22, 255]; // Orange fur
    }
    // Overalls
    if (dy >= maxR * 0.35 && dy < maxR * 0.8 && Math.abs(dx) < maxR * 0.5) {
      return [37, 99, 235, 255]; // Blue
    }
  }

  // Golden border ring
  if (dist >= maxR - 6 && dist <= maxR) {
    return [250, 204, 21, 255]; // Gold
  }

  // Dark slate background
  return [15, 23, 42, 255];
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPNG(192, 192, (x, y, w, h) => marioCatIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPNG(512, 512, (x, y, w, h) => marioCatIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, (x, y, w, h) => marioCatIcon(x, y, w, h, true)));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPNG(180, 180, (x, y, w, h) => marioCatIcon(x, y, w, h, false)));

console.log('Successfully generated all PWA PNG icons!');

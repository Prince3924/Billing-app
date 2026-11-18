import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, isMaskable = false) {
  // Simple PNG generator using pure node zlib
  const buffer = Buffer.alloc(width * height * 4);

  // Background color: dark slate #0f172a
  const bgR = 15, bgG = 23, bgB = 42;
  // Accent color: amber #f59e0b
  const goldR = 245, goldG = 158, goldB = 11;
  // Yellow bolt: #fef08a
  const boltR = 254, boltG = 240, boltB = 138;

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Default dark background
      buffer[idx] = bgR;
      buffer[idx + 1] = bgG;
      buffer[idx + 2] = bgB;
      buffer[idx + 3] = 255;

      // Draw subtle circular border
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!isMaskable && dist > radius && dist <= radius + 3) {
        buffer[idx] = goldR;
        buffer[idx + 1] = goldG;
        buffer[idx + 2] = goldB;
        buffer[idx + 3] = 180;
      }

      // Draw lightning bolt polygon approximation in the center
      // Center scale
      const nx = (x - cx) / (width * 0.5); // -1 to 1
      const ny = (y - cy) / (height * 0.5); // -1 to 1

      // Lightning bolt shape
      const inTopPart = ny >= -0.7 && ny <= 0.05 && nx >= (-0.2 - ny * 0.35) && nx <= (0.35 - ny * 0.2);
      const inBottomPart = ny >= -0.05 && ny <= 0.7 && nx >= (-0.35 - ny * 0.2) && nx <= (0.2 - ny * 0.35);

      if (inTopPart || inBottomPart) {
        buffer[idx] = (inTopPart && inBottomPart) ? boltR : goldR;
        buffer[idx + 1] = (inTopPart && inBottomPart) ? boltR : goldG;
        buffer[idx + 2] = (inTopPart && inBottomPart) ? 200 : goldB;
        buffer[idx + 3] = 255;
      }
    }
  }

  // PNG filter type 0 (None) per scanline
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 4)] = 0; // Filter byte 0
    buffer.copy(scanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(scanlines);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([Buffer.from(type), data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 implementation for PNG
function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = c ^ buf[n];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write PWA Icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, false));

console.log('✅ Generated 192, 512, maskable, apple-touch-icon in /public');

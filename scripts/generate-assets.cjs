const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePNG(width, height, getPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const idx = 1 + x * 4;
      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }
    rawRows.push(row);
  }
  
  const uncompressed = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(uncompressed, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function drawIconPixel(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  
  // Background: Orange #f97316 (249, 115, 22)
  if (nx >= 0.2 && nx <= 0.8 && ny >= 0.2 && ny <= 0.8) {
    // Folded corner top right
    if (nx > 0.64 && ny < 0.36 && (nx - 0.64) + (0.36 - ny) > 0.14) {
      return [255, 237, 213, 255]; // Peach fold
    }
    // Letter F inside page
    if ((nx >= 0.36 && nx <= 0.58 && ny >= 0.36 && ny <= 0.42) || // Top bar
        (nx >= 0.36 && nx <= 0.52 && ny >= 0.48 && ny <= 0.54) || // Middle bar
        (nx >= 0.36 && nx <= 0.42 && ny >= 0.36 && ny <= 0.68)) { // Vertical bar
      return [249, 115, 22, 255];
    }
    return [255, 255, 255, 255];
  }
  
  return [249, 115, 22, 255];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Building pristine PWA PNG assets...');

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generatePNG(192, 192, drawIconPixel));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generatePNG(512, 512, drawIconPixel));

fs.writeFileSync(path.join(publicDir, 'screenshot-desktop.png'), generatePNG(1376, 768, (x, y, w, h) => {
  const nx = x / w;
  const ny = y / h;
  if (ny < 0.12) return [255, 255, 255, 255];
  if (nx >= 0.1 && nx <= 0.9 && ny >= 0.2 && ny <= 0.85) {
    return [255, 255, 255, 255];
  }
  return [248, 250, 252, 255];
}));

fs.writeFileSync(path.join(publicDir, 'screenshot-mobile.png'), generatePNG(896, 1200, (x, y, w, h) => {
  const nx = x / w;
  const ny = y / h;
  if (ny < 0.1) return [255, 255, 255, 255];
  if (nx >= 0.08 && nx <= 0.92 && ny >= 0.15 && ny <= 0.88) {
    return [255, 255, 255, 255];
  }
  return [248, 250, 252, 255];
}));

// Create .nojekyll in public directory
fs.writeFileSync(path.join(publicDir, '.nojekyll'), '');

console.log('PWA PNG assets & .nojekyll successfully generated!');

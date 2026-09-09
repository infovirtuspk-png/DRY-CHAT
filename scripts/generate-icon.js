const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a valid 256x256 PNG buffer using pure Node.js (with zlib)
function create256x256PngBuffer() {
  const width = 256;
  const height = 256;

  // Raw uncompressed RGBA pixel data
  // Each scanline starts with a filter byte (0 = None) followed by 256 * 4 bytes
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * scanlineLength;
    rawData[scanlineOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = scanlineOffset + 1 + x * 4;

      // Draw a sleek stylized circular blue badge with a 'D' shape
      const dx = x - 128;
      const dy = y - 128;
      const distSq = dx * dx + dy * dy;

      if (distSq <= 120 * 120) {
        // Deep Blue / Indigo Gradient
        const grad = y / 256;
        rawData[pixelOffset] = Math.floor(37 + (59 - 37) * grad);     // R: #2563EB to #3B82F6
        rawData[pixelOffset + 1] = Math.floor(99 + (130 - 99) * grad); // G
        rawData[pixelOffset + 2] = Math.floor(235 + (246 - 235) * grad); // B
        rawData[pixelOffset + 3] = 255; // Alpha

        // Stylized White 'D' in the center
        if (x >= 80 && x <= 176 && y >= 70 && y <= 186) {
          const inHole = (x >= 110 && x <= 146 && y >= 100 && y <= 156);
          const inArcHole = (x > 130 && Math.hypot(x - 130, y - 128) < 30);
          const inArc = (x > 130 && Math.hypot(x - 130, y - 128) <= 58);

          if ((x <= 130 || inArc) && !inHole && !inArcHole) {
            rawData[pixelOffset] = 255;
            rawData[pixelOffset + 1] = 255;
            rawData[pixelOffset + 2] = 255;
            rawData[pixelOffset + 3] = 255;
          }
        }
      } else {
        // Transparent outside circle
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  // Compress IDAT chunk using zlib deflate
  const compressed = zlib.deflateSync(rawData);

  // Helper to create PNG Chunk with CRC32
  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);

    // CRC32 calculation
    let crc = 0 ^ (-1);
    for (let i = 4; i < 8 + len; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    crc = (crc ^ (-1)) >>> 0;
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // 8 bits per channel
  ihdrData.writeUInt8(6, 9);  // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression method
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function generate256Ico() {
  const icoPath = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons', 'icon.ico');
  const pngPath = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons', 'icon.png');

  const pngBuffer = create256x256PngBuffer();
  fs.writeFileSync(pngPath, pngBuffer);

  // Standard Windows ICO header
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 Image

  // Directory Entry for 256x256 (width and height 0 means 256 in ICO spec)
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0);   // Width: 0 -> 256px
  dirEntry.writeUInt8(0, 1);   // Height: 0 -> 256px
  dirEntry.writeUInt8(0, 2);   // Colors: 0
  dirEntry.writeUInt8(0, 3);   // Reserved: 0
  dirEntry.writeUInt16LE(1, 4);  // Color planes: 1
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel: 32 (RGBA)
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // Size of PNG image
  dirEntry.writeUInt32LE(22, 12); // Offset to image data (6 + 16 = 22)

  const icoBuffer = Buffer.concat([icoHeader, dirEntry, pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);

  console.log(`Generated 256x256 icon.ico (${icoBuffer.length} bytes) and icon.png (${pngBuffer.length} bytes) successfully.`);
}

generate256Ico();

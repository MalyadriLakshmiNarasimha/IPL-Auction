import fs from 'fs';
import path from 'path';

// Valid 32x32 standard ICO header with minimal uncompressed BMP bitmap
function createMinimalIco(width: number, height: number, colorHex: string): Buffer {
  // ICO Header: 6 bytes
  // Reserved (2) = 0, Type (2) = 1 (ICO), Image count (2) = 1
  const header = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);

  // Bitmap Info Header (BITMAPINFOHEADER): 40 bytes
  // Width: width, Height: height * 2 (for XOR and AND masks), Planes: 1, BitCount: 32 (BGRA)
  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(40, 0); // biSize
  bih.writeInt32LE(width, 4); // biWidth
  bih.writeInt32LE(height * 2, 8); // biHeight (BMP icon height is doubled)
  bih.writeUInt16LE(1, 12); // biPlanes
  bih.writeUInt16LE(32, 14); // biBitCount (32 bits per pixel)
  bih.writeUInt32LE(0, 16); // biCompression (BI_RGB = 0)
  const pixelDataSize = width * height * 4;
  const maskDataSize = Math.ceil((width * height) / 8);
  bih.writeUInt32LE(pixelDataSize + maskDataSize, 20); // biSizeImage
  bih.writeInt32LE(0, 24); // biXPelsPerMeter
  bih.writeInt32LE(0, 28); // biYPelsPerMeter
  bih.writeUInt32LE(0, 32); // biClrUsed
  bih.writeUInt32LE(0, 36); // biClrImportant

  // Generate pixels (BGRA, bottom-up)
  const pixelData = Buffer.alloc(pixelDataSize);
  // Gold color: #DCC477 -> B: 0x77, G: 0xC4, R: 0xDC, A: 0xFF
  // Border: #08090B -> B: 0x0B, G: 0x09, R: 0x08, A: 0xFF
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const isCorner = (x === 0 || x === width - 1) && (y === 0 || y === height - 1);
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      const isGavel = (x >= 8 && x <= 23 && y >= 10 && y <= 22) || (x >= 14 && x <= 17 && y >= 4 && y <= 27);

      if (isCorner) {
        // Transparent corner
        pixelData[offset] = 0;
        pixelData[offset + 1] = 0;
        pixelData[offset + 2] = 0;
        pixelData[offset + 3] = 0;
      } else if (isGavel) {
        // Gold gavel mallet/handle
        pixelData[offset] = 0x05;     // B
        pixelData[offset + 1] = 0xCD; // G
        pixelData[offset + 2] = 0xF9; // R
        pixelData[offset + 3] = 0xFF; // A
      } else if (isBorder) {
        // Gold border
        pixelData[offset] = 0x77;
        pixelData[offset + 1] = 0xC4;
        pixelData[offset + 2] = 0xDC;
        pixelData[offset + 3] = 0xFF;
      } else {
        // Deep Charcoal background #08090B
        pixelData[offset] = 0x0B;
        pixelData[offset + 1] = 0x09;
        pixelData[offset + 2] = 0x08;
        pixelData[offset + 3] = 0xFF;
      }
    }
  }

  // 1-bit AND mask (transparency mask, all 0 = opaque except corners)
  const andMask = Buffer.alloc(maskDataSize, 0);

  const imageBuffer = Buffer.concat([bih, pixelData, andMask]);

  // Directory Entry: 16 bytes
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width === 256 ? 0 : width, 0);
  dirEntry.writeUInt8(height === 256 ? 0 : height, 1);
  dirEntry.writeUInt8(0, 2); // Color palette count (0 for 24/32-bit)
  dirEntry.writeUInt8(0, 3); // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(imageBuffer.length, 8); // Size of image data
  dirEntry.writeUInt32LE(header.length + 16, 12); // Offset of image data (6 + 16 = 22)

  return Buffer.concat([header, dirEntry, imageBuffer]);
}

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08090B"/>
      <stop offset="100%" stop-color="#14171F"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F9CD05"/>
      <stop offset="50%" stop-color="#DCC477"/>
      <stop offset="100%" stop-color="#9D7A2C"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#bg)"/>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="url(#gold)" stroke-width="2" stroke-opacity="0.5"/>
  <g transform="translate(14, 12)">
    <path d="M12 4 L24 16 L20 20 L8 8 Z" fill="url(#gold)"/>
    <path d="M14 14 L30 30 L27 33 L11 17 Z" fill="url(#gold)" opacity="0.9"/>
    <rect x="1" y="34" width="20" height="5" rx="1.5" fill="url(#gold)"/>
  </g>
</svg>`;

const icoBuffer = createMinimalIco(32, 32, '#F9CD05');

// Write to public/favicon.ico and src/app/favicon.ico
fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(process.cwd(), 'public', 'icon.svg'), svgContent);
fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'icon.svg'), svgContent);

console.log('Successfully generated branded favicon.ico and icon.svg for public/ and src/app/');


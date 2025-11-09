// BMP encoding functions

// Shared helper functions for color quantization and palette building

// Apply Floyd-Steinberg dithering for 4-bit aggressive mode
function applyDithering4Bit(data, width, height) {
  const ditheredData = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (ditheredData[i + 3] < 128) continue;

      const oldR = ditheredData[i];
      const oldG = ditheredData[i + 1];
      const oldB = ditheredData[i + 2];

      const quantize = (val) => Math.round((val / 255) * 3) * 85;
      const newR = Math.max(0, Math.min(255, quantize(oldR)));
      const newG = Math.max(0, Math.min(255, quantize(oldG)));
      const newB = Math.max(0, Math.min(255, quantize(oldB)));

      ditheredData[i] = newR;
      ditheredData[i + 1] = newG;
      ditheredData[i + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      const distributeError = (x1, y1, weight) => {
        if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < height) {
          const idx = (y1 * width + x1) * 4;
          if (ditheredData[idx + 3] >= 128) {
            ditheredData[idx] = Math.max(
              0,
              Math.min(255, ditheredData[idx] + errR * weight)
            );
            ditheredData[idx + 1] = Math.max(
              0,
              Math.min(255, ditheredData[idx + 1] + errG * weight)
            );
            ditheredData[idx + 2] = Math.max(
              0,
              Math.min(255, ditheredData[idx + 2] + errB * weight)
            );
          }
        }
      };

      distributeError(x + 1, y, 7 / 16);
      distributeError(x - 1, y + 1, 3 / 16);
      distributeError(x, y + 1, 5 / 16);
      distributeError(x + 1, y + 1, 1 / 16);
    }
  }

  return ditheredData;
}

// Build 8-bit palette and color matching function
function build8BitPalette(data) {
  const quantizeR = (r) => Math.floor((r * 6) / 256);
  const quantizeG = (g) => Math.floor((g * 7) / 256);
  const quantizeB = (b) => Math.floor((b * 6) / 256);

  const paletteMap = new Map();
  const colorArray = [];

  // Create a 6x7x6 color cube (252 colors)
  for (let rq = 0; rq < 6; rq++) {
    for (let gq = 0; gq < 7; gq++) {
      for (let bq = 0; bq < 6; bq++) {
        const r = Math.round((rq * 255) / 5);
        const g = Math.round((gq * 255) / 6);
        const b = Math.round((bq * 255) / 5);
        const colorKey = (rq << 16) | (gq << 8) | bq;
        paletteMap.set(colorKey, colorArray.length);
        colorArray.push({ r, g, b });
      }
    }
  }

  // Fill remaining slots (up to 256) with colors from the image
  if (colorArray.length < 256) {
    const colorCount = new Map();

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;

      const rq = quantizeR(data[i]);
      const gq = quantizeG(data[i + 1]);
      const bq = quantizeB(data[i + 2]);
      const colorKey = (rq << 16) | (gq << 8) | bq;

      if (!paletteMap.has(colorKey)) {
        colorCount.set(colorKey, (colorCount.get(colorKey) || 0) + 1);
      }
    }

    const sortedColors = Array.from(colorCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 256 - colorArray.length);

    for (const [colorKey] of sortedColors) {
      const rq = (colorKey >> 16) & 0xff;
      const gq = (colorKey >> 8) & 0xff;
      const bq = colorKey & 0xff;
      const r = Math.round((rq * 255) / 5);
      const g = Math.round((gq * 255) / 6);
      const b = Math.round((bq * 255) / 5);
      paletteMap.set(colorKey, colorArray.length);
      colorArray.push({ r, g, b });
    }
  }

  // Fill remaining slots with black
  while (colorArray.length < 256) {
    colorArray.push({ r: 0, g: 0, b: 0 });
  }

  // Find closest color function
  const findClosestColor = (r, g, b) => {
    const rq = quantizeR(r);
    const gq = quantizeG(g);
    const bq = quantizeB(b);
    const colorKey = (rq << 16) | (gq << 8) | bq;

    if (paletteMap.has(colorKey)) {
      return paletteMap.get(colorKey);
    }

    let minDist = Infinity;
    let bestIndex = 0;
    const searchRange = 1;
    for (let dr = -searchRange; dr <= searchRange; dr++) {
      for (let dg = -searchRange; dg <= searchRange; dg++) {
        for (let db = -searchRange; db <= searchRange; db++) {
          const nr = Math.max(0, Math.min(5, rq + dr));
          const ng = Math.max(0, Math.min(6, gq + dg));
          const nb = Math.max(0, Math.min(5, bq + db));
          const nKey = (nr << 16) | (ng << 8) | nb;

          if (paletteMap.has(nKey)) {
            const idx = paletteMap.get(nKey);
            const pr = colorArray[idx].r;
            const pg = colorArray[idx].g;
            const pb = colorArray[idx].b;
            const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;

            if (dist < minDist) {
              minDist = dist;
              bestIndex = idx;
            }
          }
        }
      }
    }

    if (minDist === Infinity) {
      for (let i = 0; i < colorArray.length; i++) {
        const pr = colorArray[i].r;
        const pg = colorArray[i].g;
        const pb = colorArray[i].b;
        const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;

        if (dist < minDist) {
          minDist = dist;
          bestIndex = i;
        }
      }
    }

    return bestIndex;
  };

  return { colorArray, findClosestColor };
}

// Build 4-bit palette and color matching function
function build4BitPalette(data) {
  const quantizeR = (r) => Math.floor((r * 4) / 256);
  const quantizeG = (g) => Math.floor((g * 4) / 256);
  const quantizeB = (b) => Math.floor((b * 4) / 256);

  const colorCount = new Map();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;

    const rq = quantizeR(data[i]);
    const gq = quantizeG(data[i + 1]);
    const bq = quantizeB(data[i + 2]);
    const colorKey = (rq << 8) | (gq << 4) | bq;

    colorCount.set(colorKey, (colorCount.get(colorKey) || 0) + 1);
  }

  const sortedColors = Array.from(colorCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16);

  const colorArray = [];
  const paletteMap = new Map();

  sortedColors.forEach(([colorKey]) => {
    const rq = (colorKey >> 8) & 0xf;
    const gq = (colorKey >> 4) & 0xf;
    const bq = colorKey & 0xf;
    const r = Math.round((rq * 255) / 3);
    const g = Math.round((gq * 255) / 3);
    const b = Math.round((bq * 255) / 3);

    paletteMap.set(colorKey, colorArray.length);
    colorArray.push({ r, g, b });
  });

  while (colorArray.length < 16) {
    const idx = colorArray.length;
    const rq = idx % 4;
    const gq = Math.floor(idx / 4) % 4;
    const bq = Math.floor(idx / 16) % 4;
    const r = Math.round((rq * 255) / 3);
    const g = Math.round((gq * 255) / 3);
    const b = Math.round((bq * 255) / 3);
    colorArray.push({ r, g, b });
  }

  const findClosestColor = (r, g, b) => {
    const rq = quantizeR(r);
    const gq = quantizeG(g);
    const bq = quantizeB(b);
    const colorKey = (rq << 8) | (gq << 4) | bq;

    if (paletteMap.has(colorKey)) {
      return paletteMap.get(colorKey);
    }

    let minDist = Infinity;
    let bestIndex = 0;

    for (let i = 0; i < colorArray.length; i++) {
      const pr = colorArray[i].r;
      const pg = colorArray[i].g;
      const pb = colorArray[i].b;
      const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;

      if (dist < minDist) {
        minDist = dist;
        bestIndex = i;
      }
    }

    return bestIndex;
  };

  return { colorArray, findClosestColor };
}

// Convert ImageData to quantized ImageData using palette
function quantizeImageData(imageData, colorArray, findClosestColor) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const quantizedData = new ImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      if (data[i + 3] < 128) {
        quantizedData.data[i] = 0;
        quantizedData.data[i + 1] = 0;
        quantizedData.data[i + 2] = 0;
        quantizedData.data[i + 3] = data[i + 3];
      } else {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const colorIndex = findClosestColor(r, g, b);
        const color = colorArray[colorIndex];

        quantizedData.data[i] = color.r;
        quantizedData.data[i + 1] = color.g;
        quantizedData.data[i + 2] = color.b;
        quantizedData.data[i + 3] = data[i + 3];
      }
    }
  }

  return quantizedData;
}

// Export shared helpers for use in preview.js
export {
  build8BitPalette,
  build4BitPalette,
  quantizeImageData,
  applyDithering4Bit,
};

export function encodeBMP(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // BMP rows must be padded to multiples of 4 bytes
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize; // 54 = header size

  // Create buffer for BMP file
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BMP File Header (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true); // File size
  view.setUint32(6, 0, true); // Reserved
  view.setUint32(10, 54, true); // Pixel data offset

  // DIB Header - BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true); // DIB header size
  view.setInt32(18, width, true); // Width
  view.setInt32(22, -height, true); // Height (negative = top-down)
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 24, true); // Bits per pixel (24-bit)
  view.setUint32(30, 0, true); // Compression (0 = BI_RGB, no compression)
  view.setUint32(34, pixelArraySize, true); // Image size
  view.setInt32(38, 2835, true); // X pixels per meter (~72 DPI)
  view.setInt32(42, 2835, true); // Y pixels per meter (~72 DPI)
  view.setUint32(46, 0, true); // Colors in palette (0 = default)
  view.setUint32(50, 0, true); // Important colors (0 = all)

  // Pixel data (BGR format with row padding)
  let offset = 54;
  const padding = rowSize - width * 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // BMP uses BGR order instead of RGB
      view.setUint8(offset++, data[i + 2]); // Blue
      view.setUint8(offset++, data[i + 1]); // Green
      view.setUint8(offset++, data[i]); // Red
      // Alpha channel is ignored in 24-bit BMP
    }
    // Add row padding (each row must be multiple of 4 bytes)
    for (let p = 0; p < padding; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: "image/bmp" });
}

export function encodeBMP8Bit(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Use shared palette building function
  const { colorArray, findClosestColor } = build8BitPalette(data);

  // Create pixel index array
  const pixelIndices = new Uint8Array(width * height);

  // Assign pixel indices
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) {
        pixelIndices[y * width + x] = 0; // Transparent -> use first palette entry
      } else {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        pixelIndices[y * width + x] = findClosestColor(r, g, b);
      }
    }
  }

  // Calculate sizes
  const paletteSize = 256 * 4; // 256 colors * 4 bytes each (BGR + reserved)
  const rowSize = Math.floor((8 * width + 31) / 32) * 4; // 8-bit, padded to 4 bytes
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + paletteSize + pixelArraySize; // Header + palette + pixels

  // Create buffer
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BMP File Header (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true); // File size
  view.setUint32(6, 0, true); // Reserved
  view.setUint32(10, 54 + paletteSize, true); // Pixel data offset (after header + palette)

  // DIB Header - BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true); // DIB header size
  view.setInt32(18, width, true); // Width
  view.setInt32(22, -height, true); // Height (negative = top-down)
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 8, true); // Bits per pixel (8-bit)
  view.setUint32(30, 0, true); // Compression (0 = BI_RGB)
  view.setUint32(34, pixelArraySize, true); // Image size
  view.setInt32(38, 2835, true); // X pixels per meter
  view.setInt32(42, 2835, true); // Y pixels per meter
  view.setUint32(46, 256, true); // Colors in palette
  view.setUint32(50, 256, true); // Important colors

  // Color palette (256 entries, BGR format + reserved byte)
  let offset = 54;
  for (let i = 0; i < 256; i++) {
    const color = colorArray[i] || { r: 0, g: 0, b: 0 };
    view.setUint8(offset++, color.b); // Blue
    view.setUint8(offset++, color.g); // Green
    view.setUint8(offset++, color.r); // Red
    view.setUint8(offset++, 0); // Reserved
  }

  // Pixel data (8-bit indices with row padding)
  const padding = rowSize - width;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      view.setUint8(offset++, pixelIndices[y * width + x]);
    }
    // Add row padding
    for (let p = 0; p < padding; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: "image/bmp" });
}

export function encodeBMP4Bit(imageData, aggressive = false) {
  const width = imageData.width;
  const height = imageData.height;
  let processedData = imageData.data;

  // Apply dithering if aggressive
  if (aggressive) {
    processedData = applyDithering4Bit(processedData, width, height);
    // Create new ImageData with dithered data
    const tempImageData = new ImageData(width, height);
    tempImageData.data.set(processedData);
    return encodeBMP4BitFromData(tempImageData);
  } else {
    return encodeBMP4BitFromData(imageData);
  }
}

function encodeBMP4BitFromData(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Use shared palette building function
  const { colorArray, findClosestColor } = build4BitPalette(data);

  // Create pixel index array
  const pixelIndices = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) {
        pixelIndices[y * width + x] = 0;
      } else {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        pixelIndices[y * width + x] = findClosestColor(r, g, b);
      }
    }
  }

  // Calculate sizes for 4-bit BMP
  const paletteSize = 16 * 4; // 16 colors * 4 bytes each
  const rowSize = Math.floor((4 * width + 31) / 32) * 4; // 4-bit, padded to 4 bytes
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + paletteSize + pixelArraySize;

  // Create buffer
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BMP File Header
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54 + paletteSize, true);

  // DIB Header
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 4, true); // 4 bits per pixel
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 16, true); // Colors in palette
  view.setUint32(50, 16, true);

  // Color palette (16 entries)
  let offset = 54;
  for (let i = 0; i < 16; i++) {
    const color = colorArray[i] || { r: 0, g: 0, b: 0 };
    view.setUint8(offset++, color.b);
    view.setUint8(offset++, color.g);
    view.setUint8(offset++, color.r);
    view.setUint8(offset++, 0); // Reserved
  }

  // Pixel data (4-bit packed: 2 pixels per byte)
  const padding = rowSize - Math.ceil(width / 2);
  for (let y = 0; y < height; y++) {
    let byteOffset = 0;
    for (let x = 0; x < width; x += 2) {
      const idx1 = pixelIndices[y * width + x];
      const idx2 = x + 1 < width ? pixelIndices[y * width + x + 1] : 0;
      const packed = (idx1 << 4) | idx2;
      view.setUint8(offset++, packed);
      byteOffset++;
    }
    // Add row padding
    for (let p = 0; p < padding; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: "image/bmp" });
}

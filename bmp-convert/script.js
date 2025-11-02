// DOM Elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const previewSection = document.getElementById("previewSection");
const convertBtn = document.getElementById("convertBtn");
const clearBtn = document.getElementById("clearBtn");
const imageInfo = document.getElementById("imageInfo");
const notification = document.getElementById("notification");
const notificationText = document.getElementById("notificationText");
const notificationIcon = document.getElementById("notificationIcon");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cropOriginal = document.getElementById("cropOriginal");
const cropXteink = document.getElementById("cropXteink");
const cropCustom = document.getElementById("cropCustom");
const customCropInputs = document.getElementById("customCropInputs");
const customWidth = document.getElementById("customWidth");
const customHeight = document.getElementById("customHeight");
const compressionLevel = document.getElementById("compressionLevel");

// State
let currentImage = null;
let currentFileName = null;
let notificationTimeout = null;

// Initialize
init();

function init() {
  setupEventListeners();
}

function setupEventListeners() {
  // Verify elements exist before adding listeners
  if (!dropZone || !fileInput) {
    console.error("Drop zone or file input not found!");
    return;
  }

  // Click to upload - primary handler for desktop (macOS, Windows, etc.)
  dropZone.addEventListener(
    "click",
    (e) => {
      e.stopPropagation();
      // Trigger file input click
      if (fileInput) {
        fileInput.click();
      }
    },
    false
  );

  // Touch events for mobile (iOS Safari compatibility)
  // These only fire on actual touch devices, so they won't interfere with macOS
  let touchStarted = false;
  dropZone.addEventListener(
    "touchstart",
    () => {
      touchStarted = true;
    },
    { passive: true }
  );

  dropZone.addEventListener(
    "touchend",
    (e) => {
      if (touchStarted && fileInput) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      }
      touchStarted = false;
    },
    { passive: false }
  );

  // File input change
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag and drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Convert button
  convertBtn.addEventListener("click", convertToBMP);

  // Clear button
  clearBtn.addEventListener("click", clearImage);

  // Crop option radio buttons
  if (cropOriginal) {
    cropOriginal.addEventListener("change", handleCropOptionChange);
  }
  if (cropXteink) {
    cropXteink.addEventListener("change", handleCropOptionChange);
  }
  if (cropCustom) {
    cropCustom.addEventListener("change", handleCropOptionChange);
  }
}

function handleCropOptionChange() {
  if (cropCustom && cropCustom.checked) {
    customCropInputs.style.display = "flex";
  } else {
    customCropInputs.style.display = "none";
  }
}

function handleFile(file) {
  // Validate file type
  if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
    showNotification("Please upload a PNG or JPEG file", "error");
    return;
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    showNotification("File is too large. Maximum size is 50MB", "error");
    return;
  }

  // Store filename
  currentFileName = file.name;

  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();

    img.onload = () => {
      currentImage = img;
      preview.src = e.target.result;
      previewSection.classList.add("visible");

      // Display image info with filename
      const fileSizeKB = (file.size / 1024).toFixed(2);
      imageInfo.innerHTML = `
            <div><strong>File:</strong> ${file.name}</div>
            <div><strong>Dimensions:</strong> ${img.width} × ${
        img.height
      }px</div>
            <div><strong>Size:</strong> ${fileSizeKB} KB</div>
            <div><strong>Format:</strong> ${file.type
              .split("/")[1]
              .toUpperCase()}</div>
        `;

      showNotification("Image loaded successfully!", "success");
    };

    img.onerror = () => {
      showNotification(
        "Failed to load image. Please try another file.",
        "error"
      );
    };

    img.src = e.target.result;
  };

  reader.onerror = () => {
    showNotification("Failed to read file", "error");
  };

  reader.readAsDataURL(file);
}

function clearImage() {
  currentImage = null;
  currentFileName = null;
  preview.src = "";
  fileInput.value = "";
  previewSection.classList.remove("visible");
  imageInfo.innerHTML = "";
}

function convertToBMP() {
  if (!currentImage) return;

  convertBtn.disabled = true;
  showNotification("Converting to BMP...", "info");

  try {
    // Determine target dimensions based on crop option
    let targetWidth = currentImage.width;
    let targetHeight = currentImage.height;

    if (cropXteink && cropXteink.checked) {
      targetWidth = 480;
      targetHeight = 800;
    } else if (cropCustom && cropCustom.checked) {
      targetWidth = parseInt(customWidth.value) || currentImage.width;
      targetHeight = parseInt(customHeight.value) || currentImage.height;
    }
    // If original, keep current dimensions

    // Set canvas dimensions
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw and scale image to target dimensions
    ctx.drawImage(currentImage, 0, 0, targetWidth, targetHeight);

    // Use manual BMP encoder (browsers don't natively support image/bmp format)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Choose encoding based on compression level
    let bmpBlob;
    const level = compressionLevel ? compressionLevel.value : "8";

    if (level === "24") {
      bmpBlob = encodeBMP(imageData);
    } else if (level === "8") {
      bmpBlob = encodeBMP8Bit(imageData);
    } else if (level === "4" || level === "4-aggressive") {
      bmpBlob = encodeBMP4Bit(imageData, level === "4-aggressive");
    } else {
      bmpBlob = encodeBMP8Bit(imageData);
    }

    downloadBMP(bmpBlob);
    convertBtn.disabled = false;
  } catch (error) {
    showNotification("Conversion failed: " + error.message, "error");
    convertBtn.disabled = false;
  }
}

function encodeBMP(imageData) {
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

function encodeBMP8Bit(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Use octree quantization for better color quality
  // Simplified approach: quantize to 6-7-6 levels (252 colors) for good quality
  const quantizeR = (r) => Math.floor((r * 6) / 256);
  const quantizeG = (g) => Math.floor((g * 7) / 256);
  const quantizeB = (b) => Math.floor((b * 6) / 256);

  // Build palette using quantization
  const paletteMap = new Map();
  const colorArray = [];

  // Create a 6x7x6 color cube (252 colors) - good quality, fast lookup
  for (let rq = 0; rq < 6; rq++) {
    for (let gq = 0; gq < 7; gq++) {
      for (let bq = 0; bq < 6; bq++) {
        const r = Math.round((rq * 255) / 5);
        const g = Math.round((gq * 255) / 6);
        const b = Math.round((bq * 255) / 5);
        const colorKey = (rq << 16) | (gq << 8) | bq;
        const index = colorArray.length;
        paletteMap.set(colorKey, index);
        colorArray.push({ r, g, b });
      }
    }
  }

  // Fill remaining slots (up to 256) with average colors from the image
  if (colorArray.length < 256) {
    const colorCount = new Map();

    // Sample colors from the image
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // Skip transparent/semi-transparent

      const rq = quantizeR(data[i]);
      const gq = quantizeG(data[i + 1]);
      const bq = quantizeB(data[i + 2]);
      const colorKey = (rq << 16) | (gq << 8) | bq;

      if (!paletteMap.has(colorKey)) {
        colorCount.set(colorKey, (colorCount.get(colorKey) || 0) + 1);
      }
    }

    // Add most frequent colors to palette
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

  // Optimized color matching function
  const findClosestColor = (r, g, b) => {
    const rq = quantizeR(r);
    const gq = quantizeG(g);
    const bq = quantizeB(b);
    const colorKey = (rq << 16) | (gq << 8) | bq;

    if (paletteMap.has(colorKey)) {
      return paletteMap.get(colorKey);
    }

    // Find nearest color using Euclidean distance (optimized)
    let minDist = Infinity;
    let bestIndex = 0;

    // Check nearby quantized colors first for speed
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

    // If not found in nearby colors, search all palette (fallback)
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

function encodeBMP4Bit(imageData, aggressive = false) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Apply Floyd-Steinberg dithering if aggressive mode
  if (aggressive) {
    const ditheredData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (ditheredData[i + 3] < 128) continue; // Skip transparent pixels

        const oldR = ditheredData[i];
        const oldG = ditheredData[i + 1];
        const oldB = ditheredData[i + 2];

        // Quantize to 4 levels per channel (4^3 = 64 colors max, but we'll use 16)
        const quantize = (val) => Math.round((val / 255) * 3) * 85;
        const newR = Math.max(0, Math.min(255, quantize(oldR)));
        const newG = Math.max(0, Math.min(255, quantize(oldG)));
        const newB = Math.max(0, Math.min(255, quantize(oldB)));

        ditheredData[i] = newR;
        ditheredData[i + 1] = newG;
        ditheredData[i + 2] = newB;

        // Calculate error
        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Distribute error to neighboring pixels (Floyd-Steinberg)
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

        distributeError(x + 1, y, 7 / 16); // Right
        distributeError(x - 1, y + 1, 3 / 16); // Bottom-left
        distributeError(x, y + 1, 5 / 16); // Bottom
        distributeError(x + 1, y + 1, 1 / 16); // Bottom-right
      }
    }

    // Use dithered data
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    const tempImageData = tempCtx.createImageData(width, height);
    tempImageData.data.set(ditheredData);
    tempCtx.putImageData(tempImageData, 0, 0);
    const finalImageData = tempCtx.getImageData(0, 0, width, height);
    return encodeBMP4BitFromData(finalImageData);
  } else {
    return encodeBMP4BitFromData(imageData);
  }
}

function encodeBMP4BitFromData(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Build 16-color palette using median cut or quantization
  // Use 4 levels per RGB channel = 4^3 = 64 possible colors, but we'll pick the best 16
  const quantizeR = (r) => Math.floor((r * 4) / 256);
  const quantizeG = (g) => Math.floor((g * 4) / 256);
  const quantizeB = (b) => Math.floor((b * 4) / 256);

  // Count color frequencies
  const colorCount = new Map();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // Skip transparent

    const rq = quantizeR(data[i]);
    const gq = quantizeG(data[i + 1]);
    const bq = quantizeB(data[i + 2]);
    const colorKey = (rq << 8) | (gq << 4) | bq;

    colorCount.set(colorKey, (colorCount.get(colorKey) || 0) + 1);
  }

  // Select top 16 most frequent colors
  const sortedColors = Array.from(colorCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16);

  const colorArray = [];
  const paletteMap = new Map();

  // Build palette from most frequent colors
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

  // Fill remaining slots if needed (shouldn't happen, but safety)
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

  // Find closest color function
  const findClosestColor = (r, g, b) => {
    const rq = quantizeR(r);
    const gq = quantizeG(g);
    const bq = quantizeB(b);
    const colorKey = (rq << 8) | (gq << 4) | bq;

    if (paletteMap.has(colorKey)) {
      return paletteMap.get(colorKey);
    }

    // Find nearest color using Euclidean distance
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

function downloadBMP(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Use original filename if available, otherwise default name
  const baseName = currentFileName
    ? currentFileName.replace(/\.[^/.]+$/, "")
    : "converted";
  a.download = `${baseName}.bmp`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);

  // Show file size
  const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
  showNotification(
    `BMP file downloaded successfully! (${sizeMB} MB)`,
    "success"
  );
}

function showNotification(message, type = "info") {
  // Clear any existing timeout
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  // Update notification
  notificationText.textContent = message;
  notification.className = `notification visible ${type}`;

  // Update icon based on type
  if (notificationIcon) {
    if (type === "success") {
      notificationIcon.innerHTML = `
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 4L12 14.01l-3-3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    } else if (type === "error") {
      notificationIcon.innerHTML = `
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <path d="M15 9l-6 6M9 9l6 6" stroke-width="2" stroke-linecap="round"/>
      `;
    } else {
      notificationIcon.innerHTML = `
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
      `;
    }
  }

  // Auto-hide after 5 seconds
  notificationTimeout = setTimeout(() => {
    notification.classList.remove("visible");
  }, 5000);
}

// Prevent default drag behavior on the whole document, but only for drag events
// Don't interfere with click events
document.addEventListener("dragover", (e) => {
  // Only prevent if it's actually a drag operation
  if (e.dataTransfer && e.dataTransfer.types.length > 0) {
    e.preventDefault();
  }
});
document.addEventListener("drop", (e) => {
  // Only prevent if it's actually a drag operation
  if (e.dataTransfer && e.dataTransfer.types.length > 0) {
    e.preventDefault();
  }
});

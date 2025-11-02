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
    const bmpBlob = encodeBMP(imageData);
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

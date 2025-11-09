// Main application logic and UI handlers
import { escapeHtml, downloadBMP, showNotification } from "./helpers.js";
import { encodeBMP, encodeBMP8Bit, encodeBMP4Bit } from "./encoder.js";

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
    showNotification(
      "Please upload a PNG or JPEG file",
      "error",
      notificationText,
      notificationIcon,
      notification
    );
    return;
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    showNotification(
      "File is too large. Maximum size is 50MB",
      "error",
      notificationText,
      notificationIcon,
      notification
    );
    return;
  }

  // Validate filename (prevent path traversal attempts)
  if (
    file.name.includes("..") ||
    file.name.includes("/") ||
    file.name.includes("\\")
  ) {
    showNotification(
      "Invalid filename. Please use a valid image file.",
      "error",
      notificationText,
      notificationIcon,
      notification
    );
    return;
  }

  // Store filename
  currentFileName = file.name;

  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();

    img.onload = () => {
      // Security: Validate image dimensions to prevent memory exhaustion
      const MAX_DIMENSION = 10000; // Reasonable limit
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        showNotification(
          `Image dimensions too large. Maximum is ${MAX_DIMENSION}px on any side.`,
          "error",
          notificationText,
          notificationIcon,
          notification
        );
        return;
      }

      // Security: Check total pixel count to prevent memory exhaustion
      const MAX_PIXELS = 250000000; // ~250MP (reasonable limit for processing)
      if (img.width * img.height > MAX_PIXELS) {
        showNotification(
          "Image is too large. Please resize before converting.",
          "error",
          notificationText,
          notificationIcon,
          notification
        );
        return;
      }

      currentImage = img;
      preview.src = e.target.result;
      previewSection.classList.add("visible");

      // Display image info with filename (safely escaped)
      const fileSizeKB = (file.size / 1024).toFixed(2);
      imageInfo.innerHTML = `
            <div><strong>File:</strong> ${escapeHtml(file.name)}</div>
            <div><strong>Dimensions:</strong> ${img.width} × ${
        img.height
      }px</div>
            <div><strong>Size:</strong> ${fileSizeKB} KB</div>
            <div><strong>Format:</strong> ${escapeHtml(
              file.type.split("/")[1].toUpperCase()
            )}</div>
        `;

      showNotification(
        "Image loaded successfully!",
        "success",
        notificationText,
        notificationIcon,
        notification
      );
    };

    img.onerror = () => {
      showNotification(
        "Failed to load image. Please try another file.",
        "error",
        notificationText,
        notificationIcon,
        notification
      );
    };

    img.src = e.target.result;
  };

  reader.onerror = () => {
    showNotification(
      "Failed to read file",
      "error",
      notificationText,
      notificationIcon,
      notification
    );
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
  showNotification(
    "Converting to BMP...",
    "info",
    notificationText,
    notificationIcon,
    notification
  );

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

    // Security: Validate target dimensions before setting canvas
    const MAX_DIMENSION = 10000;
    const MAX_PIXELS = 250000000;
    if (
      targetWidth > MAX_DIMENSION ||
      targetHeight > MAX_DIMENSION ||
      targetWidth * targetHeight > MAX_PIXELS
    ) {
      showNotification(
        "Target dimensions are too large. Please use smaller dimensions.",
        "error",
        notificationText,
        notificationIcon,
        notification
      );
      convertBtn.disabled = false;
      return;
    }

    if (
      targetWidth <= 0 ||
      targetHeight <= 0 ||
      !Number.isInteger(targetWidth) ||
      !Number.isInteger(targetHeight)
    ) {
      showNotification(
        "Invalid dimensions. Please enter positive integers.",
        "error",
        notificationText,
        notificationIcon,
        notification
      );
      convertBtn.disabled = false;
      return;
    }

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

    const sizeMB = downloadBMP(bmpBlob, currentFileName);
    showNotification(
      `BMP file downloaded successfully! (${sizeMB} MB)`,
      "success",
      notificationText,
      notificationIcon,
      notification
    );
    convertBtn.disabled = false;
  } catch (error) {
    showNotification(
      "Conversion failed: " + error.message,
      "error",
      notificationText,
      notificationIcon,
      notification
    );
    convertBtn.disabled = false;
  }
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

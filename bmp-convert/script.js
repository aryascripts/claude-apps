// DOM Elements
const dropZone = document.getElementById(‘dropZone’);
const fileInput = document.getElementById(‘fileInput’);
const preview = document.getElementById(‘preview’);
const previewSection = document.getElementById(‘previewSection’);
const convertBtn = document.getElementById(‘convertBtn’);
const clearBtn = document.getElementById(‘clearBtn’);
const imageInfo = document.getElementById(‘imageInfo’);
const notification = document.getElementById(‘notification’);
const notificationText = document.getElementById(‘notificationText’);
const canvas = document.getElementById(‘canvas’);
const ctx = canvas.getContext(‘2d’);

// State
let currentImage = null;
let notificationTimeout = null;

// Initialize
init();

function init() {
setupEventListeners();
}

function setupEventListeners() {
// Click to upload
dropZone.addEventListener(‘click’, () => fileInput.click());

```
// File input change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Convert button
convertBtn.addEventListener('click', convertToBMP);

// Clear button
clearBtn.addEventListener('click', clearImage);
```

}

function handleFile(file) {
// Validate file type
if (!file.type.match(/image/(png|jpeg|jpg)/)) {
showNotification(‘Please upload a PNG or JPEG file’, ‘error’);
return;
}

```
// Validate file size (max 50MB)
const maxSize = 50 * 1024 * 1024;
if (file.size > maxSize) {
    showNotification('File is too large. Maximum size is 50MB', 'error');
    return;
}

const reader = new FileReader();

reader.onload = (e) => {
    const img = new Image();
    
    img.onload = () => {
        currentImage = img;
        preview.src = e.target.result;
        previewSection.classList.add('visible');
        
        // Display image info
        const fileSizeKB = (file.size / 1024).toFixed(2);
        imageInfo.innerHTML = `
            <div><strong>Dimensions:</strong> ${img.width} × ${img.height}px</div>
            <div><strong>Size:</strong> ${fileSizeKB} KB</div>
            <div><strong>Format:</strong> ${file.type.split('/')[1].toUpperCase()}</div>
        `;
        
        showNotification('Image loaded successfully!', 'success');
    };
    
    img.onerror = () => {
        showNotification('Failed to load image. Please try another file.', 'error');
    };
    
    img.src = e.target.result;
};

reader.onerror = () => {
    showNotification('Failed to read file', 'error');
};

reader.readAsDataURL(file);
```

}

function clearImage() {
currentImage = null;
preview.src = ‘’;
fileInput.value = ‘’;
previewSection.classList.remove(‘visible’);
imageInfo.innerHTML = ‘’;
}

function convertToBMP() {
if (!currentImage) return;

```
convertBtn.disabled = true;
showNotification('Converting to BMP...', 'info');

try {
    // Draw image to canvas
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0);
    
    // Try native BMP support first
    let blobCreated = false;
    
    canvas.toBlob((blob) => {
        if (blob && blob.type === 'image/bmp' && blob.size > 100) {
            blobCreated = true;
            downloadBMP(blob);
            convertBtn.disabled = false;
        }
    }, 'image/bmp');
    
    // Fallback to manual encoder after short delay
    setTimeout(() => {
        if (!blobCreated) {
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const bmpBlob = encodeBMP(imageData);
                downloadBMP(bmpBlob);
            } catch (error) {
                showNotification('Conversion failed: ' + error.message, 'error');
            } finally {
                convertBtn.disabled = false;
            }
        }
    }, 500);
    
} catch (error) {
    showNotification('Conversion failed: ' + error.message, 'error');
    convertBtn.disabled = false;
}
```

}

function encodeBMP(imageData) {
const width = imageData.width;
const height = imageData.height;
const data = imageData.data;

```
// BMP rows must be padded to multiples of 4 bytes
const rowSize = Math.floor((24 * width + 31) / 32) * 4;
const pixelArraySize = rowSize * height;
const fileSize = 54 + pixelArraySize; // 54 = header size

// Create buffer for BMP file
const buffer = new ArrayBuffer(fileSize);
const view = new DataView(buffer);

// BMP File Header (14 bytes)
view.setUint8(0, 0x42);  // 'B'
view.setUint8(1, 0x4D);  // 'M'
view.setUint32(2, fileSize, true);  // File size
view.setUint32(6, 0, true);  // Reserved
view.setUint32(10, 54, true);  // Pixel data offset

// DIB Header - BITMAPINFOHEADER (40 bytes)
view.setUint32(14, 40, true);  // DIB header size
view.setInt32(18, width, true);  // Width
view.setInt32(22, -height, true);  // Height (negative = top-down)
view.setUint16(26, 1, true);  // Planes
view.setUint16(28, 24, true);  // Bits per pixel (24-bit)
view.setUint32(30, 0, true);  // Compression (0 = BI_RGB, no compression)
view.setUint32(34, pixelArraySize, true);  // Image size
view.setInt32(38, 2835, true);  // X pixels per meter (~72 DPI)
view.setInt32(42, 2835, true);  // Y pixels per meter (~72 DPI)
view.setUint32(46, 0, true);  // Colors in palette (0 = default)
view.setUint32(50, 0, true);  // Important colors (0 = all)

// Pixel data (BGR format with row padding)
let offset = 54;
const padding = rowSize - width * 3;

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        // BMP uses BGR order instead of RGB
        view.setUint8(offset++, data[i + 2]);  // Blue
        view.setUint8(offset++, data[i + 1]);  // Green
        view.setUint8(offset++, data[i]);      // Red
        // Alpha channel is ignored in 24-bit BMP
    }
    // Add row padding (each row must be multiple of 4 bytes)
    for (let p = 0; p < padding; p++) {
        view.setUint8(offset++, 0);
    }
}

return new Blob([buffer], { type: 'image/bmp' });
```

}

function downloadBMP(blob) {
const url = URL.createObjectURL(blob);
const a = document.createElement(‘a’);
a.href = url;
a.download = ‘converted.bmp’;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);

```
// Clean up
setTimeout(() => URL.revokeObjectURL(url), 100);

// Show file size
const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
showNotification(`BMP file downloaded successfully! (${sizeMB} MB)`, 'success');
```

}

function showNotification(message, type = ‘info’) {
// Clear any existing timeout
if (notificationTimeout) {
clearTimeout(notificationTimeout);
}

```
// Update notification
notificationText.textContent = message;
notification.className = `notification visible ${type}`;

// Update icon based on type
const icon = notification.querySelector('.notification-icon');
if (type === 'success') {
    icon.innerHTML = `
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 4L12 14.01l-3-3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `;
} else if (type === 'error') {
    icon.innerHTML = `
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <path d="M15 9l-6 6M9 9l6 6" stroke-width="2" stroke-linecap="round"/>
    `;
} else {
    icon.innerHTML = `
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
    `;
}

// Auto-hide after 5 seconds
notificationTimeout = setTimeout(() => {
    notification.classList.remove('visible');
}, 5000);
```

}

// Prevent default drag behavior on the whole document
document.addEventListener(‘dragover’, (e) => e.preventDefault());
document.addEventListener(‘drop’, (e) => e.preventDefault());

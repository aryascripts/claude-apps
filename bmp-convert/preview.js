// Preview generation functions - uses encoder's shared quantization logic
import {
  build8BitPalette,
  build4BitPalette,
  quantizeImageData,
  applyDithering4Bit,
} from "./encoder.js";

// Preview generation functions - return quantized ImageData for display
export function generatePreview24Bit(imageData) {
  // 24-bit is lossless, so return original
  return imageData;
}

export function generatePreview8Bit(imageData) {
  const { colorArray, findClosestColor } = build8BitPalette(imageData.data);
  return quantizeImageData(imageData, colorArray, findClosestColor);
}

export function generatePreview4Bit(imageData, aggressive = false) {
  const width = imageData.width;
  const height = imageData.height;
  let processedData = imageData.data;

  // Apply dithering if aggressive
  if (aggressive) {
    processedData = applyDithering4Bit(processedData, width, height);
    // Create new ImageData with dithered data for palette building
    const tempImageData = new ImageData(width, height);
    tempImageData.data.set(processedData);
    processedData = tempImageData.data;
  }

  const { colorArray, findClosestColor } = build4BitPalette(processedData);

  // Use processed data for quantization
  const processedImageData = new ImageData(width, height);
  processedImageData.data.set(processedData);

  return quantizeImageData(processedImageData, colorArray, findClosestColor);
}

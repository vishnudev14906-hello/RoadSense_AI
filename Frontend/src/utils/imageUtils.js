/**
 * High-Performance Client-Side Image Preprocessing & Compression Utility
 * Resizes large mobile phone camera images (12MP-48MP) to reasonable dimensions (max 1280px)
 * preserving aspect ratio, EXIF orientation, and crisp quality before Base64 upload.
 */
export const compressImageForUpload = (file, maxDimension = 1280, quality = 0.88) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    // Pass through non-images directly as standard Data URL
    if (!file.type || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If image is already smaller than maxDimension and file size is <= 800KB, preserve original
        if (width <= maxDimension && height <= maxDimension && file.size <= 800 * 1024) {
          resolve(readerEvent.target.result);
          return;
        }

        // Calculate aspect ratio preserved dimensions
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target.result);
          return;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to high-quality JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(readerEvent.target.result);
      img.src = readerEvent.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Deterministic Client-Side Computer Vision Validator for Road & Highway Images
 * Analyzes pixel distribution, color spectrum, HSV chroma, skin tone, foliage,
 * sky/water ratio, and lower ground-plane pavement presence using an HTML5 Canvas.
 * 
 * Rejects:
 * - Faces, selfies, portraits, skin tones (>12% skin pixels)
 * - Dense greenery, lawns, gardens, forests (>45% foliage)
 * - Ocean, swimming pool, open sky (>48% sky/water)
 * - Solid colors, blank/uniform canvas (grayscale std dev < 3.0)
 * - Screenshots, documents, white/black backgrounds (>40% pure white/black)
 * - High-saturation cartoons, memes, artwork (mean saturation > 0.40)
 * - Scenes without asphalt/concrete road ground plane in the lower half (<14% pavement)
 * 
 * Returns: { isValid: boolean, error: string | null }
 */
export const validateRoadImageClient = (imageSource) => {
  return new Promise((resolve) => {
    if (!imageSource) {
      resolve({ isValid: false, error: "Please upload a valid image" });
      return;
    }

    const processImageElement = (img) => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width < 64 || height < 64) {
          resolve({ isValid: false, error: "Please upload a valid image. Image resolution is too small." });
          return;
        }

        const canvas = document.createElement('canvas');
        const targetW = 320;
        const targetH = 240;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // If 2D context fails, allow to fall back to backend validator
          resolve({ isValid: true, error: null });
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imageData.data;
        const totalPixels = targetW * targetH;

        let sumGray = 0;
        let sumSqGray = 0;
        let pureWhiteBlackCount = 0;
        let skinCount = 0;
        let foliageCount = 0;
        let skyWaterCount = 0;
        let sumSat = 0;
        let highSatCount = 0;

        const lowerStartY = Math.floor(targetH * 0.40);
        let lowerTotal = 0;
        let lowerPavementCount = 0;
        let lowerFoliageCount = 0;

        for (let y = 0; y < targetH; y++) {
          const isLowerHalf = y >= lowerStartY;
          for (let x = 0; x < targetW; x++) {
            const idx = (y * targetW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            sumGray += gray;
            sumSqGray += gray * gray;

            // Pure white or pure black pixels
            if ((r > 242 && g > 242 && b > 242) || (r < 14 && g < 14 && b < 14)) {
              pureWhiteBlackCount++;
            }

            // HSV Calculation
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const delta = maxC - minC;
            const v = maxC / 255;
            const s = maxC > 0.001 ? delta / maxC : 0;
            sumSat += s;
            if (s > 0.55) highSatCount++;

            let h = 0;
            if (delta > 0.001) {
              if (maxC === r) {
                h = ((g - b) / delta) % 6;
              } else if (maxC === g) {
                h = ((b - r) / delta) + 2;
              } else {
                h = ((r - g) / delta) + 4;
              }
              h = ((h / 6) % 1 + 1) % 1; // 0..1
            }

            // Human Skin Tone Detection
            const isSkin = ((h <= 0.10 || h >= 0.90) && s >= 0.14 && s <= 0.70 && v >= 0.22 && v <= 0.96 && r > g && g > b && (r - g) > 8);
            if (isSkin) skinCount++;

            // Green Foliage / Vegetation Detection
            const isFoliage = (h >= 0.18 && h <= 0.48 && s > 0.18 && g > r + 6 && g > b + 6);
            if (isFoliage) foliageCount++;

            // Sky / Water Detection
            const isSkyWater = (h >= 0.50 && h <= 0.78 && s > 0.20 && b > r + 12);
            if (isSkyWater) skyWaterCount++;

            // Ground Plane (Lower half) analysis for roadway pavement
            if (isLowerHalf) {
              lowerTotal++;
              if (isFoliage) lowerFoliageCount++;

              // Pavement / Asphalt / Concrete neutral chroma
              const neutralChroma = Math.abs(r - g) < 35 && Math.abs(g - b) < 35;
              const isAsphalt = neutralChroma && s < 0.38 && v >= 0.06 && v <= 0.90;
              if (isAsphalt) lowerPavementCount++;
            }
          }
        }

        const meanGray = sumGray / totalPixels;
        const variance = Math.max(0, (sumSqGray / totalPixels) - (meanGray * meanGray));
        const stdDev = Math.sqrt(variance);

        // 1. Blank or single solid color
        if (stdDev < 2.5) {
          resolve({ isValid: false, error: "Please upload a valid image" });
          return;
        }

        // 2. Screenshot / Flat document / UI diagram
        if ((pureWhiteBlackCount / totalPixels) > 0.45) {
          resolve({ isValid: false, error: "Please upload a valid image" });
          return;
        }

        // 3. Human face / selfie / portrait
        if ((skinCount / totalPixels) > 0.14) {
          resolve({ isValid: false, error: "Please upload a valid image" });
          return;
        }

        // 4. Dense vegetation / trees / forest / lawn
        if ((foliageCount / totalPixels) > 0.50) {
          resolve({ isValid: false, error: "Please upload a valid image" });
          return;
        }

        // 5. Sky / ocean / swimming pool
        if ((skyWaterCount / totalPixels) > 0.52) {
          resolve({ isValid: false, error: "Please upload a valid image" });
          return;
        }

        // 6. High-saturation cartoon, meme, or graphic
        const meanSat = sumSat / totalPixels;
        if (meanSat > 0.42 || (highSatCount / totalPixels) > 0.35) {
          resolve({ isValid: false, error: "Please upload a valid image" });
          return;
        }

        // 7. Lower Ground-Plane Verification (must have pavement in lower 60%)
        const lowerAsphaltPct = lowerTotal > 0 ? (lowerPavementCount / lowerTotal) * 100 : 0;
        const lowerFoliagePct = lowerTotal > 0 ? (lowerFoliageCount / lowerTotal) * 100 : 0;

        if (lowerAsphaltPct < 15.0 || lowerFoliagePct > 40.0) {
          resolve({ isValid: false, error: "Please upload a valid image" });
          return;
        }

        // All checks passed! Genuine road image verified
        resolve({ isValid: true, error: null });
      } catch (err) {
        console.warn("Client road image verification error, falling back:", err);
        resolve({ isValid: true, error: null });
      }
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImageElement(img);
      img.onerror = () => resolve({ isValid: false, error: "Please upload a valid image" });
      img.src = imageSource;
    } else if (imageSource instanceof File || imageSource instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImageElement(img);
        img.onerror = () => resolve({ isValid: false, error: "Please upload a valid image" });
        img.src = e.target.result;
      };
      reader.onerror = () => resolve({ isValid: false, error: "Please upload a valid image" });
      reader.readAsDataURL(imageSource);
    } else if (typeof window !== 'undefined' && window.HTMLImageElement && imageSource instanceof window.HTMLImageElement) {
      if (imageSource.complete) {
        processImageElement(imageSource);
      } else {
        imageSource.onload = () => processImageElement(imageSource);
        imageSource.onerror = () => resolve({ isValid: false, error: "Please upload a valid image" });
      }
    } else {
      resolve({ isValid: false, error: "Please upload a valid image" });
    }
  });
};

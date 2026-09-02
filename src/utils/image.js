/**
 * Client-side high-performance image compression using HTML5 Canvas
 * Reduces 8MB-15MB camera/device photos down to ~150KB-250KB WebP
 * 100% free, zero external libraries, instant in-memory processing
 */

export function compressImage(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    // If not an image or already under 150KB, return as-is
    if (!file || !file.type.startsWith('image/') || file.size < 150 * 1024) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onerror = () => resolve(file); // Fallback on read failure
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => resolve(file); // Fallback on load failure
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        // Optional smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to modern WebP format
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const fileName = file.name.replace(/\.[^.]+$/, '.webp');
            const compressedFile = new File([blob], fileName, {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

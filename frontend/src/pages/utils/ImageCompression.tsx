/**
 * Compresses an image file while maintaining aspect ratio and quality
 * @param file The image file to compress
 * @param maxWidth Maximum width of the compressed image
 * @param quality Quality of the compressed image (0.0 to 1.0)
 * @returns Promise resolving to the compressed image as a Blob
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with specified quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
      if (!event.target?.result || typeof event.target.result !== 'string') {
        reject(new Error('Invalid file data'));
        return;
      }
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Converts a Blob to a base64 data URL
 * @param blob The blob to convert
 * @returns Promise resolving to the data URL
 */
export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}; 
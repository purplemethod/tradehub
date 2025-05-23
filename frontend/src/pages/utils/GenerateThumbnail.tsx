/**
 * Generates a thumbnail data URL from an image file.
 * @param file The image file.
 * @param maxWidth The maximum width for the thumbnail.
 * @returns A Promise that resolves with the thumbnail data URL.
 */
export const generateThumbnail = (file: File, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
  
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
  
          const aspectRatio = img.width / img.height;
          let newWidth = maxWidth;
          let newHeight = newWidth / aspectRatio;
  
          // If the original image is smaller than the max width, use original dimensions
          if (img.width < maxWidth) {
            newWidth = img.width;
            newHeight = img.height;
          }
  
          canvas.width = newWidth;
          canvas.height = newHeight;
  
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
  
          // Get the data URL of the thumbnail
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7); // You can adjust the quality (0.0 to 1.0)
          resolve(thumbnailUrl);
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
  
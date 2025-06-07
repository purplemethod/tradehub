/**
 * Converts an array of image chunks and mime type into a data URL
 * @param chunks Array of base64 encoded image chunks
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg', 'image/png')
 * @returns A Promise that resolves to the complete image data URL
 */
export const getFullImageDataUrl = async (
  chunks: string[],
  mimeType: string
): Promise<string> => {
  try {
    // Join all chunks into a single base64 string
    const base64Data = chunks.join("");

    // Create the data URL
    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    console.error("Error creating full image data URL:", error);
    throw error;
  }
};

/**
 * Compresses an image file to a specified maximum width and quality
 * @param file The image file to compress
 * @param maxWidth The maximum width of the compressed image
 * @param quality The quality of the compressed image (0-1)
 * @returns A Promise that resolves to the compressed image as a Blob
 */
export const compressImage = async (
  file: File,
  maxWidth: number,
  quality: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not compress image"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Could not load image"));
      if (!event.target?.result || typeof event.target.result !== 'string') {
        reject(new Error('Invalid file data'));
        return;
      }
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
};

/**
 * Creates a thumbnail from an image file
 * @param file The image file to create a thumbnail from
 * @returns A Promise that resolves to the thumbnail as a Blob
 */
export const createThumbnail = async (
  file: File,
  maxWidth: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not create thumbnail"));
            }
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = () => reject(new Error("Could not load image"));
      if (!event.target?.result || typeof event.target.result !== 'string') {
        reject(new Error('Invalid file data'));
        return;
      }
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
};

/**
 * Converts a Blob to a data URL
 * @param blob The Blob to convert
 * @returns A Promise that resolves to the data URL
 */
export const blobToDataURL = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl);
    };
    reader.onerror = () =>
      reject(new Error("Could not convert blob to data URL"));
    reader.readAsDataURL(blob);
  });
};

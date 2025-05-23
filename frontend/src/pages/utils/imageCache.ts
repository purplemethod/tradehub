/**
 * Adds an image to the cache
 * @param key The key to store the image under
 * @param dataUrl The image data URL to cache
 */
export const addImageData = async (key: string, dataUrl: string): Promise<void> => {
  try {
    localStorage.setItem(key, dataUrl);
  } catch (error) {
    console.error('Error caching image:', error);
  }
};

/**
 * Gets an image from the cache
 * @param key The key to retrieve the image from
 * @returns The cached image data URL or null if not found
 */
export const getImageData = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error retrieving cached image:', error);
    return null;
  }
};

/**
 * Removes an image from the cache
 * @param key The key of the image to remove
 */
export const removeImageData = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing cached image:', error);
  }
}; 
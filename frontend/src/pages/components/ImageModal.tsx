import React, { useEffect, useState } from "react";
import { getImageData, addImageData } from "../utils/indexedDB";
import GetFullImageDataURL from "../utils/GetFullImageDataURL";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  thumbnailDataURL: string | null;
  fullImageRef?: string;
  images?: string[];
  currentIndex?: number;
  onNext?: () => void;
  onPrevious?: () => void;
  type?: string;
  videoId?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  thumbnailDataURL,
  fullImageRef,
  images = [],
  currentIndex = 0,
  onNext,
  onPrevious,
  type,
  videoId,
}) => {
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(
    thumbnailDataURL
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);

  // Preload next and previous images
  useEffect(() => {
    if (type === "youtube") return;
    if (!isOpen || !images.length) return;

    const preloadImage = async (index: number) => {
      if (index < 0 || index >= images.length) return;
      const ref = images[index];
      try {
        const cachedImage = await getImageData(ref);
        if (!cachedImage) {
          await GetFullImageDataURL({ fullImageRef: ref });
        }
      } catch (error) {
        console.error("Error preloading image:", error);
      }
    };

    // Preload next image
    if (currentIndex < images.length - 1) {
      preloadImage(currentIndex + 1);
    }
    // Preload previous image
    if (currentIndex > 0) {
      preloadImage(currentIndex - 1);
    }
  }, []);

  useEffect(() => {
    if (type === "youtube") return;
    let isMounted = true;
    let loadingTimeout: number;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const loadImage = async () => {
      if (!isOpen || !fullImageRef) return;

      try {
        setLoading(true);
        setError(null);
        setIsHighQualityLoaded(false);

        // Show thumbnail immediately if available
        if (thumbnailDataURL) {
          setFullImageUrl(thumbnailDataURL);
        }

        // Try to get from cache first
        const cachedImage = await getImageData(fullImageRef);
        if (cachedImage && isMounted) {
          setFullImageUrl(cachedImage);
          setIsHighQualityLoaded(true);
          setLoading(false);
          return;
        }

        // Add a small delay to prevent UI flicker if cache hit is fast
        loadingTimeout = setTimeout(() => {
          if (isMounted) {
            // console.log("Fetching full image from:", fullImageRef);
          }
        }, 100);

        const dataURL = await GetFullImageDataURL({
          fullImageRef,
        });

        if (!isMounted) return;

        if (!dataURL) {
          throw new Error("Failed to get image data URL");
        }

        // Validate the data URL format
        if (!dataURL.startsWith("data:image/")) {
          throw new Error("Invalid image data URL format");
        }

        setFullImageUrl(dataURL);
        setIsHighQualityLoaded(true);
        await addImageData(fullImageRef, dataURL);
        retryCount = 0; // Reset retry count on success
      } catch (error) {
        console.error("Error loading image:", error);
        if (isMounted) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(
              `Retrying image load (${retryCount}/${MAX_RETRIES})...`
            );
            setTimeout(loadImage, 1000 * retryCount); // Exponential backoff
          } else {
            setError("Failed to load image. Please try again later.");
            retryCount = 0;
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  }, [fullImageRef, isOpen, thumbnailDataURL, type]);

  // Reset state when modal closes
  useEffect(() => {
    if (type === "youtube") return;
    if (!isOpen) {
      setFullImageUrl(thumbnailDataURL);
      setError(null);
      setLoading(false);
      setIsHighQualityLoaded(false);
    }
  }, [isOpen, thumbnailDataURL, type]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-75"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Placeholder for video player */}
        {type === "youtube" && (
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${window.location.origin}&rel=0&modestbranding=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
        {/* Placeholder for image viewer */}
        <div className="relative w-full h-full flex items-center justify-center">
          {loading && !isHighQualityLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red">
              {error}
            </div>
          ) : fullImageUrl ? (
            type === "image" && (
              <img
                src={fullImageUrl}
                alt="Full size"
                className={`max-w-full max-h-[90vh] object-contain transition-opacity duration-300 ${
                  isHighQualityLoaded ? "opacity-100" : "opacity-50"
                }`}
                onError={(e) => {
                  console.error("Image failed to load:", e);
                  setError("Failed to load image. Please try again later.");
                }}
                onLoad={() => {
                  setError(null);
                }}
              />
            )
          ) : null}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none bg-black bg-opacity-50 rounded-full p-2"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Navigation buttons */}
          {images && images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button
                  onClick={onPrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none bg-black bg-opacity-50 rounded-full p-2"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}
              {currentIndex < images.length - 1 && (
                <button
                  onClick={onNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none bg-black bg-opacity-50 rounded-full p-2"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;

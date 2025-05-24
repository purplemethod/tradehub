import React, { useContext, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "./context/UserContext";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { firestoreDB } from "./utils/FirebaseConfig";
import {
  createThumbnail,
  blobToDataURL,
  compressImage,
} from "./utils/ImageUtils";
import { useNotification } from "./context/NotificationContext";
import { NotificationContainer } from "./components/NotificationContainer";
import { useTranslation } from "react-i18next";
import type { ImageMetadata, Product } from "../types";
import { useProducts } from "./context/ProductContextDefinition";

declare global {
  interface Window {
    opera?: string;
  }
}

const categories = ["Eletronico", "Livros", "Roupas", "Casa", "Outro"];
const conditions = [
  "Novo Selado",
  "Semi-Novo - Pouco Uso",
  "Usado",
  "Beeeeeem Usado",
];

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  stock?: string;
  category?: string;
  condition?: string;
  images?: string;
}

interface YouTubeVideo {
  url: string;
  videoId: string;
  thumbnailUrl: string;
  type: "youtube";
}

interface ProductImage {
  file: File;
  thumbnailUrl: string;
  fileInfo?: {
    name: string;
    type: string;
    size: string;
    estimatedChunks: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

type MediaItem = ProductImage | YouTubeVideo;

const NewProductPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const { showNotification } = useNotification();
  const { user } = useContext(UserContext)!;
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<Product>({
    id: "",
    name: "",
    description: "",
    price: 0,
    stock: 0,
    category: "",
    condition: "",
    owner: user?.email || "",
    createdAt: Timestamp.now(),
    brand: "",
    weight: "",
    dimensions: "",
    shippingCost: 0,
    freeShipping: false,
    status: "draft",
  });
  const { refreshProducts } = useProducts();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (loading) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 seconds timeout
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  const extractYouTubeId = (url: string): string | null => {
    // Handle YouTube Shorts URLs
    if (url.includes("/shorts/")) {
      const shortsMatch = url.match(/\/shorts\/([^/?]+)/);
      return shortsMatch ? shortsMatch[1] : null;
    }

    // Handle regular YouTube URLs
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getYouTubeThumbnail = async (videoId: string): Promise<string> => {
    const qualities = ["maxresdefault", "hqdefault", "mqdefault", "default"];

    for (const quality of qualities) {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
      try {
        const response = await fetch(thumbnailUrl);
        if (response.ok) {
          return thumbnailUrl;
        }
      } catch (error) {
        console.warn(`Failed to fetch ${quality} thumbnail:`, error);
      }
    }

    // If all qualities fail, return the default thumbnail
    return `https://img.youtube.com/vi/${videoId}/default.jpg`;
  };

  const handleAddYouTubeVideo = async () => {
    try {
      const videoId = extractYouTubeId(youtubeUrl);
      if (!videoId) {
        showNotification("URL YouTube inválida", "error");
        return;
      }

      const thumbnailUrl = await getYouTubeThumbnail(videoId);

      const youtubeVideo: YouTubeVideo = {
        url: youtubeUrl,
        videoId,
        thumbnailUrl,
        type: "youtube",
      };

      setMediaItems((prev) => [...prev, youtubeVideo]);
      setYoutubeUrl("");
      showNotification("YouTube video adicionado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao adicionar o YouTube video:", error);
      showNotification("Erro ao adicionar o YouTube video", "error");
    }
  };

  const removeMediaItem = (indexToRemove: number) => {
    setMediaItems((prev) => prev.filter((_, index) => index !== indexToRemove));
    if ("file" in mediaItems[indexToRemove]) {
      const newFiles = [...selectedFiles];
      newFiles.splice(indexToRemove, 1);
      setSelectedFiles(newFiles);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const calculateEstimatedChunks = (fileSize: number): number => {
    const chunkSize = 4000; // Base64 chunk size
    const base64Size = Math.ceil((fileSize * 4) / 3); // Approximate base64 size
    return Math.ceil(base64Size / chunkSize);
  };

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t("products.validation.nameRequired");
    }

    if (!formData.description.trim()) {
      newErrors.description = t("products.validation.descriptionRequired");
    }

    if (!formData.price) {
      newErrors.price = t("products.validation.priceRequired");
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = t("products.validation.priceInvalid");
    }

    if (!formData.stock) {
      newErrors.stock = t("products.validation.stockRequired");
    } else if (isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      newErrors.stock = t("products.validation.stockInvalid");
    }

    if (!formData.category) {
      newErrors.category = t("products.validation.categoryRequired");
    }

    if (!formData.condition) {
      newErrors.condition = t("products.validation.conditionRequired");
    }

    if (mediaItems.length === 0) {
      newErrors.images = t("products.validation.imageRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const triggerGalleryInput = () => {
    galleryInputRef.current?.click();
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  const handleCameraChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    for (const file of files!) {
      if (!file.type.startsWith("image/")) {
        showNotification("All files must be image type", "error");
        return;
      }
    }
    // Set maximum images to upload
    if (files && files.length > 5) {
      showNotification("You can only upload a maximum of 5 images", "error");
      return;
    }

    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(filesArray);
      const newProductImages: ProductImage[] = [];
      for (const file of filesArray) {
        try {
          const thumbnailBlob = await createThumbnail(file, 200);
          const thumbnailDataUrl = await blobToDataURL(thumbnailBlob);
          const dimensions = await getImageDimensions(file);
          newProductImages.push({
            file,
            thumbnailUrl: thumbnailDataUrl,
            fileInfo: {
              name: file.name,
              type: file.type,
              size: formatFileSize(file.size),
              estimatedChunks: calculateEstimatedChunks(file.size),
              dimensions,
            },
          });
        } catch (error) {
          console.error("Erro ao processar imagem:", error);
        }
      }
      setMediaItems((prev) => [...prev, ...newProductImages]);
    }
  };

  const handleGalleryChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    for (const file of files!) {
      if (!file.type.startsWith("image/")) {
        showNotification("All files must be image type", "error");
        return;
      }
    }

    // Set maximum images to upload
    if (files && files.length > 5) {
      showNotification("You can only upload a maximum of 5 images", "error");
      return;
    }

    if (event.target.files) {
      const filesArray = Array.from(event.target.files);

      setSelectedFiles((prevFiles: File[]) => {
        const prevFilesArray = Array.isArray(prevFiles) ? prevFiles : [];
        return [...prevFilesArray, ...filesArray];
      });
      const newProductImages: ProductImage[] = [];
      for (const file of filesArray) {
        try {
          const thumbnailBlob = await createThumbnail(file, 200);
          const thumbnailDataUrl = await blobToDataURL(thumbnailBlob);
          const dimensions = await getImageDimensions(file);
          newProductImages.push({
            file,
            thumbnailUrl: thumbnailDataUrl,
            fileInfo: {
              name: file.name,
              type: file.type,
              size: formatFileSize(file.size),
              estimatedChunks: calculateEstimatedChunks(file.size),
              dimensions,
            },
          });
        } catch (error) {
          console.error("Erro ao processar imagem:", error);
        }
      }
      setMediaItems((prev) => [...prev, ...newProductImages]);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "price" || name === "stock"
          ? Number(value)
          : value,
    }));
  };

  const isMobile = () => {
    const userAgent =
      navigator.userAgent || navigator.vendor || window.opera || "";
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification(t("products.validation.formErrors"), "error");
      return;
    }

    if (!user) {
      showNotification(t("products.errors.notAuthenticated"), "error");
      return;
    }

    setLoading(true);
    const imagesMetadata: ImageMetadata[] = [];

    try {
      const productRef = doc(collection(firestoreDB, "products"));
      const productId = productRef.id;

      // Process each media item
      for (const item of mediaItems) {
        const imageRef = doc(collection(firestoreDB, "products-images"));
        const imageId = imageRef.id;
        if ("videoId" in item) {
          // Handle YouTube video
          imagesMetadata.push({
            type: "youtube",
            videoId: item.videoId,
            thumbnailDataURL: item.thumbnailUrl,
            fullImageRef: null,
            videoUrl: item.url,
          });
        } else {
          // Handle image
          // Create thumbnail
          const thumbnailBlob = await createThumbnail(item.file, 200);
          const thumbnailDataUrl = await blobToDataURL(thumbnailBlob);

          imagesMetadata.push({
            thumbnailDataURL: thumbnailDataUrl,
            fullImageRef: imageRef.path,
            videoId: null,
            videoUrl: null,
            type: "image",
          });

          // Prepare Image
          // Compress the image before uploading
          const compressedBlob = await compressImage(item.file, 1920, 0.8);
          const compressedDataUrl = await blobToDataURL(compressedBlob);

          const [header, base64Data] = compressedDataUrl.split(",");
          const mimeType = header.split(":")[1].split(";")[0];

          // Split and save chunks
          const chunkSize = 4000;
          const chunks =
            base64Data.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];
          const chunkCount = chunks.length;

          const chunkBatch = writeBatch(firestoreDB);
          chunks.forEach((chunk, chunkIndex) => {
            const chunkDocRef = doc(
              firestoreDB,
              `products-images`,
              imageId,
              `chunks/chunk${chunkIndex}`
            );
            chunkBatch.set(chunkDocRef, { data: chunk });
          });

          await chunkBatch.commit();

          // Save Image
          await setDoc(imageRef, {
            fileName: item.file.name,
            mimeType: mimeType,
            type: item.fileInfo?.type || "",
            size: item.fileInfo?.size || "",
            estimatedChunks: item.fileInfo?.estimatedChunks || 0,
            chunkCount: chunkCount,
            dimensions: item.fileInfo?.dimensions || null,
            createdAt: Timestamp.now(),
            productId: productId,
            userId: user.id,
          });
        }
      }

      // Create the product with the metadata reference
      const productData = {
        ...formData,
        userId: user.id,
        owner: user.email,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        imageMetadataRef: imagesMetadata,
        status: "draft",
      };

      // Save Product
      await setDoc(productRef, productData);

      showNotification(t("products.notifications.createSuccess"), "success");
      await refreshProducts();
      navigate("/my-products", { replace: true });
    } catch (error) {
      console.error("Error creating product:", error);
      showNotification(t("products.notifications.createError"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationContainer />

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {t("products.newProduct.title")}
        </h1>

        {loading && (
          <div className="flex justify-center items-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500">
              <span className="sr-only">
                {loadingTimeout
                  ? t("products.newProduct.loadingTimeout")
                  : t("products.newProduct.loading")}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="productName"
              className="block text-sm font-medium text-gray-700"
            >
              {t("products.newProduct.name")}
            </label>
            <input
              type="text"
              id="productName"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="productDescription"
              className="block text-sm font-medium text-gray-700"
            >
              {t("products.newProduct.description")}
            </label>
            <textarea
              id="productDescription"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="stock"
              className="block text-sm font-medium text-gray-700"
            >
              {t("products.newProduct.stock")}
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              required
              min="0"
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                errors.stock ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.stock && (
              <p className="mt-1 text-sm text-red-600">{errors.stock}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700"
            >
              {t("products.newProduct.price")}
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                errors.price ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              {t("products.newProduct.category")}
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                errors.category ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">{t("products.selectCategory")}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="condition"
              className="block text-sm font-medium text-gray-700"
            >
              {t("products.newProduct.condition")}
            </label>
            <select
              id="condition"
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              required
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                errors.condition ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">{t("products.selectCondition")}</option>
              {conditions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.condition && (
              <p className="mt-1 text-sm text-red-600">{errors.condition}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("products.newProduct.uploadImages")}
            </label>
            <div className={`flex gap-2 mb-4 ${errors.images ? 'border-2 border-red-500 rounded-md p-4' : ''}`}>
              {isMobile() && (
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={triggerCameraInput}
                >
                  {t("products.newProduct.captureFromCamera")}
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={triggerGalleryInput}
              >
                {t("products.newProduct.selectPhotos")}
              </button>
            </div>
            {errors.images && (
              <p className="mt-1 text-sm text-red-600 font-medium">{errors.images}</p>
            )}

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder={t("products.newProduct.youtubeUrlPlaceholder")}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddYouTubeVideo}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t("products.newProduct.addVideo")}
                </button>
              </div>
            </div>

            <input
              id="images"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraChange}
              ref={cameraInputRef}
              className="hidden"
            />
            <input
              id="gallery-images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleGalleryChange}
              ref={galleryInputRef}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("products.newProduct.selectedMedia")}
            </label>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaItems.map((item, index) => (
                <div
                  key={index}
                  className="relative bg-white p-4 rounded-lg border border-gray-300 shadow-sm"
                >
                  <div className="flex items-start space-x-4">
                    <div className="relative w-20 h-20 overflow-hidden rounded-lg border border-gray-300 flex-shrink-0">
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-white rounded-full p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                        onClick={() => removeMediaItem(index)}
                      >
                        <svg
                          className="h-4 w-4"
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
                      <img
                        src={
                          "type" in item ? item.thumbnailUrl : item.thumbnailUrl
                        }
                        alt={`Media Item ${index}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {"type" in item ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {t("products.newProduct.youtubeVideo")}
                          </p>
                          <div className="mt-1 text-sm text-gray-500 space-y-1">
                            <p>
                              {t("products.newProduct.videoId")}: {item.videoId}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.file.name}
                          </p>
                          {item.fileInfo && (
                            <div className="mt-1 text-sm text-gray-500 space-y-1">
                              <p>
                                {t("products.newProduct.type")}:{" "}
                                {item.fileInfo.type}
                              </p>
                              <p>
                                {t("products.newProduct.size")}:{" "}
                                {item.fileInfo.size}
                              </p>
                              <p>
                                {t("products.newProduct.dimensions")}:{" "}
                                {item.fileInfo.dimensions?.width} x{" "}
                                {item.fileInfo.dimensions?.height}{" "}
                                {t("products.newProduct.pixels")}
                              </p>
                              <p>
                                {t("products.newProduct.estimatedChunks")}:{" "}
                                {item.fileInfo.estimatedChunks}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProductPage;

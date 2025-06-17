import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  collection,
  writeBatch,
  setDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { useNotification } from "./context/NotificationContext";
import type { Product, ImageMetadata } from "../types";
import { TrashIcon } from "@heroicons/react/24/outline";
import { firestoreDB } from "./utils/FirebaseConfig";
import { useProducts } from "./context/ProductContextDefinition";
import {
  createThumbnail,
  blobToDataURL,
  compressImage,
} from "./utils/ImageUtils";

const EditProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { products, productsLoading, refreshProducts } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    condition: "",
    brand: "",
    weight: "",
    dimensions: "",
    shippingCost: "",
    freeShipping: false,
    voltage: "",
    customVoltage: "",
    status: "active" as "active" | "inactive" | "draft",
    allowInstallments: false,
    minInstallmentValue: 500,
    maxInstallments: 10,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const extractYoutubeId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleYoutubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);

    if (url) {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        const newMetadata: ImageMetadata = {
          type: "youtube",
          thumbnailDataURL: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          fullImageRef: null,
          videoId: videoId,
          videoUrl: url,
        };

        const filteredMetadata =
          product?.imageMetadataRef?.filter((img) => img.type !== "youtube") ||
          [];

        if (product) {
          setProduct({
            ...product,
            imageMetadataRef: [...filteredMetadata, newMetadata],
          });
        }
      } else {
        showNotification(t("products.errors.invalidYoutubeUrl"), "error");
      }
    }
  };

  const handleRemoveYoutubeVideo = () => {
    if (product) {
      const filteredMetadata =
        product.imageMetadataRef?.filter((img) => img.type !== "youtube") || [];
      setProduct({
        ...product,
        imageMetadataRef: filteredMetadata,
      });
      setYoutubeUrl("");
    }
  };

  useEffect(() => {
    if (!productId || productsLoading) return;

    const foundProduct = products.find((p) => p.id === productId);
    console.log("foundProduct", foundProduct);

    if (foundProduct) {
      const productData: Product = {
        ...foundProduct,
        imageMetadataRef:
          foundProduct.imageMetadataRef?.map((img) => ({
            type: img.type,
            thumbnailDataURL: img.thumbnailDataURL || "",
            fullImageRef: img.fullImageRef || null,
            videoId: img.videoId || null,
            videoUrl: img.videoUrl || null,
          })) || [],
      };
      setProduct(productData);

      const videoMetadata = foundProduct.imageMetadataRef?.find(
        (img) => img.type === "youtube"
      );
      if (videoMetadata?.videoUrl) {
        setYoutubeUrl(videoMetadata.videoUrl);
      }

      setFormData({
        name: foundProduct.name,
        description: foundProduct.description,
        price: foundProduct.price.toString(),
        stock: foundProduct.stock.toString(),
        category: foundProduct.category,
        condition: foundProduct.condition,
        brand: foundProduct.brand || "",
        weight: foundProduct.weight || "",
        dimensions: foundProduct.dimensions || "",
        shippingCost: foundProduct.shippingCost?.toString() || "0",
        freeShipping: foundProduct.freeShipping || false,
        voltage: ['110V', '220V', 'Bivolt'].includes(foundProduct.voltage || '') ? (foundProduct.voltage || '') : 'Other',
        customVoltage: ['110V', '220V', 'Bivolt'].includes(foundProduct.voltage || '') ? '' : (foundProduct.voltage || ''),
        status: foundProduct.status || "active",
        allowInstallments: foundProduct.allowInstallments || false,
        minInstallmentValue: foundProduct.minInstallmentValue || 500,
        maxInstallments: foundProduct.maxInstallments || 10,
      });
      setPreviewUrls(
        foundProduct.imageMetadataRef
          ?.filter((img) => img.type === "image")
          .map((img) => img.thumbnailDataURL || "") || []
      );
      setIsLoading(false);
    } else {
      showNotification(t("products.errors.productNotFound"), "error");
      navigate("/my-products");
    }
  }, [productId, products, productsLoading, navigate, showNotification, t]);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      // Check if adding these images would exceed the limit
      const totalImages = (product?.imageMetadataRef?.length || 0) + imageItems.length;
      if (totalImages > 5) {
        showNotification(t("products.maxImages"), "error");
        return;
      }

      const newFiles: File[] = [];
      const newPreviewUrls: string[] = [];

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;

        try {
          const thumbnailBlob = await createThumbnail(file, 200);
          const thumbnailDataUrl = await blobToDataURL(thumbnailBlob);
          
          newFiles.push(file);
          newPreviewUrls.push(thumbnailDataUrl);
        } catch (error) {
          console.error("Error processing pasted image:", error);
          showNotification(t("products.errors.imageProcessingFailed"), "error");
        }
      }

      if (newFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...newFiles]);
        setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        showNotification(t("products.notifications.imagesPasted"), "success");
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [product?.imageMetadataRef?.length, showNotification, t]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t("products.validation.nameRequired");
    }

    if (!formData.description.trim()) {
      newErrors.description = t("products.validation.descriptionRequired");
    }

    if (
      !formData.price ||
      isNaN(Number(formData.price)) ||
      Number(formData.price) <= 0
    ) {
      newErrors.price = t("products.validation.priceInvalid");
    }

    if (
      !formData.stock ||
      isNaN(Number(formData.stock)) ||
      Number(formData.stock) < 0
    ) {
      newErrors.stock = t("products.validation.stockInvalid");
    }

    if (!formData.category) {
      newErrors.category = t("products.validation.categoryRequired");
    }

    if (!formData.condition) {
      newErrors.condition = t("products.validation.conditionRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = (product?.imageMetadataRef?.length || 0) + files.length;

    if (totalImages > 5) {
      showNotification(t("products.maxImages"), "error");
      return;
    }

    // Ensure we have valid File objects
    const validFiles = files.filter(file => file instanceof File);
    if (validFiles.length !== files.length) {
      showNotification(t("products.errors.invalidFiles"), "error");
      return;
    }

    setSelectedFiles(validFiles);

    // Create preview URLs
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const handleRemoveImage = async (index: number) => {
    try {
      // Get the image metadata to remove
      const imageMeta = product?.imageMetadataRef?.[index];
      // Remove from state
      const newMetadata = [...(product?.imageMetadataRef || [])];
      newMetadata.splice(index, 1);

      if (product) {
        setProduct({
          ...product,
          imageMetadataRef: newMetadata,
        });
      }

      setPreviewUrls((prev) => {
        const newUrls = [...prev];
        newUrls.splice(index, 1);
        return newUrls;
      });

      // Delete from Firestore if fullImageRef exists
      if (imageMeta?.fullImageRef) {
        // Delete all chunks in subcollection
        const chunksCol = collection(firestoreDB, `${imageMeta.fullImageRef}/chunks`);
        const chunksSnap = await getDocs(chunksCol);
        const deleteChunkPromises = chunksSnap.docs.map((chunkDoc) => deleteDoc(chunkDoc.ref));
        await Promise.all(deleteChunkPromises);
        // Delete the image document itself
        const imageDoc = doc(firestoreDB, imageMeta.fullImageRef);
        await deleteDoc(imageDoc);
      }

      showNotification(t("products.removeImage"), "success");
    } catch (error) {
      console.error("Error removing image:", error);
      showNotification(t("products.errors.removeImageFailed"), "error");
    }
  };

  const processImages = async (): Promise<ImageMetadata[]> => {
    const newMetadata: ImageMetadata[] = [];
    let totalProgress = 0;
    const totalImages = selectedFiles.length;

    for (const file of selectedFiles) {
      try {
        // Create thumbnail
        const thumbnailBlob = await createThumbnail(file, 200);
        const thumbnailDataUrl = await blobToDataURL(thumbnailBlob);

        // Create image reference
        const imageRef = doc(collection(firestoreDB, "products-images"));
        const imageId = imageRef.id;

        // Compress the image before uploading
        const compressedBlob = await compressImage(file, 1920, 0.8);
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

        // Save Image metadata
        await setDoc(imageRef, {
          fileName: file.name,
          mimeType: mimeType,
          type: file.type,
          size: file.size,
          chunkCount: chunkCount,
          createdAt: new Date(),
          productId: productId,
        });

        newMetadata.push({
          type: "image",
          thumbnailDataURL: thumbnailDataUrl,
          fullImageRef: imageRef.path,
          videoId: null,
          videoUrl: null,
        });

        // Update progress
        totalProgress += 1;
        setUploadProgress((totalProgress / totalImages) * 100);
      } catch (error) {
        console.error("Error processing image:", error);
        throw error;
      }
    }

    return newMetadata;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification(t("products.validation.formErrors"), "error");
      return;
    }

    try {
      setIsSaving(true);
      setUploadProgress(0);

      let newImageMetadata: ImageMetadata[] = [
        ...(product?.imageMetadataRef || []),
      ];

      if (selectedFiles.length > 0) {
        const processedMetadata = await processImages();
        newImageMetadata = [...newImageMetadata, ...processedMetadata];
      }

      // Ensure all fields are properly formatted for Firestore
      const updatedProduct = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        stock: Number(formData.stock),
        category: formData.category,
        condition: formData.condition,
        brand: formData.brand || "",
        weight: formData.weight || "",
        dimensions: formData.dimensions || "",
        shippingCost: Number(formData.shippingCost) || 0,
        freeShipping: Boolean(formData.freeShipping),
        voltage: formData.voltage === 'Other' ? formData.customVoltage : formData.voltage,
        status: formData.status,
        imageMetadataRef: newImageMetadata.map((img) => ({
          type: img.type,
          thumbnailDataURL: img.thumbnailDataURL || "",
          fullImageRef: img.fullImageRef || null,
          videoId: img.videoId || null,
          videoUrl: img.videoUrl || null,
        })),
        updatedAt: new Date(),
        allowInstallments: Boolean(formData.allowInstallments),
        minInstallmentValue: Number(formData.minInstallmentValue) || 500,
        maxInstallments: Number(formData.maxInstallments) || 10,
      };

      console.log("Before saving product:", updatedProduct);
      const productRef = doc(firestoreDB, "products", productId!);
      await updateDoc(productRef, updatedProduct);

      // Reload the products context
      await refreshProducts();

      showNotification(t("products.notifications.updateSuccess"), "success");
      navigate("/my-products", { replace: true });
    } catch (error) {
      console.error("Error updating product:", error);
      showNotification(t("products.notifications.updateError"), "error");
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add a semi-transparent class to the dragged item
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedIndex(null);
    // Remove the semi-transparent class
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    // Create new arrays with the reordered items
    const newPreviewUrls = [...previewUrls];
    const newSelectedFiles = [...selectedFiles];
    
    // Remove the dragged item
    const [draggedUrl] = newPreviewUrls.splice(draggedIndex, 1);
    const [draggedFile] = newSelectedFiles.splice(draggedIndex, 1);
    
    // For existing images, we don't have File objects, so we skip the File validation
    // Only validate File objects for newly added images
    if (draggedFile && draggedFile instanceof File && !draggedFile.type.startsWith('image/')) {
      showNotification(t("products.errors.invalidFile"), "error");
      return;
    }
    
    // Insert the dragged item at the target position
    newPreviewUrls.splice(targetIndex, 0, draggedUrl);
    if (draggedFile) {
      newSelectedFiles.splice(targetIndex, 0, draggedFile);
    }
    
    // Update the state
    setPreviewUrls(newPreviewUrls);
    setSelectedFiles(newSelectedFiles);

    // Update the product's imageMetadataRef array to reflect the new order
    if (product && product.imageMetadataRef) {
      const newImageMetadataRef = [...product.imageMetadataRef];
      const [movedMetadata] = newImageMetadataRef.splice(draggedIndex, 1);
      newImageMetadataRef.splice(targetIndex, 0, movedMetadata);
      
      setProduct({
        ...product,
        imageMetadataRef: newImageMetadataRef
      });
    }

    // Revoke the old object URL to prevent memory leaks
    if (draggedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(draggedUrl);
    }
  };

  // Add cleanup for object URLs when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup object URLs when component unmounts
      previewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  // Add validation for selectedFiles
  useEffect(() => {
    const validFiles = selectedFiles.filter(file => file instanceof File);
    if (validFiles.length !== selectedFiles.length) {
      setSelectedFiles(validFiles);
      showNotification(t("products.errors.invalidFiles"), "error");
    }
  }, [selectedFiles, showNotification, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{t("products.editProduct")}</h1>

      {isSaving && uploadProgress > 0 && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {t("products.uploadingImages")} ({Math.round(uploadProgress)}%)
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("products.management.basicInfo")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.name")}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.name ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.category")}
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.category ? "border-red-300" : "border-gray-300"
                }`}
              >
                <option value="">{t("products.selectCategory")}</option>
                <option value="electronics">{t("products.categories.electronics")}</option>
                <option value="clothing">{t("products.categories.clothing")}</option>
                <option value="books">{t("products.categories.books")}</option>
                <option value="home">{t("products.categories.home")}</option>
                <option value="sports">{t("products.categories.sports")}</option>
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
                {t("products.condition")}
              </label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.condition ? "border-red-300" : "border-gray-300"
                }`}
              >
                <option value="">{t("products.selectCondition")}</option>
                <option value="new_sealed">{t("products.conditions.new_sealed")}</option>
                <option value="new">{t("products.conditions.new")}</option>
                <option value="like_new">{t("products.conditions.like_new")}</option>
                <option value="good">{t("products.conditions.good")}</option>
                <option value="fair">{t("products.conditions.fair")}</option>
                <option value="poor">{t("products.conditions.poor")}</option>
              </select>
              {errors.condition && (
                <p className="mt-1 text-sm text-red-600">{errors.condition}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="brand"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.brand")}
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md shadow-sm border-gray-300"
              />
            </div>

            <div>
              <label
                htmlFor="voltage"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.newProduct.voltage")}
              </label>
              <div className="mt-1 flex flex-col gap-2">
                {['110V', '220V', 'Bivolt', 'Other'].map((option) => (
                  <label key={option} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="voltage"
                      value={option}
                      checked={formData.voltage === option}
                      onChange={handleInputChange}
                      className="form-radio text-blue-600"
                    />
                    <span className="ml-2">{option}</span>
                  </label>
                ))}
                {formData.voltage === 'Other' && (
                  <input
                    type="text"
                    name="customVoltage"
                    value={formData.customVoltage}
                    onChange={handleInputChange}
                    placeholder="Enter custom voltage"
                    className="mt-1 block w-full rounded-md shadow-sm border-gray-300"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              {t("products.description")}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                errors.description ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Pricing and Inventory */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("products.management.pricing")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.management.price")}
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.price ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="stock"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.management.stock")}
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                min="0"
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.stock ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.stock && (
                <p className="mt-1 text-sm text-red-600">{errors.stock}</p>
              )}
            </div>
          </div>
        </div>

        {/* Shipping Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("products.management.shipping")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="weight"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.management.weight")}
              </label>
              <input
                type="text"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="e.g., 1.5 kg"
                className="mt-1 block w-full rounded-md shadow-sm border-gray-300"
              />
            </div>

            <div>
              <label
                htmlFor="dimensions"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.management.dimensions")}
              </label>
              <input
                type="text"
                id="dimensions"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleInputChange}
                placeholder="e.g., 10x20x30 cm"
                className="mt-1 block w-full rounded-md shadow-sm border-gray-300"
              />
            </div>

            <div>
              <label
                htmlFor="shippingCost"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.management.shippingCost")}
              </label>
              <input
                type="number"
                id="shippingCost"
                name="shippingCost"
                value={formData.shippingCost}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md shadow-sm border-gray-300"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="freeShipping"
                name="freeShipping"
                checked={formData.freeShipping}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="freeShipping"
                className="ml-2 block text-sm text-gray-700"
              >
                {t("products.management.freeShipping")}
              </label>
            </div>
          </div>
        </div>

        {/* Images and Video */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("products.management.images")}
          </h2>

          {/* Current Images */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {t("products.currentImages")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {previewUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative group cursor-move"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <img
                    src={url}
                    alt={t("products.imageAlt", { number: index + 1 })}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Images */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("products.addImages")}
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>{t("products.uploadFile")}</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">{t("products.orDragAndDrop")}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {t("products.imageTypes")}
                </p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    document.body.focus();
                    showNotification(t("products.notifications.pasteImage"), "info");
                  }}
                >
                  {t("products.newProduct.pasteImage")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add YouTube Video Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("products.newProduct.youtubeVideo")}
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="youtubeUrl"
                className="block text-sm font-medium text-gray-700"
              >
                {t("products.newProduct.youtubeUrlPlaceholder")}
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={handleYoutubeUrlChange}
                  placeholder={t("products.newProduct.youtubeUrlPlaceholder")}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {youtubeUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveYoutubeVideo}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    {t("products.removeVideo")}
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {t("products.youtubeUrlHelp")}
              </p>
            </div>

            {/* Video Preview */}
            {product?.imageMetadataRef && product.imageMetadataRef.find((img) => img?.type === "youtube")?.videoId && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {t("products.videoPreview")}
                </h3>
                <div className="aspect-w-16 aspect-h-9">
                  <iframe
                    src={`https://www.youtube.com/embed/${
                      product.imageMetadataRef.find(
                        (img) => img?.type === "youtube"
                      )?.videoId
                    }?autoplay=0&rel=0&modestbranding=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full rounded-lg"
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("products.management.status")}
          </h2>
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              {t("products.management.status")}
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md shadow-sm border-gray-300"
            >
              <option value="active">{t("products.statusActive")}</option>
              <option value="inactive">{t("products.statusInactive")}</option>
              <option value="draft">{t("products.statusDraft")}</option>
            </select>
          </div>
        </div>

        {/* Installments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("checkout.installments")}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowInstallments"
                name="allowInstallments"
                checked={formData.allowInstallments}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="allowInstallments"
                className="ml-2 block text-sm text-gray-700"
              >
                {t("checkout.installmentsInfo")}
              </label>
            </div>
            {formData.allowInstallments && (
              <div className="mt-2 text-sm text-gray-500">
                <p>{t("checkout.minInstallmentValue")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSaving ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                {t("common.saving")}
              </div>
            ) : (
              t("common.saveChanges")
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;

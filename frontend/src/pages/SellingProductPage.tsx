import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "./context/UserContext";
import { useNotification } from "./context/NotificationContext";
import { useTranslation } from "react-i18next";
import { useProducts } from "./context/ProductContextDefinition";
import type { Product } from "../types";
import { useBasket } from "./context/BasketContext";
import { useFavorites } from "./context/FavoritesContext";
import ImageModal from "./components/ImageModal";

const SellingProductPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { products, productsLoading, refreshProducts } = useProducts();
  const userContext = useContext(UserContext);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImageIndices, setProductImageIndices] = useState<
    Record<string, number>
  >({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageThumbnail, setSelectedImageThumbnail] = useState<
    string | null
  >(null);
  const { addToBasket, getBasketItem } = useBasket();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();

  useEffect(() => {
    // Wait for user context to finish loading
    if (!userContext) {
      return;
    }

    const { user, userLoading } = userContext;

    if (userLoading) {
      return;
    }

    // Only redirect if user context is done loading and there's no user
    if (!userLoading && !user) {
      navigate("/login");
      return;
    }

    if (productsLoading) {
      return;
    }

    // Initialize image indices for all products
    const initialIndices = products.reduce(
      (acc, product) => ({
        ...acc,
        [product.id]: 0,
      }),
      {}
    );
    refreshProducts();
    setLoading(false);
    setProductImageIndices(initialIndices);
    setSelectedProduct(null);
    setSelectedImage(null);
    setIsModalOpen(false);
  }, [userContext, productsLoading,refreshProducts, products, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleImageClick = async (product: Product, index: number) => {
    try {
      setSelectedProduct(product);
      setProductImageIndices((prev) => ({ ...prev, [product.id]: index }));

      const imageMetadataRef = product.imageMetadataRef?.[index];
      if (!imageMetadataRef) {
        console.error("No image metadata found for index:", index);
        return;
      }

      // Handle YouTube videos
      if (imageMetadataRef.type === "youtube") {
        setSelectedImage(imageMetadataRef.videoUrl || null);
      } else {
        setSelectedImage(imageMetadataRef.fullImageRef || null);
      }

      setIsModalOpen(true);
    } catch (error) {
      console.error("Error handling image click:", error);
      showNotification("Failed to load image", "error");
    }
  };

  const handleCreate = () => {
    navigate("/new-product");
  };

  const handleNextImage = async (product: Product) => {
    if (!product) return;
    const currentIndex = productImageIndices[product.id] || 0;
    const totalImages = product.imageMetadataRef?.length || 0;

    if (currentIndex >= totalImages - 1) return;

    const nextIndex = currentIndex + 1;
    const mediaItem = product.imageMetadataRef?.[nextIndex];
    if (!mediaItem) return;

    setProductImageIndices((prev) => ({ ...prev, [product.id]: nextIndex }));
    setSelectedImageThumbnail(mediaItem.thumbnailDataURL || null);

    // Update selected image for modal
    if (mediaItem.type === "youtube") {
      setSelectedImage(mediaItem.videoUrl || null);
    } else {
      setSelectedImage(mediaItem.fullImageRef || null);
    }
  };

  const handlePrevImage = (product: Product) => {
    if (!product) return;
    const currentIndex = productImageIndices[product.id] || 0;
    if (currentIndex <= 0) return;

    const prevIndex = currentIndex - 1;
    const mediaItem = product.imageMetadataRef?.[prevIndex];
    if (!mediaItem) return;

    setProductImageIndices((prev) => ({ ...prev, [product.id]: prevIndex }));
    setSelectedImageThumbnail(mediaItem.thumbnailDataURL || null);

    // Update selected image for modal
    if (mediaItem.type === "youtube") {
      setSelectedImage(mediaItem.videoUrl || null);
    } else {
      setSelectedImage(mediaItem.fullImageRef || null);
    }
  };

  const handleAddToCart = async (product: Product) => {
    // Check if product has stock
    if (product.stock <= 0) {
      showNotification(t("products.errors.outOfStock"), "error");
      return;
    }

    // Get current quantity in basket
    const basketItem = await getBasketItem(product.id);
    if (basketItem && basketItem.stock >= product.stock) {
      showNotification(t("products.errors.maxStockReached"), "error");
      return;
    }

    const result = await addToBasket(product);
    if (result.success) {
      showNotification(t("products.addedToCart"), "success");
    } else {
      showNotification(result.reason || t("products.addToCartError"), "error");
    }
  };

  const handleAddToFavorites = async (product: Product) => {
    try {
      if (isFavorite(product.id)) {
        await removeFromFavorites(product.id);
      } else {
        await addToFavorites(product.id);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showNotification(t("favorites.errors.toggleFailed"), "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          {t("products.sellingProducts")}
        </h1>
        {/* <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {t("products.addNew")}
        </button> */}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">{t("products.noMyProducts")}</p>
          <button
            onClick={handleCreate}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {t("products.sell")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const images = product.imageMetadataRef?.length
              ? product.imageMetadataRef
              : [];

            const hasMultipleImages = images.length > 1;

            return (
              <div
                key={product.id}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <div className="relative h-48">
                  <img
                    src={
                      images[productImageIndices[product.id] || 0]
                        ?.thumbnailDataURL ||
                      selectedImageThumbnail ||
                      undefined
                    }
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onClick={() =>
                      handleImageClick(
                        product,
                        productImageIndices[product.id] || 0
                      )
                    }
                    onError={(e) => {
                      e.currentTarget.src = "Failed to load image";
                    }}
                  />
                  {images[productImageIndices[product.id] || 0]?.type ===
                    "youtube" && (
                    <div
                      onClick={() =>
                        handleImageClick(
                          product,
                          productImageIndices[product.id]
                        )
                      }
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-16 h-16 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={() => handlePrevImage(product)}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleNextImage(product)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                        {images.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === (productImageIndices[product.id] || 0)
                                ? "bg-gray bg-opacity-50"
                                : "bg-white"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.status === "active"
                          ? "bg-green-100 text-green-800"
                          : product.status === "inactive"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {t(`products.management.${product.status}`)}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3
                    className="text-lg font-medium text-gray-900 truncate cursor-pointer hover:text-indigo-600"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-medium text-gray-900">
                      {t("products.currency")}
                      {product.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {t("products.management.stock")}: {product.stock}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {product.condition}
                  </p>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => handleAddToFavorites(product)}
                      className={`p-2 rounded-full ${
                        isFavorite(product.id)
                          ? "bg-red-600 hover:bg-red-500"
                          : "bg-purple-600 hover:bg-purple-500"
                      } text-white focus:outline-none focus:bg-purple-500 group`}
                      title={isFavorite(product.id) ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 group-hover:opacity-70"
                        fill={isFavorite(product.id) ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 focus:outline-none focus:bg-blue-500 group"
                      title="Add to Cart"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 group-hover:opacity-50 opacity-70"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedImage && (
        <ImageModal
          isOpen={isModalOpen}
          thumbnailDataURL={selectedImage ?? undefined}
          fullImageRef={
            selectedProduct?.imageMetadataRef?.[
              productImageIndices[selectedProduct?.id ?? ""] || 0
            ]?.fullImageRef ?? undefined
          }
          onClose={handleCloseModal}
          images={
            selectedProduct?.imageMetadataRef
              ?.map((img) => img.fullImageRef)
              ?.filter((ref): ref is string => !!ref) ?? []
          }
          currentIndex={productImageIndices[selectedProduct?.id ?? ""] || 0}
          onNext={() => selectedProduct && handleNextImage(selectedProduct)}
          onPrevious={() => selectedProduct && handlePrevImage(selectedProduct)}
          type={
            selectedProduct?.imageMetadataRef?.[
              productImageIndices[selectedProduct?.id ?? ""] || 0
            ]?.type ?? undefined
          }
          videoId={
            selectedProduct?.imageMetadataRef?.[
              productImageIndices[selectedProduct?.id ?? ""] || 0
            ]?.videoId ?? undefined
          }
        />
      )}
    </div>
  );
};

export default SellingProductPage;

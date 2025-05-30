import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import UserContext from "./context/UserContext";
import { firestoreDB } from "./utils/FirebaseConfig";
import { useNotification } from "./context/NotificationContext";
import { useTranslation } from "react-i18next";
import { useProducts } from "./context/ProductContextDefinition";
import ImageModal from "./components/ImageModal";
import type { Product } from "../types";
import { canManageAllProducts } from "../utils/permissions";
import { UserRole } from "../types";

const MyProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { products, productsLoading, error, refreshProducts } = useProducts();
  const userContext = useContext(UserContext);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [myProducts, setMyProducts] = useState<Product[] | []>([]);
  const [productImageIndices, setProductImageIndices] = useState<
    Record<string, number>
  >({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleImageClick = async (product: Product, index: number) => {
    try {
      setSelectedProduct(product);
      setProductImageIndices((prev) => ({ ...prev, [product.id]: index }));
      if (!product.imageMetadataRef) {
        console.error("No image metadata reference found for product");
        return;
      }
      const imageMetadataRef = product.imageMetadataRef[index];
      if (!imageMetadataRef) {
        console.error("No image metadata found for index:", index);
        return;
      }
      // Handle YouTube videos
      if (imageMetadataRef.type === "youtube") {
        if (!imageMetadataRef.videoUrl) {
          console.error("No video reference found for YouTube video");
          return;
        }
        setSelectedImage(imageMetadataRef.videoUrl);
        setIsModalOpen(true);
        return;
      } else {
        if (!imageMetadataRef.fullImageRef) {
          console.error("No full image reference found");
          return;
        }
        setSelectedImage(imageMetadataRef.fullImageRef);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error handling image click:", error);
      setIsModalOpen(false);
      setSelectedProduct(null);
      setProductImageIndices({});
      setSelectedImage(null);
    }
  };

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
      navigate("/login", { replace: true });
      return;
    }
    if (productsLoading) {
      return;
    }
    if (!productsLoading && products && products.length > 0) {
      setLoading(false);
      // Show all products for admin, only owned products for others
      setMyProducts(
        canManageAllProducts(user?.role ?? UserRole.BUYER)
          ? products
          : products.filter((product) => product.userId === user?.id)
      );
    }
    if (error) {
      console.error("Error fetching products:", error);
      showNotification(t("products.fetchError"), "error");
    }

    // Initialize image indices for all products
    const initialIndices = products.reduce(
      (acc, product) => ({
        ...acc,
        [product.id]: 0,
      }),
      {}
    );
    setLoading(false);
    setProductImageIndices(initialIndices);
    setSelectedProduct(null);
    setSelectedImage(null);
    setIsModalOpen(false);
  }, [
    error,
    navigate,
    products,
    productsLoading,
    showNotification,
    t,
    userContext,
  ]);

  const deleteCollection = async (collectionPath: string) => {
    try {
      // First, get the document to check if it exists
      const docRef = doc(firestoreDB, collectionPath);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Delete the chunks subcollection first
        const chunksCollectionRef = collection(
          firestoreDB,
          `${collectionPath}/chunks`
        );
        const chunksSnapshot = await getDocs(chunksCollectionRef);

        // Delete all chunks
        const chunkDeletePromises = chunksSnapshot.docs.map((chunkDoc) =>
          deleteDoc(chunkDoc.ref)
        );
        await Promise.all(chunkDeletePromises);

        // Finally delete the main document
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error(`Error deleting collection at ${collectionPath}:`, error);
      throw error;
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t("products.deleteConfirmation"))) return;

    try {
      setLoading(true);

      // Get the product document to access image metadata
      const productRef = doc(firestoreDB, "products", productId);
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        throw new Error("Product not found");
      }

      const productData = productDoc.data();

      // Delete all associated questions
      const questionsRef = collection(firestoreDB, "products-questions");
      const q = query(questionsRef, where("productId", "==", productId));
      const questionsSnapshot = await getDocs(q);

      // Delete all questions
      const questionDeletePromises = questionsSnapshot.docs.map((questionDoc) =>
        deleteDoc(questionDoc.ref)
      );
      await Promise.all(questionDeletePromises);

      // Delete all associated favorites
      const favoritesRef = collection(firestoreDB, "favorites");
      const favoritesQuery = query(favoritesRef, where("productId", "==", productId));
      const favoritesSnapshot = await getDocs(favoritesQuery);

      // Delete all favorites
      const favoritesDeletePromises = favoritesSnapshot.docs.map((favoriteDoc) =>
        deleteDoc(favoriteDoc.ref)
      );
      await Promise.all(favoritesDeletePromises);

      // Delete all associated media
      for (const mediaItem of productData.imageMetadataRef) {
        if (mediaItem.fullImageRef) {
          await deleteCollection(mediaItem.fullImageRef);
        }
      }
      // Delete the metadata document
      await deleteDoc(productRef);
      setLoading(false);

      await refreshProducts();
      showNotification(t("products.deleteSuccess"), "success");
    } catch (error) {
      console.error("Error deleting product:", error);
      showNotification(t("products.deleteError"), "error");
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  const handleEdit = (productId: string) => {
    navigate(`/edit-product/${productId}`);
  };

  const handleCreate = () => {
    navigate("/new-product");
  };

  const handleNextImage = (product: Product) => {
    if (!product) return;
    const currentIndex = productImageIndices[product.id] || 0;
    const totalImages = product.imageMetadataRef?.length || 0;
    if (currentIndex >= totalImages - 1) return;
    const nextIndex = currentIndex + 1;
    setProductImageIndices((prev) => ({ ...prev, [product.id]: nextIndex }));
  };

  const handlePrevImage = (product: Product) => {
    if (!product) return;
    const currentIndex = productImageIndices[product.id] || 0;
    if (currentIndex <= 0) return;
    const prevIndex = currentIndex - 1;
    setProductImageIndices((prev) => ({ ...prev, [product.id]: prevIndex }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          {t("products.myProducts")}
        </h1>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {t("products.addNew")}
          </button>
      </div>

      {myProducts.length === 0 ? (
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
          {myProducts.map((product) => {
            const images = product.imageMetadataRef?.length
              ? product.imageMetadataRef
              : [];

            const currentImageIndex = productImageIndices[product.id] || 0;
            const currentImage = images[currentImageIndex];

            return (
              <div
                key={product.id}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <div className="relative h-48">
                  <img
                    src={currentImage?.thumbnailDataURL || "/no-image.svg"}
                    alt={product.name}
                    className="w-full h-full object-center object-contain bg-gray-100 cursor-pointer"
                    onClick={() =>
                      images.length > 0 &&
                      handleImageClick(product, currentImageIndex)
                    }
                    onError={(e) => {
                      e.currentTarget.src = "/no-image.svg";
                    }}
                  />
                  {images.length > 1 && (
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
                        {images.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full cursor-pointer ${
                              idx === (productImageIndices[product.id] || 0)
                                ? "bg-gray-800"
                                : "bg-gray-300"
                            }`}
                            onClick={() =>
                              setProductImageIndices((prev) => ({ ...prev, [product.id]: idx }))
                            }
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
                  <h3 className="text-lg font-medium text-gray-900 truncate">
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
                  {canManageAllProducts(userContext?.user?.role ?? UserRole.BUYER) && (
                    <div className="mt-2 text-sm text-gray-500">
                      {t("products.owner")}: {product.owner}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(product.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={deletingId === product.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {deletingId === product.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        t("common.delete")
                      )}
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

export default MyProductsPage;

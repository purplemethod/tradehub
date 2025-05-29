import React, { useState, useEffect, useContext, useCallback } from "react";
import { collection, getDocsFromServer } from "firebase/firestore";
import { firestoreDB } from "../utils/FirebaseConfig";
import { ProductContext } from "./ProductContextDefinition";
import type { ProductContextProps } from "./ProductContextDefinition";
import type { Product } from "../../types";
import UserContext from "./UserContext";
import { useTranslation } from "react-i18next";

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userContext = useContext(UserContext);
  const { t } = useTranslation();

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      setError(null);

      // Use getDocsFromServer to force a fresh fetch from Firestore
      const productsSnapshot = await getDocsFromServer(
        collection(firestoreDB, "products")
      );
      const productsList: Product[] = [];

      for (const docSnapshot of productsSnapshot.docs) {
        try {
          const productData = docSnapshot.data() as Product;

          // Validate required fields before creating product object
          if (!productData.name || !productData.price) {
            console.warn(
              `Skipping product ${docSnapshot.id} due to missing required fields`
            );
            continue;
          }

          const product: Product = {
            id: docSnapshot.id,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            category: productData.category,
            condition: productData.condition,
            stock: productData.stock,
            owner: productData.owner,
            createdAt: productData.createdAt,
            imageMetadataRef: productData.imageMetadataRef,
            userId: productData.userId,
            updatedAt: productData.updatedAt,
            brand: productData.brand,
            weight: productData.weight,
            dimensions: productData.dimensions,
            shippingCost: productData.shippingCost,
            freeShipping: productData.freeShipping,
            status: productData.status,
            allowInstallments: productData.allowInstallments || false,
            maxInstallments: productData.maxInstallments || 1,
            minInstallmentValue: productData.minInstallmentValue || 500,
            voltage: productData.voltage || undefined,
          };

          productsList.push(product);
        } catch (docError) {
          console.error(
            `Error processing document ${docSnapshot.id}:`,
            docError
          );
          continue;
        }
      }
      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(t("products.errors.fetchFailed"));
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [t]); // Only depend on t since it's used in the error message

  useEffect(() => {
    if (userContext?.userLoading) {
      return;
    }

    if (!userContext?.user) {
      setProductsLoading(false);
      setProducts([]);
      setError(t("auth.notifications.mustLogin"));
      return;
    }

    fetchProducts();
  }, [userContext?.user, userContext?.userLoading, fetchProducts, t]);

  const value: ProductContextProps = {
    products,
    productsLoading,
    error,
    refreshProducts: fetchProducts,
  };

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
};

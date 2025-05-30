import React, { createContext, useContext, useState, useEffect } from "react";
import type { Product } from "../../types";
import { useTranslation } from "react-i18next";
import UserContext from "./UserContext";

interface BasketContextType {
  basketItems: Array<{ product: Product; stock: number }>;
  basketCount: number;
  addToBasket: (
    product: Product
  ) => Promise<{ success: boolean; reason?: string }>;
  updateStock: (
    productId: string,
    stock: number
  ) => { success: boolean; reason?: string };
  removeFromBasket: (productId: string) => void;
  clearBasket: () => void;
  getBasketItem: (
    productId: string
  ) => Promise<{ product: Product; stock: number } | null>;
}

export const BasketContext = createContext<BasketContextType | undefined>(
  undefined
);

const BASE_STORAGE_KEY = "tradehub_basket";

// Helper function to safely parse JSON
const safeJSONParse = (
  data: string | null
): Array<{ product: Product; stock: number }> | null => {
  try {
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
};

export const BasketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const { user } = useContext(UserContext)!;
  const [basketItems, setBasketItems] = useState<
    Array<{ product: Product; stock: number }>
  >([]);

  // Load basket when user changes
  useEffect(() => {
    if (!user?.email) {
      setBasketItems([]);
      return;
    }

    const storageKey = `${BASE_STORAGE_KEY}_${user.email}`;
    const savedBasket = localStorage.getItem(storageKey);
    const parsedBasket = safeJSONParse(savedBasket);
    setBasketItems(Array.isArray(parsedBasket) ? parsedBasket : []);
  }, [user]);

  // Save basket to localStorage whenever it changes
  useEffect(() => {
    if (!user?.email) return;

    try {
      const storageKey = `${BASE_STORAGE_KEY}_${user.email}`;
      const basketData = JSON.stringify(basketItems);
      localStorage.setItem(storageKey, basketData);
    } catch (error) {
      console.error("Error saving basket to localStorage:", error);
    }
  }, [basketItems, user]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    if (!user?.email) return;

    const storageKey = `${BASE_STORAGE_KEY}_${user.email}`;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const newBasket = safeJSONParse(e.newValue);
        if (Array.isArray(newBasket)) {
          setBasketItems(newBasket);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user]);

  const basketCount = basketItems.reduce(
    (total, item) => total + item.stock,
    0
  );

  const addToBasket = async (product: Product) => {
    try {
      // Validate product has stock
      if (!product.stock || product.stock <= 0) {
        return { success: false, reason: t("products.errors.outOfStock") };
      }

      // Validate product doesn't belong to the current user
      // if (product.owner === user?.email) {
      //   return { success: false, reason: t("products.errors.cannotBuyOwnProduct") };
      // }

      let updated = false;
      setBasketItems((prevItems) => {
        const existingItem = prevItems.find(
          (item) => item.product.id === product.id
        );

        if (existingItem) {
          // Check if adding one more would exceed stock
          if (existingItem.stock + 1 > product.stock) {
            return prevItems; // Don't update if it would exceed stock
          }
          updated = true;
          return prevItems.map((item) =>
            item.product.id === product.id
              ? { ...item, stock: item.stock + 1 }
              : item
          );
        }

        // For new items, check if there's stock available
        if (product.stock < 1) {
          return prevItems;
        }

        updated = true;
        return [...prevItems, { product, stock: 1 }];
      });

      // Wait for state update to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (!updated) {
        return { success: false, reason: t("products.errors.maxStockReached") };
      }

      return { success: true };
    } catch (error) {
      console.error("Error adding to basket:", error);
      return { success: false, reason: t("cart.updateFailed") };
    }
  };

  const updateStock = (productId: string, stock: number) => {
    try {
      // Validate stock is not negative
      if (stock < 0) {
        return { success: false, reason: t("cart.cannotBeNegative") };
      }

      const item = basketItems.find((item) => item.product.id === productId);
      if (!item) {
        return { success: false, reason: t("cart.errors.itemNotFound") };
      }

      // Validate stock doesn't exceed available stock
      if (stock > item.product.stock) {
        return { success: false, reason: t("cart.insufficientStock") };
      }

      // Update the stock
      setBasketItems((prevItems) =>
        prevItems.map((item) =>
          item.product.id === productId ? { ...item, stock } : item
        )
      );
      return { success: true };
    } catch (error) {
      console.error("Error updating stock:", error);
      return { success: false, reason: t("cart.updateFailed") };
    }
  };

  const removeFromBasket = (productId: string) => {
    try {
      setBasketItems((prevItems) =>
        prevItems.filter((item) => item.product.id !== productId)
      );
    } catch (error) {
      console.error("Error removing from basket:", error);
    }
  };

  const clearBasket = () => {
    try {
      if (user?.email) {
        const storageKey = `${BASE_STORAGE_KEY}_${user.email}`;
        setBasketItems([]);
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error("Error clearing basket:", error);
    }
  };

  const getBasketItem = async (productId: string) => {
    try {
      const item = basketItems.find((item) => item.product.id === productId);
      return item || null;
    } catch (error) {
      console.error("Error getting basket item:", error);
      return null;
    }
  };

  return (
    <BasketContext.Provider
      value={{
        basketItems,
        basketCount,
        addToBasket,
        updateStock,
        removeFromBasket,
        clearBasket,
        getBasketItem,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const context = useContext(BasketContext);
  if (context === undefined) {
    throw new Error("useBasket must be used within a BasketProvider");
  }
  return context;
};

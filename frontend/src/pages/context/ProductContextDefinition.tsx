import React, { useContext } from "react";
import type { Product } from "../../types";

export interface ProductContextProps {
  products: Product[];
  productsLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

export const ProductContext = React.createContext<ProductContextProps | null>(
  null
);

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};

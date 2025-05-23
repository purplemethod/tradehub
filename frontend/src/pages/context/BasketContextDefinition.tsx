import { createContext } from "react";
import type { Product } from "../../types";

type BasketItem = {
  product: Product;
  stock: number;
};

interface BasketContextProps {
  basketItems: BasketItem[];
  basketCount: number;
  addToBasket: (
    product: Product
  ) => Promise<{ success: boolean; reason?: string }>;
  removeFromBasket: (productId: string) => void;
  updateStock: (
    productId: string,
    stock: number
  ) => { success: boolean; reason: string };
  clearBasket: () => void;
}

export const BasketContext = createContext<BasketContextProps | undefined>(
  undefined
);

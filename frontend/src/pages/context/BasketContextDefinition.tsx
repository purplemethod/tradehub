import { createContext } from "react";
import type { Product } from "../../types";

type BasketItem = {
  product: Product;
  quantity: number;
};

interface BasketContextProps {
  basketItems: BasketItem[];
  basketCount: number;
  addToBasket: (product: Product) => void;
  removeFromBasket: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearBasket: () => void;
}

export const BasketContext = createContext<BasketContextProps | undefined>(undefined); 
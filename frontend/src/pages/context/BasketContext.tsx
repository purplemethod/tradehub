import React, { useState } from "react";
import type { Product } from "../../types";
import { BasketContext } from "./BasketContextDefinition";

type BasketItem = {
  product: Product;
  quantity: number;
};

export const BasketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
  const basketCount = basketItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const addToBasket = (product: Product) => {
    setBasketItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.product.id === product.id
      );
      if (existingItem) {
        if (existingItem.quantity + 1 <= product.quantity) {
          return prevItems.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: existingItem.quantity + 1 }
              : item
          );
        } else {
          console.warn(
            `Cannot add more of product ${product.id}. Only ${product.quantity} available.`
          );
          alert(
            `Não pode adicionar mais ${product.name}. Apenas ${product.quantity} unidade(s) disponível(eis). `
          );
          return prevItems;
        }
      } else {
        if (1 <= product.quantity) {
          return [...prevItems, { product, quantity: 1 }];
        } else {
          console.warn(
            `Cannot add product ${product.id}. Only ${product.quantity} available.`
          );
          alert(
            `Não pode adicionar mais ${product.name}. Apenas ${product.quantity} unidade(s) disponível(eis). `
          );
          return prevItems;
        }
      }
    });
  };

  const removeFromBasket = (productId: number) => {
    setBasketItems((prevItems) => {
      return prevItems.filter((item) => item.product.id !== productId);
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    setBasketItems((prevItems) => {
      return prevItems.map((item) => {
        if (item.product.id === productId) {
          if (quantity <= item.product.quantity) {
            return {
              ...item,
              quantity: quantity,
            };
          } else {
            console.warn(
              `Cannot update quantity for product ${productId}. Only ${item.product.quantity} available.`
            );
            alert(
              `Não pode adicionar mais desse produto. Esse é o máximo de unidade(s) disponível(eis). `
            );
            return item;
          }
        }
        return item;
      });
    });
  };

  const clearBasket = () => {
    setBasketItems([]);
  };

  const value = {
    basketItems,
    basketCount,
    addToBasket,
    removeFromBasket,
    updateQuantity,
    clearBasket,
  };

  return (
    <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
  );
};

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import { Product } from "../types/product";

type CartItem = {
  product: Product;
  quantity: number;
};

type ShopContextValue = {
  cart: CartItem[];
  cartOpen: boolean;

  setCartOpen: (value: boolean) => void;

  addToCart: (product: Product, quantity?: number) => void;

  removeFromCart: (id: number) => void;

  updateQuantity: (id: number, quantity: number) => void;

  cartCount: number;
  subtotal: number;
};

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  function addToCart(product: Product, quantity = 1) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id === product.id
      );

      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
              }
            : item
        );
      }

      return [...current, { product, quantity }];
    });

    setCartOpen(true);
  }

  function removeFromCart(id: number) {
    setCart((current) =>
      current.filter((item) => item.product.id !== id)
    );
  }

  function updateQuantity(id: number, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.product.id === id
          ? { ...item, quantity }
          : item
      )
    );
  }

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + item.product.price * item.quantity,
        0
      ),
    [cart]
  );

  return (
    <ShopContext.Provider
      value={{
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        cartCount,
        subtotal,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);

  if (!context) {
    throw new Error(
      "useShop precisa estar dentro de ShopProvider"
    );
  }

  return context;
}
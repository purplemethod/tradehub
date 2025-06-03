import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";

import {
  Bars3Icon,
  XMarkIcon,
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import logo from "../assets/logoTradeHub.png";
import { useContext, useState } from "react";
import UserContext from "./context/UserContext";
import { useNotification } from "./context/NotificationContext";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useBasket } from "./context/useBasket";
import type { Product } from "../types";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { isAdmin, isSeller } from "../utils/permissions";

type BasketItem = {
  product: Product;
  stock: number;
};

interface BasketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  basketItems: BasketItem[];
  updateStock: (
    productId: string,
    stock: number
  ) => { success: boolean; reason?: string };
  removeFromBasket: (productId: string) => void;
}

const BasketDrawer: React.FC<BasketDrawerProps> = ({
  isOpen,
  onClose,
  basketItems,
  updateStock,
  removeFromBasket,
}) => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleStockUpdate = (productId: string, newStock: number) => {
    const item = basketItems.find((item) => item.product.id === productId);
    if (!item) {
      showNotification(t("cart.errors.itemNotFound"), "error");
      return;
    }

    const result = updateStock(productId, newStock);
    if (!result.success) {
      showNotification(result.reason || t("cart.updateFailed"), "error");
      return;
    }
  };

  const handleCheckout = () => {
    if (basketItems.length === 0) {
      showNotification("Seu carrinho está vazio", "error");
      return;
    }
    onClose();
    navigate("/checkout");
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isOpen ? "opacity-50" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 flex max-w-full pl-10 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="w-screen max-w-md">
          <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {t("cart.title")}
                </h2>
                <button
                  type="button"
                  className="relative -m-2 p-2 text-gray-400 hover:text-gray-500"
                  onClick={onClose}
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Close panel</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-8">
                <div className="flow-root">
                  <ul role="list" className="-my-6 divide-y divide-gray-200">
                    {basketItems.map((item) => (
                      <li key={item.product.id} className="flex py-6">
                        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                          <img
                            src={(() => {
                              // First try to find a valid image thumbnail imageMetadataRef.thumbnailDataURL
                              const imageThumbnail =
                                item.product.imageMetadataRef?.[0]
                                  ?.thumbnailDataURL || null;

                              if (imageThumbnail) {
                                return imageThumbnail;
                              }

                              // If no image thumbnail, try to find a video thumbnail
                              const videoThumbnail =
                                item.product.imageMetadataRef?.find(
                                  (img) =>
                                    img.type === "youtube" && img.videoUrl
                                )?.videoUrl;

                              if (videoThumbnail) {
                                return videoThumbnail;
                              }

                              // Fallback to default placeholder
                              return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
                            })()}
                            alt={item.product.name}
                            className="h-full w-full object-cover object-center"
                            onError={(e) => {
                              e.currentTarget.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        </div>

                        <div className="ml-4 flex flex-1 flex-col">
                          <div>
                            <div className="flex justify-between text-base font-medium text-gray-900">
                              <h3>{item.product.name}</h3>
                              <p className="ml-4">R${item.product.price}</p>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {item.product.category}
                            </p>
                          </div>
                          <div className="flex flex-1 items-end justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() =>
                                  handleStockUpdate(
                                    item.product.id,
                                    item.stock - 1
                                  )
                                }
                                className="rounded-full p-1 hover:bg-gray-100"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <span className="text-gray-500">
                                Qty {item.stock}
                              </span>
                              <button
                                onClick={() =>
                                  handleStockUpdate(
                                    item.product.id,
                                    item.stock + 1
                                  )
                                }
                                className="rounded-full p-1 hover:bg-gray-100"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromBasket(item.product.id)}
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
              <div className="flex justify-between text-base font-medium text-gray-900">
                <p>{t("cart.subtotal")}</p>
                <p>
                  R$
                  {basketItems
                    .reduce(
                      (total, item) => total + item.product.price * item.stock,
                      0
                    )
                    .toFixed(2)}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {t("cart.shippingAndTaxes")}
              </p>
              <div className="mt-6">
                <button
                  onClick={handleCheckout}
                  className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {t("cart.checkout")}
                </button>
              </div>
              <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                <p>
                  {t("cart.or") + " "}
                  <button
                    type="button"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                    onClick={onClose}
                  >
                    {t("cart.continueShopping")}
                    <span aria-hidden="true"> &rarr;</span>
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NavigationItem {
  name: string;
  href: string;
  current: boolean;
  submenu?: NavigationItem[];
}

const NavBar: React.FC = () => {
  const { user, logout } = useContext(UserContext)!;
  const navigate = useNavigate();
  const { basketCount, basketItems, updateStock, removeFromBasket } =
    useBasket();
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const { t } = useTranslation();

  const navigation: NavigationItem[] = [
    { name: "nav.sellingProducts", href: "/home", current: false },
    { name: "nav.myFavorites", href: "/my-favorites", current: false },
    { name: "nav.myPurchases", href: "/my-purchases", current: false },
    ...(((user?.role && isAdmin(user.role)) ||
      (user?.role && isSeller(user.role))) ? [{
      name: "nav.admin",
      href: "#",
      current: false,
      submenu: [
        ((user?.role && isAdmin(user.role)) ||
          (user?.role && isSeller(user.role))) && {
          name: "nav.myProducts",
          href: "/my-products",
          current: false,
        },
        user?.role &&
          isAdmin(user.role) && {
            name: "admin.coupons.title",
            href: "/admin/coupons",
            current: false,
          },
        ((user?.role && isAdmin(user.role)) ||
          (user?.role && isSeller(user.role))) && {
          name: "orders.installmentPayments",
          href: "/admin/installment-payments",
          current: false,
        },
      ].filter((item): item is NavigationItem => Boolean(item)),
    }] : []),
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      {user && (
        <Disclosure as="nav" className="bg-gray-800">
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                {/* Mobile menu button*/}
                <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:ring-2 focus:ring-white focus:outline-hidden focus:ring-inset">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  <Bars3Icon
                    aria-hidden="true"
                    className="block size-6 group-data-open:hidden"
                  />
                  <XMarkIcon
                    aria-hidden="true"
                    className="hidden size-6 group-data-open:block"
                  />
                </DisclosureButton>
              </div>
              <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                <div className="flex shrink-0 items-center">
                  <Link to="/home" className="flex items-center">
                    <img
                      alt="TradeHub Platform"
                      src={logo}
                      className="h-8 w-auto cursor-pointer"
                    />
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:block">
                  <div className="flex space-x-4">
                    {navigation.map(
                      (item) =>
                        item &&
                        (item.submenu ? (
                          <Menu
                            as="div"
                            className="relative"
                            key={`menu-${item.name}`}
                          >
                            <MenuButton
                              className={`rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center`}
                            >
                              {t(item.name)}
                              <ChevronDownIcon className="ml-1 h-4 w-4" />
                            </MenuButton>
                            <MenuItems className="absolute left-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                              {item.submenu?.map((subItem: NavigationItem) => (
                                <MenuItem key={`submenu-${subItem.name}`}>
                                  {({ active }) => (
                                    <Link
                                      to={subItem.href}
                                      className={`block px-4 py-2 text-sm ${
                                        active ? "bg-gray-100" : "text-gray-700"
                                      }`}
                                    >
                                      {t(subItem.name)}
                                    </Link>
                                  )}
                                </MenuItem>
                              ))}
                            </MenuItems>
                          </Menu>
                        ) : (
                          <Link
                            key={`nav-${item.name}`}
                            to={item.href}
                            aria-current={item.current ? "page" : undefined}
                            className={`rounded-md px-3 py-2 text-sm font-medium ${
                              item.current
                                ? "bg-gray-900 text-white"
                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            }`}
                          >
                            {t(item.name)}
                          </Link>
                        ))
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    className="relative rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-hidden"
                    onClick={() => setIsBasketOpen(true)}
                  >
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">View cart</span>
                    <ShoppingCartIcon aria-hidden="true" className="size-6" />
                    {basketCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-[#A78BFA] rounded-full px-2 text-xs text-white">
                        {basketCount}
                      </span>
                    )}
                  </button>
                </div>

                <BasketDrawer
                  isOpen={isBasketOpen}
                  onClose={() => setIsBasketOpen(false)}
                  basketItems={basketItems}
                  updateStock={updateStock}
                  removeFromBasket={removeFromBasket}
                />

                {/* Profile dropdown */}
                <Menu as="div" className="relative ml-3">
                  <div>
                    <MenuButton className="relative flex rounded-full bg-gray-800 text-sm focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-hidden">
                      <span className="absolute -inset-1.5" />
                      <span className="sr-only">Open user menu</span>
                      <img
                        alt=""
                        src={
                          user?.photoURL && user.photoURL.startsWith("http")
                            ? user.photoURL
                            : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        }
                        className="size-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";
                        }}
                      />
                    </MenuButton>
                  </div>
                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                  >
                    <MenuItem>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                      >
                        {t("profile.title")}
                      </Link>
                    </MenuItem>
                    <div className="border-t border-gray-200 my-1" />
                    <MenuItem>
                      <Link
                        to="/my-favorites"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                      >
                        {t("products.myFavorites")}
                      </Link>
                    </MenuItem>
                    <MenuItem>
                      <Link
                        to="/my-purchases"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                      >
                        {t("orders.myPurchases")}
                      </Link>
                    </MenuItem>
                    {user?.role && isAdmin(user.role) && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                          {t("nav.admin")}
                        </div>
                        <MenuItem>
                          <Link
                            to="/my-products"
                            className="block pl-6 pr-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                          >
                            {t("products.myProducts")}
                          </Link>
                        </MenuItem>
                        <MenuItem>
                          <Link
                            to="/admin/coupons"
                            className="block pl-6 pr-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                          >
                            {t("admin.coupons.title")}
                          </Link>
                        </MenuItem>
                        <MenuItem>
                          <Link
                            to="/admin/installment-payments"
                            className="block pl-6 pr-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                          >
                            {t("orders.installmentPayments")}
                          </Link>
                        </MenuItem>
                      </>
                    )}
                    <MenuItem>
                      <div className="w-full">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                          {t("nav.language")}
                        </div>
                        <div className="px-4 py-2">
                          <LanguageSwitcher />
                        </div>
                      </div>
                    </MenuItem>
                    <div className="border-t border-gray-200 my-1" />
                    <MenuItem>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                      >
                        {t("auth.logout")}
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </div>
          </div>

          <DisclosurePanel className="sm:hidden">
            <div className="space-y-1 px-2 pt-2 pb-3">
              {navigation.map(
                (item) =>
                  item &&
                  (item.submenu ? (
                    <div key={`mobile-menu-${item.name}`} className="space-y-1">
                      <div className="px-3 py-2 text-base font-medium text-gray-300">
                        {t(item.name)}
                      </div>
                      {item.submenu?.map((subItem: NavigationItem) => (
                        <DisclosureButton
                          key={`mobile-submenu-${subItem.name}`}
                          as={Link}
                          to={subItem.href}
                          className="block pl-6 pr-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          {t(subItem.name)}
                        </DisclosureButton>
                      ))}
                    </div>
                  ) : (
                    <DisclosureButton
                      key={`mobile-nav-${item.name}`}
                      as={Link}
                      to={item.href}
                      className={`block rounded-md px-3 py-2 text-base font-medium ${
                        item.current
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      {t(item.name)}
                    </DisclosureButton>
                  ))
              )}
            </div>
          </DisclosurePanel>
        </Disclosure>
      )}
    </>
  );
};

export default NavBar;

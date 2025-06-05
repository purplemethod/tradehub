import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import NavBar from "./pages/NavBar";
import LoginPage from "./pages/LoginPage";
import NewProductPage from "./pages/NewProductPage";
import CheckoutPage from "./pages/CheckoutPage";
import { NotificationProvider } from "./pages/context/NotificationContext";
import { UserProvider } from "./pages/context/UserContext";
import { ProductProvider } from "./pages/context/ProductContext";
import { NotificationContainer } from "./pages/components/NotificationContainer";
import EditProductPage from "./pages/EditProductPage";
import { BasketProvider } from "./pages/context/BasketContext";
import MyProductsPage from "./pages/MyProductsPage";
import EditProfilePage from "./pages/EditProfilePage";
import MyPurchasesPage from "./pages/MyPurchasesPage";
import SellingProductPage from "./pages/SellingProductPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import { FavoritesProvider } from "./pages/context/FavoritesContext";
import MyFavoritesPage from "./pages/MyFavoritesPage";
import { useUserRole } from "./hooks/useUserRole";
import AuthGuard from "./pages/components/AuthGuard";
import CouponManagementPage from "./pages/admin/CouponManagementPage";
import InstallmentPaymentPage from "./pages/InstallmentPaymentPage";
import UserListPage from "./pages/admin/UserListPage";
import ManageUserPage from "./pages/admin/ManageUserPage";

const AppContent: React.FC = () => {
  const { isAdmin, canManageProducts, isSeller } = useUserRole();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/new-product"
            element={
              <AuthGuard requiredPermission={canManageProducts}>
                <NewProductPage />
              </AuthGuard>
            }
          />
          <Route
            path="/home"
            element={
              <AuthGuard requiredPermission={true}>
                <SellingProductPage />
              </AuthGuard>
            }
          />
          <Route
            path="/product/:productId"
            element={
              <AuthGuard requiredPermission={true}>
                <ProductDetailPage />
              </AuthGuard>
            }
          />
          <Route
            path="/edit-product/:productId"
            element={
              <AuthGuard requiredPermission={isAdmin || isSeller}>
                <EditProductPage />
              </AuthGuard>
            }
          />
          <Route
            path="/my-products"
            element={
              <AuthGuard requiredPermission={true}>
                <MyProductsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/my-favorites"
            element={
              <AuthGuard requiredPermission={true}>
                <MyFavoritesPage />
              </AuthGuard>
            }
          />
          <Route
            path="/checkout"
            element={
              <AuthGuard requiredPermission={true}>
                <CheckoutPage />
              </AuthGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthGuard requiredPermission={true}>
                <EditProfilePage />
              </AuthGuard>
            }
          />
          <Route
            path="/my-purchases"
            element={
              <AuthGuard requiredPermission={true}>
                <MyPurchasesPage />
              </AuthGuard>
            }
          />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route
            path="/admin/coupons"
            element={
              <AuthGuard requiredPermission={isAdmin}>
                <CouponManagementPage />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/installment-payments"
            element={
              <AuthGuard requiredPermission={isAdmin || isSeller}>
                <InstallmentPaymentPage />
              </AuthGuard>
            }
          />
          <Route
            path="admin/installment-payments/:orderId"
            element={
              <AuthGuard requiredPermission={isAdmin || isSeller}>
                <InstallmentPaymentPage />
              </AuthGuard>
            }
          />
          <Route
            path="admin/users/:userId"
            element={
              <AuthGuard requiredPermission={isAdmin}>
                <ManageUserPage />
              </AuthGuard>
            }
          />
          <Route
            path="admin/users"
            element={
              <AuthGuard requiredPermission={isAdmin}>
                <UserListPage />
              </AuthGuard>
            }
          />
        </Routes>
      </main>
      <NotificationContainer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <NotificationProvider>
        <UserProvider>
          <BasketProvider>
            <FavoritesProvider>
              <ProductProvider>
                <AppContent />
              </ProductProvider>
            </FavoritesProvider>
          </BasketProvider>
        </UserProvider>
      </NotificationProvider>
    </I18nextProvider>
  );
};

export default App;

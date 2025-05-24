import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import NavBar from "./pages/NavBar";
import LoginPage from "./pages/LoginPage";
import NewProductPage from "./pages/NewProductPage";
import CheckoutPage from "./pages/CheckoutPage";
import { NotificationProvider } from "./pages/context/NotificationContext";
import UserContext from "./pages/context/UserContext";
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

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userLoading } = React.useContext(UserContext)!;

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/new-product"
            element={
              <AuthGuard>
                <NewProductPage />
              </AuthGuard>
            }
          />
          <Route
            path="/home"
            element={
              <AuthGuard>
                <SellingProductPage />
              </AuthGuard>
            }
          />
          <Route
            path="/product/:productId"
            element={
              <AuthGuard>
                <ProductDetailPage />
              </AuthGuard>
            }
          />
          <Route
            path="/edit-product/:productId"
            element={
              <AuthGuard>
                <EditProductPage />
              </AuthGuard>
            }
          />
          <Route
            path="/my-products"
            element={
              <AuthGuard>
                <MyProductsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/my-favorites"
            element={
              <AuthGuard>
                <MyFavoritesPage />
              </AuthGuard>
            }
          />
          <Route
            path="/checkout"
            element={
              <AuthGuard>
                <CheckoutPage />
              </AuthGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthGuard>
                <EditProfilePage />
              </AuthGuard>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <AuthGuard>
                <EditProfilePage />
              </AuthGuard>
            }
          />
          <Route
            path="/my-purchases"
            element={
              <AuthGuard>
                <MyPurchasesPage />
              </AuthGuard>
            }
          />
          <Route path="/" element={<Navigate to="/home" />} />
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

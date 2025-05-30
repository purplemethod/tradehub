import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "./context/UserContext";
import { useTranslation } from "react-i18next";
import logo from "../assets/logoTradeHub.png";
import { auth, firestoreDB } from "./utils/FirebaseConfig";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { useNotification } from "./context/NotificationContext";
import { GoogleAuthProvider } from "firebase/auth";
import ForgotPasswordModal from "./components/ForgotPasswordModal";
import LoginLanguageSwitcher from "./components/LoginLanguageSwitcher";
import { UserRole, type UserProfile } from "../types";
import { doc, getDoc } from "firebase/firestore";

interface FormErrors {
  email?: string;
  password?: string;
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] =
    useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'google'>('google');
  const { setUser } = useContext(UserContext)!;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showNotification } = useNotification();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = t("auth.validation.emailRequired");
    } else if (!emailRegex.test(email)) {
      newErrors.email = t("auth.validation.emailInvalid");
    }

    if (!password) {
      newErrors.password = t("auth.validation.passwordRequired");
    } else if (password.length < 6) {
      newErrors.password = t("auth.validation.passwordMinLength");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      try {
        const userRef = doc(firestoreDB, "users", userCredential.user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        if (userData) {
          setUser({
            ...userData,
            id: userData.id,
            role: UserRole.BUYER,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            createdAt: userData.createdAt || new Date(),
          } as unknown as UserProfile);
        } else {
          setUser({
            id: userCredential.user.uid,
            email: userCredential.user.email || "",
            displayName: userCredential.user.displayName || "",
            photoURL: userCredential.user.photoURL || "",
            role: UserRole.BUYER,
            createdAt: new Date(),
          } as unknown as UserProfile);
        }
      } catch (error) {
        console.error("Error updating user document:", error);
      }
      showNotification(t("auth.notifications.loginSuccess"), "success");
      navigate("/home", { replace: true });
    } catch (error) {
      showNotification(t("auth.notifications.loginError" + error), "error");
      console.error(error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      try {
        // Create or update user document in Firestore
        const userRef = doc(firestoreDB, "users", result.user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setUser({
            ...result.user,
            id: result.user.uid,
            role: UserRole.BUYER,
            email: result.user.email,
            displayName: result.user.displayName || "",
            photoURL: result.user.photoURL || "",
          } as unknown as UserProfile);
        } else {
          setUser(result.user as unknown as UserProfile);
        }
      } catch (error) {
        console.error("Error updating user document:", error);
        // Don't set user to null here, as the auth state is still valid
      }
      showNotification(t("auth.notifications.loginSuccess"), "success");
      navigate("/home", { replace: true });
    } catch (error) {
      showNotification(t("auth.notifications.loginError" + error), "error");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-end">
          <LoginLanguageSwitcher />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <img
              className="mx-auto h-12 w-auto bg-gray-800"
              src={logo}
              alt="TradeHub"
            />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t("auth.welcomeBack")}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t("auth.signInToAccount")}
            </p>
          </div>

          {/* Login Method Switcher */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setLoginMethod('email')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                loginMethod === 'email'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t("auth.email")}
            </button>
            <button
              onClick={() => setLoginMethod('google')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                loginMethod === 'google'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Google
            </button>
          </div>

          {loginMethod === 'email' ? (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email-address" className="sr-only">
                    {t("auth.email")}
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                      errors.email ? "border-red-300" : "border-gray-300"
                    } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder={t("auth.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    {t("auth.password")}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                      errors.password ? "border-red-300" : "border-gray-300"
                    } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder={t("auth.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {t("auth.login")}
                </button>
              </div>

              <div className="text-sm text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(true)}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-8">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <img
                  className="h-5 w-5 mr-2"
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google logo"
                />
                {t("auth.signInWithGoogle")}
              </button>
            </div>
          )}
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
      />
    </div>
  );
};

export default LoginPage;

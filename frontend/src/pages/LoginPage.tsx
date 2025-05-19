import { useContext, useState } from "react";
import logo from "../assets/logoTradeHub.png";

import { auth, provider } from "./utils/FirebaseConfig";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  type AuthError,
} from "firebase/auth";
import { useNavigate } from "react-router";
import UserContext from "./context/UserContext";

export default function LoginPage() {
  const [error, setError] = useState<string | null | AuthError>(null);
  const { setUser } = useContext(UserContext)!;
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      await signInWithEmailAndPassword(
        auth,
        email as string,
        password as string
      ).then(() => {
        setUser(auth.currentUser);
      });
      console.log("Login Success");
      navigate("/", { replace: true });
    } catch (error) {
      handleError(error as AuthError);
      console.log("Failed to Login via signInWithEmailAndPassword");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      console.log("Successfully signed in with Google");
      navigate("/", { replace: true });
    } catch (error) {
      handleError(error as AuthError);
      console.log("Failed to Login via signInWithPopup");
    }
  };

  const handleError = (error: AuthError) => {
    console.error("Login error:", error.code, error.message);
    console.error("Error:", error);
    switch (error.code) {
      case "auth/popup-closed-by-user":
        console.log("User closed the popup.");
        setError(error.message);
        break;
      case "auth/user-not-found":
        setError("User not found.");
        break;
      case "auth/wrong-password":
        setError("Wrong password.");
        break;
      case "auth/invalid-email":
        setError("Invalid email.");
        break;
      case "auth/popup-blocked":
        setError("Popup blocked. Please allow popups for this site.");
        break;
      default:
        setError("An unexpected error occurred.");
        break;
    }
  };

  return (
    <div
      className="flex h-screen w-full items-center justify-center bg-gray-900 bg-cover bg-no-repeat"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1499123785106-343e69e68db1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1748&q=80')",
      }}
    >
      <div className="rounded-xl bg-gray-800 bg-opacity-50 px-16 py-10 shadow-lg backdrop-blur-md max-sm:px-8">
        <div className="text-white">
          <div className="mb-8 flex flex-col items-center">
            <img src={logo} width="150" alt="" srcSet="" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-4 text-lg">
              <input
                className="rounded-3xl border-none bg-yellow-400 bg-opacity-50 px-6 py-2 text-center text-inherit placeholder-slate-200 shadow-lg outline-none backdrop-blur-md"
                type="text"
                name="email"
                placeholder="id@email.com"
              />
            </div>

            <div className="mb-4 text-lg">
              <input
                className="rounded-3xl border-none bg-yellow-400 bg-opacity-50 px-6 py-2 text-center text-inherit placeholder-slate-200 shadow-lg outline-none backdrop-blur-md"
                type="Password"
                name="password"
                placeholder="*********"
              />
            </div>
            <div className="flex justify-center text-lg text-black">
              <button
                type="submit"
                className="cursor-pointer rounded-3xl bg-yellow-400 bg-opacity-50 px-10 py-2 text-white shadow-xl backdrop-blur-md transition-colors duration-300 hover:bg-yellow-600"
              >
                Login
              </button>
            </div>
            <div className="mt-4 flex justify-center text-lg text-black">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="cursor-pointer rounded-3xl bg-yellow-400 bg-opacity-50 px-10 py-2 text-white shadow-xl backdrop-blur-md transition-colors duration-300 hover:bg-yellow-600"
              >
                Login com Google
              </button>
            </div>
            {error && (
              <p className="text-red-500 mt-4">
                {typeof error === "string" ? error : error.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

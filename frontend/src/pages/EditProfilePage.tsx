import React, { useState, useContext, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { firestoreDB } from "./utils/FirebaseConfig";
import UserContext from "./context/UserContext";
import { useNavigate } from "react-router-dom";
import { NotificationPreferences } from "./components/NotificationPreferences";
import type { UserProfile } from "../types";
import { useTranslation } from "react-i18next";

const EditProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const context = useContext(UserContext);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    id: "",
    name: "",
    displayName: "",
    email: "",
    photoURL: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  useEffect(() => {
    if (!context?.user) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchUserProfile = async () => {
      if (!context) {
        return;
      }

      const { user, userLoading } = context;

      if (userLoading) {
        return;
      }

      if (!userLoading && !user) {
        navigate("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(firestoreDB, "users", user!.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile({
            id: user!.uid,
            name: userData.name || "",
            displayName: userData.displayName || "",
            email: userData.email || "",
            photoURL: userData.photoURL || "",
            phoneNumber: userData.phoneNumber || "",
            address: userData.address || "",
            city: userData.city || "",
            state: userData.state || "",
            country: userData.country || "",
            zipCode: userData.zipCode || "",
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date()
          });
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(t("profile.errorSaving"));
      }
    };

    fetchUserProfile();
  }, [context?.user, navigate, t]);

  if (!context || context.userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        {t("common.loading")}
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context || !context.user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const userRef = doc(firestoreDB, "users", context.user.uid);
      await updateDoc(userRef, {
        displayName: profile.displayName,
        phoneNumber: profile.phoneNumber,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        zipCode: profile.zipCode,
      });

      setSuccess(t("profile.management.changesSaved"));
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(t("profile.errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev: UserProfile) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("profile.management.editProfile")}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("profile.management.personalInfo.displayName")}
          </label>
          <input
            type="text"
            name="displayName"
            value={profile.displayName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("profile.management.personalInfo.email")}
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("profile.management.personalInfo.phoneNumber")}
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={profile.phoneNumber}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("profile.management.personalInfo.address")}
          </label>
          <input
            type="text"
            name="address"
            value={profile.address}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("profile.management.personalInfo.city")}
            </label>
            <input
              type="text"
              name="city"
              value={profile.city}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("profile.management.personalInfo.state")}
            </label>
            <input
              type="text"
              name="state"
              value={profile.state}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("profile.management.personalInfo.country")}
            </label>
            <input
              type="text"
              name="country"
              value={profile.country}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("profile.management.personalInfo.zipCode")}
            </label>
            <input
              type="text"
              name="zipCode"
              value={profile.zipCode}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("common.saveChanges")}
          </button>
        </div>
      </form>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">
            {t("profile.management.notifications")}
          </h2>
          <NotificationPreferences />
        </section>
      </div>
    </div>
  );
};

export default EditProfilePage;

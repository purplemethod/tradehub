import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { firestoreDB } from "../utils/FirebaseConfig"; // Adjust path if necessary
import UserContext from "../context/UserContext"; // Adjust path if necessary
import { useParams, useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext"; // Adjust path if necessary
import type { UserProfile } from "../../types";

type UserProfileWithoutId = Omit<UserProfile, 'id'>;

const ManageUserPage: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const userContext = useContext(UserContext);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userContext?.user || userContext.user.role !== "ADMIN") {
        showNotification(t("auth.permissionDenied"), "error");
        navigate("");
        return;
      }

      if (!userId) {
        showNotification(t("admin.userManagement.selectUserError"), "warning");
        navigate("admin/users"); // Redirect to user list if no user ID
        return;
      }

      try {
        const userRef = doc(firestoreDB, "users", userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setUserProfile({ ...userDoc.data() as UserProfile });
        } else {
          showNotification(t("admin.userManagement.userNotFound"), "error");
          navigate("admin/users");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        showNotification(t("common.fetchError"), "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (userContext?.user) {
      fetchUser();
    }
  }, [userId, userContext, navigate, t, showNotification]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserProfile(prevProfile => {
      if (!prevProfile) return null;
      return { ...prevProfile, [name]: value };
    });
  };

  const handleSaveChanges = async () => {
    if (!userProfile || !userContext?.user || userContext.user.role !== "ADMIN") return;

    setIsSaving(true);
    try {
      const userRef = doc(firestoreDB, "users", userProfile.id);
      // Create a copy to avoid directly modifying state during the async operation
      const profileToSave: UserProfileWithoutId = { ...userProfile };
      // Remove the 'id' field before saving as it's the document ID
      // delete (profileToSave as any).id; // Removed: Handled by Omit in type

      await updateDoc(userRef, { ...profileToSave }); // Update with changes
      showNotification(t("common.saveSuccess"), "success");
    } catch (error) {
      console.error("Error saving user:", error);
      showNotification(t("common.saveError"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userProfile || !userContext?.user || userContext.user.role !== "ADMIN") return;

    if (!window.confirm(t("admin.userManagement.deleteConfirmation"))) {
      return;
    }

    try {
      const userRef = doc(firestoreDB, "users", userProfile.id);
      await deleteDoc(userRef);
      showNotification(t("admin.userManagement.deleteSuccess"), "success");
      navigate("admin/users");
    } catch (error) {
      console.error("Error deleting user:", error);
      showNotification(t("admin.userManagement.deleteError"), "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!userProfile) {
    return null; // Or a loading/error state, but navigate handles not found
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("admin.userManagement.manageUser")}: {userProfile.displayName || userProfile.email}</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Display User Details (read-only for now) */}
          <div>
            <h2 className="text-lg font-semibold mb-2">{t("profile.personalInfo")}</h2>
            <p className="text-gray-700"><strong>{t("common.name")}:</strong> {userProfile.displayName || t("common.guest")}</p>
            <p className="text-gray-700"><strong>{t("auth.email")}:</strong> {userProfile.email}</p>
            <p className="text-gray-700"><strong>{t("profile.management.personalInfo.phoneNumber")}:</strong> {userProfile.phoneNumber || "-"}</p>
            <p className="text-gray-700"><strong>{t("profile.management.personalInfo.role")}:</strong> {userProfile.role || "-"}</p>
            {/* Add other user details here */}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t("admin.userManagement.editUser")}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
              <div className="mb-4">
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">{t("profile.management.personalInfo.displayName")}</label>
                <input
                  type="text"
                  name="displayName"
                  id="displayName"
                  value={userProfile.displayName || ""}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">{t("profile.personalInfo.role")}</label>
                <select
                  name="role"
                  id="role"
                  value={userProfile.role || ""}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="USER">{t("admin.roles.user")}</option>
                  <option value="SELLER">{t("admin.roles.seller")}</option>
                  <option value="ADMIN">{t("admin.roles.admin")}</option>
                </select>
              </div>
              {/* Add other editable fields as needed */}
            </form>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? t("common.saving") : t("common.saveChanges")}
          </button>

          <button
            onClick={handleDeleteUser}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            {t("admin.userManagement.deleteUser")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageUserPage; 
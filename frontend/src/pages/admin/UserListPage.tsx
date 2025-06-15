import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { collection, getDocs, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import type { UserProfile } from "../../types";
import UserContext from "../context/UserContext";
import { useNotification } from "../context/NotificationContext";
import { firestoreDB } from "../utils/FirebaseConfig";

interface User extends UserProfile {
  id: string;
}

const UserListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userContext = useContext(UserContext);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userContext?.user || userContext.user.role !== "ADMIN") {
        // Redirect or show error if not admin
        showNotification(t("auth.permissionDenied"), "error");
        navigate("home"); // Redirect to home or login
        return;
      }

      try {
        const usersCollection = collection(firestoreDB, "users");
        const q = query(usersCollection);
        const querySnapshot = await getDocs(q);
        const usersList = querySnapshot.docs.map(doc => ({
          ...doc.data() as UserProfile
        })) as User[];
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        showNotification(t("common.fetchError"), "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (userContext?.user) {
      fetchUsers();
    }
  }, [userContext, navigate, t, showNotification]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("admin.userManagement.title")}</h1>

      {users.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-600">{t("admin.userManagement.noUsers")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-md shadow-md">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("common.name")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("auth.email")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("profile.management.personalInfo.phoneNumber")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("profile.management.personalInfo.role")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b">
                  <td className="py-3 px-4">{user.displayName || t("common.guest")}</td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">{user.phoneNumber || "-"}</td>
                  <td className="py-3 px-4">{user.role || "-"}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {t("common.manage")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserListPage; 
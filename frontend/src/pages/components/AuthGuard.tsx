import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../context/UserContext";
import { useNotification } from "../context/NotificationContext";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredPermission,
}) => {
  const { user, userLoading } = useContext(UserContext)!;
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, userLoading, navigate]);

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!requiredPermission) {
    showNotification("This page is not available to you", "error");
    navigate("/home", { replace: true });
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;

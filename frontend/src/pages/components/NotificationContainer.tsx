import React from "react";
import { useNotification } from "../context/NotificationContext";
import { Notification } from "./Notification";

export const NotificationContainer: React.FC = () => {
  const {
    notifications,
    removeNotification,
    clearAllNotifications,
    preferences,
  } = useNotification();

  const getPositionClasses = () => {
    switch (preferences.position) {
      case "top-left":
        return "top-8 left-8";
      case "bottom-right":
        return "bottom-8 right-8";
      case "bottom-left":
        return "bottom-8 left-8";
      default:
        return "top-8 right-8";
    }
  };

  const getAnimationClasses = (isExiting: boolean) => {
    const baseAnimation = isExiting ? "-out" : "-in";
    switch (preferences.animation) {
      case "fade":
        return `animate-fade${baseAnimation}`;
      case "bounce":
        return `animate-bounce${baseAnimation}`;
      case "scale":
        return `animate-scale${baseAnimation}`;
      default: // slide
        return `animate-slide${baseAnimation}`;
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed ${getPositionClasses()} z-50 flex flex-col gap-4`}>
      {notifications.length > 1 && (
        <button
          onClick={clearAllNotifications}
          className="self-end mb-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white rounded-md shadow-sm hover:bg-gray-50 transition-colors duration-200"
        >
          Clear All
        </button>
      )}
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="transform transition-all duration-300 ease-in-out"
          style={{
            transform: `translateY(${index * 16}px)`,
            zIndex: notifications.length - index,
          }}
        >
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
            duration={notification.duration}
            animation={getAnimationClasses(false)}
            exitAnimation={getAnimationClasses(true)}
          />
        </div>
      ))}
    </div>
  );
};

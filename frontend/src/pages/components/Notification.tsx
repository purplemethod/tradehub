import React, { useEffect, useState } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
  duration?: number;
  animation: string;
  exitAnimation: string;
}

export const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  onClose,
  duration = 5000,
  animation,
  exitAnimation,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = endTime - now;
      const newProgress = (remaining / duration) * 100;

      if (newProgress <= 0) {
        handleClose();
      } else {
        setProgress(newProgress);
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);

    return () => {
      setProgress(0);
    };
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-500 text-green-800";
      case "error":
        return "bg-red-50 border-red-500 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-500 text-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-500 text-blue-800";
      default:
        return "bg-gray-50 border-gray-500 text-gray-800";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg
            className="h-6 w-6 text-green-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="h-6 w-6 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            className="h-6 w-6 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "info":
        return (
          <svg
            className="h-6 w-6 text-blue-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`relative w-96 shadow-xl rounded-lg pointer-events-auto border-l-4 ${getTypeStyles()} ${
        isExiting ? exitAnimation : animation
      }`}
    >
      <div className="p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="ml-4 w-0 flex-1">
            <p className="text-base font-medium">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 rounded-b-lg overflow-hidden">
        <div
          className="h-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor:
              type === "success"
                ? "#10B981"
                : type === "error"
                ? "#EF4444"
                : type === "warning"
                ? "#F59E0B"
                : "#3B82F6",
          }}
        />
      </div>
    </div>
  );
};

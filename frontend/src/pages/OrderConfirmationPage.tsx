import React from "react";
import { useNavigate } from "react-router-dom";
import { NotificationContainer } from "./components/NotificationContainer";
import { useTranslation } from 'react-i18next';

const OrderConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationContainer />
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('orderConfirmation.title')}
          </h1>
          <p className="text-gray-600">
            {t('orderConfirmation.thankYou')}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('orderConfirmation.nextSteps')}
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-500 mr-2 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-600">
                {t('orderConfirmation.emailDetails')}
              </span>
            </li>
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-500 mr-2 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-600">
                {t('orderConfirmation.preparingOrder')}
              </span>
            </li>
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-500 mr-2 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-600">
                {t('orderConfirmation.orderUpdates')}
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => navigate("products")}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('orderConfirmation.continueShopping')}
          </button>
          <button
            onClick={() => navigate("orders")}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {t('orderConfirmation.viewOrders')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage; 
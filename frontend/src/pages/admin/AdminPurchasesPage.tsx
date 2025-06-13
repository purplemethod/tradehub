import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { firestoreDB } from "../utils/FirebaseConfig";
import UserContext from "../context/UserContext";
import { useNotification } from "../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import type { Order } from "../../types";

const AdminPurchasesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userContext = useContext(UserContext);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userContext?.user || userContext.user.role !== "ADMIN") {
        showNotification(t("auth.permissionDenied"), "error");
        navigate("/");
        return;
      }

      try {
        const ordersCollection = collection(firestoreDB, "orders");
        const q = query(ordersCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const ordersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(ordersList);
      } catch (error) {
        console.error("Error fetching orders:", error);
        showNotification(t("common.fetchError"), "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (userContext?.user) {
      fetchOrders();
    }
  }, [userContext, navigate, t, showNotification]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    
    // If it's a Firestore Timestamp
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString();
    }
    
    // If it's a regular date object or timestamp
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    
    // If it's a number (milliseconds since epoch)
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString();
    }
    
    // If it's a string
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString();
    }
    
    return '-';
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      const orderRef = doc(firestoreDB, "orders", orderId);
      await updateDoc(orderRef, { status: "completed" });
      showNotification(t("orders.paymentConfirmed"), "success");
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: "completed" } : order
        )
      );
    } catch (error) {
      showNotification(t("orders.paymentConfirmError"), "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("admin.purchases.title")}</h1>

      {orders.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-600">{t("admin.purchases.noOrders")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-md shadow-md">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.orderId")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.buyer")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.seller")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.product")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.quantity")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.price")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.paymentMethod")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.status")}</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">{t("admin.purchases.date")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{order.id}</td>
                  <td className="py-3 px-4">{order.shippingInfo?.email || order.userEmail || '-'}</td>
                  <td className="py-3 px-4">
                    {order.items.map(item => item.owner).filter((owner, index, self) => self.indexOf(owner) === index).join(", ")}
                  </td>
                  <td className="py-3 px-4">
                    {order.items.map(item => item.name).join(", ")}
                  </td>
                  <td className="py-3 px-4">
                    {order.items.map(item => item.stock).join(", ")}
                  </td>
                  <td className="py-3 px-4">
                    {t("common.currency")}{order.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">{t(`payment.methods.${order.paymentMethod}`)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {t(`orders.status.${order.status}`)}
                    </span>
                    {order.status !== 'completed' && (
                      <button
                        className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        onClick={() => handleConfirmPayment(order.id)}
                      >
                        {t("orders.confirmPayment")}
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {formatDate(order.createdAt)}
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

export default AdminPurchasesPage; 
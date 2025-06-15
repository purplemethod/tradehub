import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useContext } from "react";
import { firestoreDB } from "./utils/FirebaseConfig";
import UserContext from "./context/UserContext";
import { useNotification } from "./context/NotificationContext";

interface OrderItem {
  productId: string;
  name: string;
  stock: number;
  price: number;
  total: number;
  sellerEmail?: string;
}

interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: {
    productId: string;
    name: string;
    stock: number;
    price: number;
    total: number;
    owner: string;
  }[];
  shippingInfo: {
    fullName: string;
    email: string;
    phoneNumber: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: "pix" | "installment";
  total: number;
  status: string;
  createdAt: string;
  expiresAt: string;
  pixPayment?: {
    pixPayload: string;
    pixKey: string;
    expiresAt: string;
  };
  installmentPayment?: {
    installments: number;
    installmentValue: number;
    nextPaymentDate: string;
    remainingInstallments: number;
    paidInstallments: number;
    hasInterest: boolean;
    interestRate: number;
    totalWithInterest: number;
    paymentHistory: Array<{
      installmentNumber: number;
      paymentDate: string;
      amount: number;
      confirmedBy: string;
      confirmedByEmail: string;
    }>;
  };
}

const InstallmentPaymentPage: React.FC = () => {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const userContext = useContext(UserContext);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (userContext) {
      setIsContextLoaded(true);
    }
  }, [userContext]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isContextLoaded || !userContext?.user) return;

      try {
        if (orderId) {
          const orderRef = doc(firestoreDB, "orders", orderId);
          const orderDoc = await getDoc(orderRef);

          if (orderDoc.exists()) {
            const orderData = orderDoc.data();
            const userRef = doc(firestoreDB, "users", orderData.userId);
            const userDoc = await getDoc(userRef);
            const userEmail = userDoc.exists()
              ? userDoc.data().email
              : "Unknown";

            const itemsWithSellerDetails = await Promise.all(
              orderData.items.map(async (item: OrderItem) => {
                const productRef = doc(firestoreDB, "products", item.productId);
                const productDoc = await getDoc(productRef);
                const sellerEmail = productDoc.exists()
                  ? productDoc.data().owner
                  : "Unknown";
                return { ...item, sellerEmail };
              })
            );

            setOrder({
              id: orderDoc.id,
              ...orderData,
              userEmail,
              items: itemsWithSellerDetails,
            } as Order);
          } else {
            showNotification(t("orders.notFound"), "error");
            navigate("my-purchases");
          }
        } else {
          const ordersRef = collection(firestoreDB, "orders");
          let q;

          if (userContext.user.role === "ADMIN") {
            q = query(ordersRef, where("paymentMethod", "==", "installment"));
          } else if (userContext.user.role === "SELLER") {
            const installmentOrdersQuery = query(
              ordersRef,
              where("paymentMethod", "==", "installment")
            );
            const installmentOrdersSnapshot = await getDocs(
              installmentOrdersQuery
            );

            const sellerOrders = [];
            for (const orderDoc of installmentOrdersSnapshot.docs) {
              const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
              let isSellerOrder = false;

              for (const item of order.items) {
                const productRef = doc(firestoreDB, "products", item.productId);
                const productDoc = await getDoc(productRef);
                if (
                  productDoc.exists() &&
                  productDoc.data().owner === userContext.user.email
                ) {
                  isSellerOrder = true;
                  setOrder(order.id ? order : null);
                  break;
                }
              }

              if (isSellerOrder) {
                sellerOrders.push(order);
              }
            }
            console.log("sellerOrders", sellerOrders);
            setOrders(sellerOrders);
            setIsLoading(false);
            return;
          } else {
            q = query(
              ordersRef,
              where("paymentMethod", "==", "installment"),
              where("userId", "==", userContext.user.id)
            );
          }

          const querySnapshot = await getDocs(q);
          const ordersList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Order[];

          setOrders(ordersList);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        showNotification(t("orders.fetchError"), "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [orderId, navigate, t, isContextLoaded, userContext, showNotification]);

  const handlePaymentConfirmation = async () => {
    if (!order || !order.installmentPayment || !userContext?.user?.email) {
      showNotification(t("common.loading"), "info");
      return;
    }

    setIsProcessing(true);
    try {
      const orderRef = doc(firestoreDB, "orders", order.id);
      const currentInstallment = order.installmentPayment.paidInstallments + 1;

      const updatedInstallmentPayment = {
        ...order.installmentPayment,
        paidInstallments: currentInstallment,
        remainingInstallments:
          order.installmentPayment.remainingInstallments - 1,
        nextPaymentDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        paymentHistory: [
          ...(order.installmentPayment.paymentHistory || []),
          {
            installmentNumber: currentInstallment,
            paymentDate: new Date().toISOString(),
            amount: order.installmentPayment.installmentValue,
            confirmedBy: userContext.user.id,
            confirmedByEmail: userContext.user.email,
          },
        ],
      };

      await updateDoc(orderRef, {
        installmentPayment: updatedInstallmentPayment,
        status:
          updatedInstallmentPayment.remainingInstallments === 0
            ? "paid"
            : "pending",
      });

      setOrder({
        ...order,
        installmentPayment: updatedInstallmentPayment,
        status:
          updatedInstallmentPayment.remainingInstallments === 0
            ? "paid"
            : "pending",
      });

      showNotification(t("orders.paymentConfirmed"), "success");
    } catch (error) {
      console.error("Error confirming payment:", error);
      showNotification(t("orders.paymentError"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || !isContextLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {t("orders.installmentPayments")}
        </h1>

        {orders.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600">{t("orders.noInstallmentPayments")}</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {t("orders.orderNumber")}: {order.id}
                    </h2>
                    <p className="text-gray-600">
                      {t("orders.total")}: {t("common.currency")}
                      {order.total.toFixed(2)}
                    </p>
                    {(userContext?.user?.role === "ADMIN" ||
                      userContext?.user?.role === "SELLER") && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          {t("orders.buyer")}:{" "}
                          {order?.shippingInfo?.email || "Unknown"}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/admin/installment-payments/${order.id}`)
                    }
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    {t("common.view")}
                  </button>
                </div>

                {/* Product Details */}
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {t("orders.items")}
                  </h3>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-sm"
                      >
                        <div>
                          <p className="text-gray-900">{item.name}</p>
                          <p className="text-gray-500">
                            {t("products.quantity")}: {item.stock}
                          </p>
                          {(userContext?.user?.role === "ADMIN" ||
                            userContext?.user?.role === "SELLER") && (
                            <p className="text-gray-500">
                              {t("orders.seller")}: {item.owner || "Unknown"}
                            </p>
                          )}
                        </div>
                        <p className="text-gray-900">
                          {t("common.currency")}
                          {item.total.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {order.installmentPayment && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="text-gray-600">
                      {t("orders.installmentInfo", {
                        current: order.installmentPayment.paidInstallments + 1,
                        total: order.installmentPayment.installments,
                        value:
                          order.installmentPayment.installmentValue.toFixed(2),
                        next: new Date(
                          order.installmentPayment.nextPaymentDate
                        ).toLocaleDateString(),
                      })}
                    </p>
                    {order.installmentPayment.hasInterest && (
                      <p className="text-gray-600">
                        {t("orders.interestInfo", {
                          rate:
                            (order.installmentPayment.interestRate || 0) * 100,
                          total:
                            order.installmentPayment.totalWithInterest?.toFixed(
                              2
                            ) || order.total.toFixed(2),
                        })}
                      </p>
                    )}
                    <p className="text-gray-600">
                      {t("orders.remainingInstallments")}:{" "}
                      {order.installmentPayment.remainingInstallments}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!order || !order.installmentPayment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{t("orders.notFound")}</p>
        </div>
      </div>
    );
  }

  const { installmentPayment } = order;
  const isSeller = userContext?.user?.role === "SELLER";
  const isAdmin = userContext?.user?.role === "ADMIN";
  const isBuyer = userContext?.user?.id === order.userId;
  const canConfirmPayment = isSeller || isAdmin;
  const currentInstallment = installmentPayment.paidInstallments + 1;
  const allInstallments = Array.from(
    { length: installmentPayment.installments },
    (_, i) => i + 1
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {t("orders.installmentPayment")}
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                {t("orders.orderDetails")}
              </h2>
              <p className="text-gray-600">
                {t("orders.orderNumber")}: {order.id}
              </p>
              <p className="text-gray-600">
                {t("orders.total")}: {t("common.currency")}
                {order.total.toFixed(2)}
              </p>
              {(isAdmin || isSeller) && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>
                    {t("orders.buyer")}: {order.userEmail || "Unknown"}
                  </p>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="border-t border-gray-200 pt-4">
              <h2 className="text-lg font-semibold mb-2">
                {t("orders.items")}
              </h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {t("products.quantity")}: {item.stock}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t && t("products.price")}: {t("common.currency")}
                        {item.price.toFixed(2)}
                      </p>
                      {(isAdmin || isSeller) && (
                        <p className="text-sm text-gray-500">
                          {t("orders.seller")}: {item.owner || "Unknown"}
                        </p>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">
                      {t("common.currency")}
                      {item.total.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h2 className="text-lg font-semibold mb-2">
                {t("orders.installmentDetails")}
              </h2>
              <div className="space-y-2">
                <p className="text-gray-600">
                  {t("orders.installmentInfo", {
                    current: currentInstallment,
                    total: installmentPayment.installments,
                    value: installmentPayment.installmentValue.toFixed(2),
                    next: new Date(
                      installmentPayment.nextPaymentDate
                    ).toLocaleDateString(),
                  })}
                </p>
                {installmentPayment.hasInterest && (
                  <p className="text-gray-600">
                    {t("orders.interestInfo", {
                      rate: (installmentPayment.interestRate || 0) * 100,
                      total:
                        installmentPayment.totalWithInterest?.toFixed(2) ||
                        order.total.toFixed(2),
                    })}
                  </p>
                )}
                <p className="text-gray-600">
                  {t("orders.remainingInstallments")}:{" "}
                  {installmentPayment.remainingInstallments}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h2 className="text-lg font-semibold mb-2">
                {t("orders.paymentHistory")}
              </h2>
              <div className="space-y-2">
                {allInstallments.map((installment) => {
                  const payment = installmentPayment.paymentHistory?.find(
                    (p) => p.installmentNumber === installment
                  );
                  const isPaid =
                    installment <= installmentPayment.paidInstallments;
                  const isCurrent = installment === currentInstallment;

                  return (
                    <div
                      key={installment}
                      className={`p-3 rounded-lg ${
                        isPaid
                          ? "bg-green-50 border border-green-200"
                          : isCurrent
                          ? "bg-blue-50 border border-blue-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {t("orders.installment")} {installment}
                        </span>
                        <span className="text-sm">
                          {t("common.currency")}
                          {installmentPayment.hasInterest && installment > 6
                            ? (
                                installmentPayment.installmentValue *
                                (1 + (installmentPayment.interestRate || 0))
                              ).toFixed(2)
                            : installmentPayment.installmentValue.toFixed(2)}
                        </span>
                      </div>
                      {payment && (
                        <div className="text-sm text-gray-600 mt-1">
                          <div>
                            {t("orders.paidOn")}:{" "}
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </div>
                          <div>
                            {t("orders.confirmedBy")}:{" "}
                            {payment.confirmedByEmail}
                          </div>
                        </div>
                      )}
                      {isCurrent && !isPaid && (
                        <div className="text-sm text-blue-600 mt-1">
                          {t("orders.dueOn")}:{" "}
                          {new Date(
                            installmentPayment.nextPaymentDate
                          ).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {canConfirmPayment && (
              <div className="border-t border-gray-200 pt-4">
                {installmentPayment.remainingInstallments > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">
                        {t("orders.confirmNextPayment")}
                      </h3>
                      <p className="text-blue-600 mb-4">
                        {t("orders.confirmPaymentDescription", {
                          installment: currentInstallment,
                          amount:
                            installmentPayment.hasInterest &&
                            currentInstallment > 6
                              ? (
                                  installmentPayment.installmentValue *
                                  (1 + (installmentPayment.interestRate || 0))
                                ).toFixed(2)
                              : installmentPayment.installmentValue.toFixed(2),
                        })}
                      </p>
                      <button
                        onClick={handlePaymentConfirmation}
                        disabled={isProcessing}
                        className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          isProcessing ? "opacity-75 cursor-not-allowed" : ""
                        }`}
                      >
                        {isProcessing ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            {t("common.processing")}
                          </div>
                        ) : (
                          t("orders.confirmPayment")
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-800">
                      {t("orders.allPaymentsCompleted")}
                    </h3>
                    <p className="text-green-600 mt-2">
                      {t("orders.allInstallmentsPaid")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {isBuyer && installmentPayment.remainingInstallments > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    {t("orders.paymentInstructions")}
                  </h3>
                  <p className="text-yellow-600">
                    {t("orders.nextPaymentDue", {
                      amount: installmentPayment.installmentValue.toFixed(2),
                      date: new Date(
                        installmentPayment.nextPaymentDate
                      ).toLocaleDateString(),
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallmentPaymentPage;

import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBasket } from "./context/useBasket";
import UserContext from "./context/UserContext";
import { useNotification } from "./context/NotificationContext";
import { NotificationContainer } from "./components/NotificationContainer";
import { ProductContext } from "./context/ProductContextDefinition";
import {
  collection,
  addDoc,
  doc,
  runTransaction,
  onSnapshot,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { firestoreDB } from "./utils/FirebaseConfig";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

interface UserData {
  email: string;
  displayName: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface FormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  // PIX fields
  pixKey: string;
}

interface FormErrors {
  [key: string]: string;
}

interface PixPaymentData {
  id: string;
  orderId: string;
  userId: string;
  sellerId: string;
  pixKey: string;
  pixKeyType: "cpf" | "email" | "phoneNumber" | "random";
  pixPayload: string;
  amount: number;
  status: "pending" | "paid" | "expired" | "failed";
  createdAt: string;
  expiresAt: string;
  transactionId: string;
  errorMessage?: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { basketItems, clearBasket } = useBasket();
  const { user } = useContext(UserContext)!;
  const { showNotification } = useNotification();
  const productContext = useContext(ProductContext);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixPaymentData, setPixPaymentData] = useState<PixPaymentData | null>(
    null
  );
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState<number | null>(null);

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userRef = doc(firestoreDB, "users", user.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;

          // Update form data with user information
          setFormData((prev) => ({
            ...prev,
            email: data.email || user.email || "",
            fullName: data.displayName || "",
            phoneNumber: data.phoneNumber || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            zipCode: data.zipCode || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        showNotification(t("checkout.notifications.userDataError"), "error");
      }
    };

    fetchUserData();
  }, [user, showNotification, t]);

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: user?.email || "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    // PIX fields
    pixKey: import.meta.env.VITE_PIX_KEY || "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Calculate total from basketItems
  const total = basketItems.reduce(
    (sum, item) => sum + item.product.price * item.stock,
    0
  );

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    const phoneNumberRegex = /^\+?[\d\s-]{10,}$/;
    const zipCodeRegex = /^\d{5}-?\d{3}$/;

    // Common fields validation
    if (!formData.fullName.trim()) {
      errors.fullName = t("checkout.validation.fullNameRequired");
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = t("checkout.validation.phoneRequired");
    } else if (!phoneNumberRegex.test(formData.phoneNumber)) {
      errors.phoneNumber =
        t("checkout.validation.phoneInvalid") +
        ". " +
        t("checkout.validation.phoneNumberFormat");
    }

    if (!formData.address.trim()) {
      errors.address = t("checkout.validation.addressRequired");
    }

    if (!formData.city.trim()) {
      errors.city = t("checkout.validation.cityRequired");
    }

    if (!formData.state.trim()) {
      errors.state = t("checkout.validation.stateRequired");
    }

    if (!formData.zipCode.trim()) {
      errors.zipCode = t("checkout.validation.zipCodeRequired");
    } else if (!zipCodeRegex.test(formData.zipCode)) {
      errors.zipCode =
        t("checkout.validation.zipCodeInvalid") +
        ". " +
        t("checkout.validation.zipCodeFormat");
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number with spaces
    if (name === "cardNumber") {
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim();
    }

    // Format expiry date
    if (name === "expiryDate") {
      formattedValue = value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d{0,2})/, "$1/$2")
        .substring(0, 5);
    }

    // Format zip code
    if (name === "zipCode") {
      formattedValue = value
        .replace(/\D/g, "")
        .replace(/(\d{5})(\d{0,3})/, "$1-$2")
        .substring(0, 9);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showNotification(t("checkout.notifications.loginRequired"), "error");
      return;
    }

    if (!validateForm()) {
      // Get the first error message that exists
      const firstErrorKey = Object.keys(formErrors).find(key => formErrors[key]);
      if (firstErrorKey) {
        showNotification(formErrors[firstErrorKey], "error");
      } else {
        showNotification(t("checkout.notifications.validationError"), "error");
      }
      return;
    }

    if (basketItems.length === 0) {
      showNotification(t("checkout.notifications.emptyCart"), "error");
      return;
    }

    try {
      setIsProcessing(true);
      setCountdown(20); // Start the countdown
      showNotification(t("checkout.notifications.processing"), "info");

      // Update user data in Firestore with the latest information
      const userRef = doc(firestoreDB, "users", user.id);
      await updateDoc(userRef, {
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      });

      // Update product stock quantities
      for (const item of basketItems) {
        const productRef = doc(firestoreDB, "products", item.product.id);
        const productDoc = await getDoc(productRef);

        if (!productDoc.exists()) {
          throw new Error(`Product ${item.product.id} not found`);
        }

        const currentStock = productDoc.data().stock;
        const newStock = currentStock - item.stock;

        if (newStock < 0) {
          throw new Error("insufficient_stock");
        }

        await updateDoc(productRef, { stock: newStock });
      }

      // Generate PIX payment
      const pixData = await generatePixPayment({
        orderId: "", // Will be set after order creation
        userId: user.id,
        sellerId: basketItems[0]?.product.owner || "",
        amount: total,
        transactionId: `PIX-${Date.now()}`,
      });

      if (!pixData) {
        throw new Error("Failed to generate PIX payment");
      }

      setPixPaymentData(pixData);
      showNotification("QR Code PIX gerado com sucesso!", "success");

      // Start polling for payment status
      startPaymentStatusPolling(pixData.transactionId!);
    } catch (error) {
      console.error("Error in checkout process:", error);

      // Handle specific error cases
      if (error instanceof Error && error.message === "insufficient_stock") {
        showNotification(
          t("checkout.notifications.insufficientStock"),
          "error"
        );
      } else {
        showNotification(t("checkout.notifications.paymentError"), "error");
      }

      setCountdown(null); // Reset countdown on error
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to calculate CRC16 for PIX payload
  const calculateCRC16 = (payload: string): string => {
    const polynomial = 0x1021;
    let crc = 0xffff;

    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ polynomial) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, "0");
  };

  // Function to generate PIX payload
  const generatePixPayload = (): string => {
    const pixKey = import.meta.env.VITE_PIX_KEY;
    const merchantName = import.meta.env.VITE_MERCHANT_NAME;
    const merchantCity = import.meta.env.VITE_MERCHANT_CITY;
    const amount = total.toFixed(2);

    // Merchant Account Information (26)
    const gui = "BR.GOV.BCB.PIX";
    const guiField = `00${gui.length.toString().padStart(2, "0")}${gui}`;
    const keyField = `01${pixKey.length.toString().padStart(2, "0")}${pixKey}`;
    const merchantAccountInfo = `26${(guiField + keyField).length
      .toString()
      .padStart(2, "0")}${guiField}${keyField}`;

    // Additional Data Field (62)
    const referenceLabel = "PIX";
    const additionalDataField = `62${("05" + "03" + referenceLabel).length
      .toString()
      .padStart(2, "0")}05${"03"}${referenceLabel}`;

    // Build the payload
    let payload =
      "000201" +
      merchantAccountInfo +
      "52040000" +
      "5303986" +
      "54" +
      amount.length.toString().padStart(2, "0") +
      amount +
      "5802BR" +
      "59" +
      merchantName.length.toString().padStart(2, "0") +
      merchantName +
      "60" +
      merchantCity.length.toString().padStart(2, "0") +
      merchantCity +
      additionalDataField;

    // CRC16
    payload += "6304";
    const crc = calculateCRC16(payload);
    return payload + crc;
  };

  const validatePixKey = (key: string, type: string): boolean => {
    const cpf = key.replace(/\D/g, "");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phone = key.replace(/\D/g, "");
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    switch (type) {
      case "cpf":
        return cpf.length === 11;
      case "email":
        return emailRegex.test(key);
      case "phoneNumber":
        return phone.length >= 10 && phone.length <= 11;
      case "random":
        return uuidRegex.test(key);
      default:
        return false;
    }
  };

  // Function to generate PIX payment
  const generatePixPayment = async (data: {
    orderId: string;
    userId: string;
    sellerId: string;
    amount: number;
    transactionId: string;
  }): Promise<PixPaymentData> => {
    if (!user) {
      showNotification(
        "Você precisa estar logado para fazer um pedido",
        "error"
      );
      return Promise.reject(new Error("User not logged in"));
    }

    try {
      setIsProcessing(true);

      // Validate environment variables
      const pixKey = import.meta.env.VITE_PIX_KEY;
      const pixKeyType = import.meta.env.VITE_PIX_KEY_TYPE;

      if (!pixKey || !pixKeyType) {
        showNotification("Missing required PIX configuration", "error");
        return Promise.reject(new Error("Missing PIX configuration"));
      }

      // Validate PIX key format
      if (!validatePixKey(pixKey, pixKeyType)) {
        showNotification("Invalid PIX key format", "error");
        return Promise.reject(new Error("Invalid PIX key format"));
      }

      // Generate PIX payload
      let pixPayload;
      try {
        pixPayload = generatePixPayload();
      } catch (error) {
        showNotification("Failed to generate PIX payload" + error, "error");
        return Promise.reject(new Error("Failed to generate PIX payload"));
      }

      // Create order in Firestore
      const orderData = {
        userId: user.id,
        items: basketItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          stock: item.stock,
          price: item.product.price,
          total: item.product.price * item.stock,
        })),
        shippingInfo: {
          fullName: formData.fullName,
          email: user.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        paymentMethod: "pix",
        total: data.amount,
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        pixPayment: {
          pixPayload: pixPayload,
          pixKey: pixKey,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      };

      let orderRef;
      try {
        orderRef = await addDoc(collection(firestoreDB, "orders"), orderData);
      } catch (error) {
        showNotification("Failed to create order" + error, "error");
        return Promise.reject(new Error("Failed to create order"));
      }

      if (!orderRef) {
        showNotification("Failed to create order", "error");
        return Promise.reject(new Error("Failed to create order"));
      }

      // Create PIX payment data
      const pixData: PixPaymentData = {
        id: orderRef.id, // Use order ID as payment ID
        orderId: orderRef.id,
        userId: user.id,
        sellerId: data.sellerId,
        pixKey,
        pixKeyType: pixKeyType as "cpf" | "email" | "phoneNumber" | "random",
        pixPayload,
        amount: data.amount,
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        transactionId: data.transactionId,
      };

      let pixPaymentRef;
      try {
        pixPaymentRef = await addDoc(
          collection(firestoreDB, "pixPayments"),
          pixData
        );
      } catch (error) {
        showNotification(
          "Failed to create PIX payment record" + error,
          "error"
        );
        return Promise.reject(new Error("Failed to create PIX payment record"));
      }

      if (!pixPaymentRef) {
        showNotification("Failed to create PIX payment record", "error");
        return Promise.reject(new Error("Failed to create PIX payment record"));
      }

      return pixData;
    } catch (error) {
      console.error("Error generating PIX payment:", error);
      showNotification(
        "Erro ao gerar pagamento PIX. Tente novamente.",
        "error"
      );
      return Promise.reject(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add payment status polling function
  const startPaymentStatusPolling = (transactionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const pixPaymentsRef = collection(firestoreDB, "pixPayments");
        const q = query(
          pixPaymentsRef,
          where("transactionId", "==", transactionId)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const pixPaymentDoc = querySnapshot.docs[0];
          const pixPaymentData = pixPaymentDoc.data() as PixPaymentData;

          if (pixPaymentData.status !== "pending") {
            clearInterval(pollInterval);

            if (pixPaymentData.status === "paid") {
              showNotification("Pagamento PIX confirmado!", "success");
              clearBasket();
              navigate("/order-confirmation");
            } else if (pixPaymentData.status === "expired") {
              showNotification("Tempo para pagamento PIX expirado.", "error");
            } else if (pixPaymentData.status === "failed") {
              showNotification(
                `Falha no pagamento: ${
                  pixPaymentData.errorMessage || "Erro desconhecido"
                }`,
                "error"
              );
            }
          }
        }
      } catch (error) {
        console.error("Error polling payment status:", error);
        clearInterval(pollInterval);

        if (error) {
          showNotification(
            `Erro ao verificar status do pagamento: ${error}`,
            "error"
          );
        } else {
          showNotification(
            "Erro ao verificar status do pagamento. Tente novamente.",
            "error"
          );
        }
      }
    }, 5000); // Poll every 5 seconds

    // Clear polling after 30 minutes (payment expiration)
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 30 * 60 * 1000);
  };

  // Update the updateProductQuantities function
  const updateProductQuantities = async (orderId: string) => {
    try {
      // Get the order details
      const orderRef = doc(firestoreDB, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) {
        throw new Error("Order not found");
      }

      const orderData = orderDoc.data();
      const items = orderData.items;

      // Use a transaction to ensure all updates are atomic
      await runTransaction(firestoreDB, async (transaction) => {
        for (const item of items) {
          const productRef = doc(firestoreDB, "products", item.productId);
          const productDoc = await transaction.get(productRef);

          if (!productDoc.exists()) {
            throw new Error(`Product ${item.productId} not found`);
          }

          const currentStock = productDoc.data().stock;
          const newStock = currentStock - item.stock;

          if (newStock < 0) {
            throw new Error(`Insufficient stock for product ${item.name}`);
          }

          transaction.update(productRef, { stock: newStock });
        }
      });

      return true;
    } catch (error) {
      console.error("Error updating product quantities:", error);
      throw error;
    }
  };

  // Update the PIX payment status check in useEffect
  useEffect(() => {
    if (pixPaymentData) {
      const unsubscribe = onSnapshot(
        doc(firestoreDB, "pixPayments", pixPaymentData.orderId),
        async (snapshot) => {
          const data = snapshot.data() as PixPaymentData;
          if (data) {
            setPixPaymentData(data);

            if (data.status === "paid") {
              try {
                // Update product quantities
                await updateProductQuantities(data.orderId);

                // Update order status
                const orderRef = doc(firestoreDB, "orders", data.orderId);
                await updateDoc(orderRef, {
                  status: "paid",
                  paidAt: new Date().toISOString(),
                });

                showNotification("Pagamento PIX confirmado!", "success");
                clearBasket();
                navigate("/order-confirmation");
              } catch (error) {
                console.error("Error processing payment confirmation:", error);
                showNotification(
                  "Erro ao processar confirmação do pagamento. Entre em contato com o suporte.",
                  "error"
                );
              }
            } else if (data.status === "expired") {
              showNotification("Tempo para pagamento PIX expirado.", "error");
            } else if (data.status === "failed") {
              showNotification(
                `Falha no pagamento: ${
                  data.errorMessage || "Erro desconhecido"
                }`,
                "error"
              );
            }
          }
        },
        (error) => {
          console.error("Error checking PIX payment status:", error);
          showNotification(
            "Erro ao verificar status do pagamento. Tente novamente.",
            "error"
          );
        }
      );

      return () => unsubscribe();
    }
  }, [clearBasket, navigate, pixPaymentData, showNotification]);

  // Update the useEffect for the countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    if (countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev !== null ? prev - 1 : null);
      }, 1000);
    } else if (countdown === 0) {
      // Clear basket and refresh products just before navigation
      clearBasket();
      if (productContext?.refreshProducts) {
        productContext.refreshProducts();
      }
      navigate("/my-purchases");
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [countdown]); // Only depend on countdown value

  if (!basketItems || basketItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carrinho Vazio</h1>
          <p className="text-gray-600 mb-4">
            Seu carrinho está vazio. Adicione alguns produtos antes de finalizar
            a compra.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continuar Comprando
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationContainer />
      <h1 className="text-2xl font-bold mb-8">{t("checkout.title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shipping and Payment Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipping Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                {t("checkout.shippingInfo")}
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t("auth.name")}
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm ${
                      formErrors.fullName
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                  />
                  {formErrors.fullName && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={user?.email || ""}
                    readOnly
                    disabled
                    className="mt-1 block w-full rounded-md shadow-sm bg-gray-100 border-gray-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Telefone
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm ${
                      formErrors.phoneNumber
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Endereço
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm ${
                      formErrors.address ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {formErrors.address && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Cidade
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        formErrors.city ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                    {formErrors.city && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="state"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Estado
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        formErrors.state ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                    {formErrors.state && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.state}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="zipCode"
                    className="block text-sm font-medium text-gray-700"
                  >
                    CEP
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="12345-678"
                    className={`mt-1 block w-full rounded-md shadow-sm ${
                      formErrors.zipCode ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {formErrors.zipCode && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.zipCode}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                {t("checkout.paymentMethod")}
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {t("checkout.pixDescription")}
                  </p>
                </div>

                {!pixPaymentData ? (
                  <div>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-gray-600">
                        {t("checkout.pixInstructions")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {t("checkout.pixPayment")}
                      </h3>

                      <div className="flex flex-col items-center justify-center mb-4">
                        {pixPaymentData && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center">
                            <div className="w-[200px] h-[200px] flex items-center justify-center">
                              <QRCodeSVG
                                value={pixPaymentData.pixPayload}
                                size={200}
                                level="H"
                                includeMargin={true}
                              />
                            </div>
                            <div className="mt-4 text-center">
                              <p className="text-sm text-gray-600">
                                {t("checkout.scanQRCode")}
                              </p>
                              <p className="text-sm text-gray-600 mt-2">
                                {t("checkout.copyPixKey")}:{" "}
                                {pixPaymentData.pixKey}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-center">
                        <p className="text-sm text-gray-600">
                          {t("checkout.pixKey")}: {pixPaymentData.pixKey}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t("checkout.amount")}: R${" "}
                          {pixPaymentData.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t("checkout.expiresAt")}:{" "}
                          {new Date(
                            pixPaymentData.expiresAt
                          ).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-center space-x-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              pixPaymentData.status === "paid"
                                ? "bg-green-500"
                                : pixPaymentData.status === "expired"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                            }`}
                          ></div>
                          <p className="text-sm text-gray-600">
                            {pixPaymentData.status === "paid"
                              ? t("checkout.paymentConfirmed")
                              : pixPaymentData.status === "expired"
                              ? t("checkout.paymentExpired")
                              : t("checkout.waitingPayment")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {pixPaymentData.status === "expired" && (
                      <button
                        type="button"
                        onClick={() =>
                          generatePixPayment({
                            orderId: pixPaymentData.orderId,
                            userId: user!.id,
                            sellerId: basketItems[0]?.product.owner || "",
                            amount: total,
                            transactionId: pixPaymentData.transactionId!,
                          })
                        }
                        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {t("checkout.generateNewQRCode")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || countdown !== null}
              className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isProcessing || countdown !== null
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  {t("checkout.processing")}
                </div>
              ) : countdown !== null ? (
                <div className="flex items-center justify-center">
                  {t("checkout.redirecting")} ({countdown}s)
                </div>
              ) : (
                t("checkout.placeOrder")
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("checkout.orderSummary")}
          </h2>
          <div className="space-y-4">
            {basketItems.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center space-x-4"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t("checkout.quantity")}: {item.stock}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  R${(item.product.price * item.stock).toFixed(2)}
                </p>
              </div>
            ))}
            <div className="border-t pt-4">
              <div className="flex justify-between text-base font-medium text-gray-900">
                <p>{t("common.total")}</p>
                <p>R${total.toFixed(2)}</p>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {t("checkout.shippingTaxes")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

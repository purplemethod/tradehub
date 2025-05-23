import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBasket } from "./context/useBasket";
import UserContext from "./context/UserContext";
import { useNotification } from "./context/NotificationContext";
import { NotificationContainer } from "./components/NotificationContainer";
import {
  collection,
  addDoc,
  doc,
  runTransaction,
  onSnapshot,
  updateDoc,
  getDoc,
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
  // Credit Card fields
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
  // Bank Transfer fields
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  // PIX fields
  pixKey: string;
}

interface FormErrors {
  [key: string]: string;
}

interface PixPaymentData {
  id?: string;
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
  transactionId?: string;
  errorMessage?: string;
}

type PaymentMethod = "credit_card" | "pix" | "bank_transfer";

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { basketItems, clearBasket } = useBasket();
  const { user } = useContext(UserContext)!;
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("credit_card");
  const [pixPaymentData, setPixPaymentData] = useState<PixPaymentData | null>(
    null
  );
  const { t } = useTranslation();

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userRef = doc(firestoreDB, "users", user.uid);
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
    // Credit Card fields
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
    // Bank Transfer fields
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    // PIX fields
    pixKey: "04025752964",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Calculate total from basketItems
  const total = basketItems.reduce(
    (sum, item) => sum + item.product.price * item.stock,
    0
  );

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneNumberRegex = /^\+?[\d\s-]{10,}$/;
    const zipCodeRegex = /^\d{5}-?\d{3}$/;
    const cardNumberRegex = /^\d{16}$/;
    const cvvRegex = /^\d{3,4}$/;
    const expiryDateRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;

    // Common fields validation
    if (!formData.fullName.trim()) {
      errors.fullName = t("checkout.validation.fullNameRequired");
    }

    if (!formData.email.trim()) {
      errors.email = t("checkout.validation.emailRequired");
    } else if (!emailRegex.test(formData.email)) {
      errors.email = t("checkout.validation.emailInvalid");
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

    // Payment method specific validation
    switch (paymentMethod) {
      case "credit_card":
        if (!formData.cardNumber.trim()) {
          errors.cardNumber = t("checkout.validation.cardNumberRequired");
        } else if (
          !cardNumberRegex.test(formData.cardNumber.replace(/\s/g, ""))
        ) {
          errors.cardNumber = t("checkout.validation.cardNumberInvalid");
        }

        if (!formData.cardName.trim()) {
          errors.cardName = t("checkout.validation.cardNameRequired");
        }

        if (!formData.expiryDate.trim()) {
          errors.expiryDate = t("checkout.validation.expiryDateRequired");
        } else if (!expiryDateRegex.test(formData.expiryDate)) {
          errors.expiryDate = t("checkout.validation.expiryDateInvalid");
        }

        if (!formData.cvv.trim()) {
          errors.cvv = t("checkout.validation.cvvRequired");
        } else if (!cvvRegex.test(formData.cvv)) {
          errors.cvv = t("checkout.validation.cvvInvalid");
        }
        break;

      case "bank_transfer":
        if (!formData.bankName.trim()) {
          errors.bankName = t("checkout.validation.bankNameRequired");
        }
        if (!formData.accountNumber.trim()) {
          errors.accountNumber = t("checkout.validation.accountNumberRequired");
        }
        if (!formData.accountHolder.trim()) {
          errors.accountHolder = t("checkout.validation.accountHolderRequired");
        }
        break;

      case "pix":
        if (!formData.pixKey.trim()) {
          errors.pixKey = t("checkout.validation.pixKeyRequired");
        }
        break;
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

    if (!validateForm()) {
      // Show the first error message
      const firstError = Object.values(formErrors)[0];
      showNotification(firstError, "error");
      return;
    }

    if (basketItems.length === 0) {
      showNotification(t("checkout.notifications.emptyCart"), "error");
      return;
    }

    try {
      setIsProcessing(true);
      showNotification(t("checkout.notifications.processing"), "info");

      // Update user data in Firestore with the latest information
      if (user) {
        const userRef = doc(firestoreDB, "users", user.uid);
        await updateDoc(userRef, {
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        });
      }

      if (paymentMethod === "pix") {
        await generatePixPayment();
        return;
      }

      // Create order in Firestore for other payment methods
      const orderData = {
        userId: user?.uid,
        items: basketItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          stock: item.stock,
          price: item.product.price,
          total: item.product.price * item.stock,
        })),
        shippingInfo: {
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        paymentInfo: {
          cardLast4: formData.cardNumber.slice(-4),
          cardName: formData.cardName,
        },
        total: total,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // Use a transaction to ensure all operations are atomic
      await runTransaction(firestoreDB, async (transaction) => {
        // Create the order
        await addDoc(collection(firestoreDB, "orders"), orderData);

        // Update product quantities
        for (const item of basketItems) {
          const productRef = doc(firestoreDB, "products", item.product.id);
          const productDoc = await transaction.get(productRef);

          if (!productDoc.exists()) {
            throw new Error(`Product ${item.product.id} not found`);
          }

          const newStock = productDoc.data().stock - item.stock;
          if (newStock < 0) {
            throw new Error(
              `Insufficient stock for product ${item.product.name}`
            );
          }

          transaction.update(productRef, { stock: newStock });
        }
      });

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      showNotification(t("checkout.notifications.orderSuccess"), "success");
      clearBasket();
      navigate("/my-purchases", { replace: true });
    } catch (error) {
      console.error("Error placing order:", error);
      showNotification(t("checkout.notifications.orderError"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to generate PIX payload according to Brazilian Central Bank specifications
  const generatePixPayload = (pixData: PixPaymentData): string => {
    const payload = [
      "00020126", // Payload Format Indicator
      "35", // Merchant Account Information
      "0014BR.GOV.BCB.PIX", // GUI
      "01", // Pix Key Type
      pixData.pixKeyType.length.toString().padStart(2, "0") +
        pixData.pixKeyType, // Pix Key Type Value
      "02", // Pix Key
      pixData.pixKey.length.toString().padStart(2, "0") + pixData.pixKey, // Pix Key Value
      "52040000", // Merchant Category Code
      "5303986", // Transaction Currency (BRL)
      "5802BR", // Country Code
      "5913", // Merchant Name
      "12", // Merchant Name Length
      "NITOS TRADEHUB STORE", // Merchant Name Value
      "6008", // Merchant City
      "06", // Merchant City Length
      "CURITIBA", // Merchant City Value
      "6207", // Additional Data Field
      "05", // Reference Label
      "03", // Reference Label Length
      "PIX", // Reference Label Value
      "6304", // CRC16
    ].join("");

    // Calculate CRC16 (this is a simplified version, in production use a proper CRC16 implementation)
    const data = Uint8Array.from(payload);
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i] << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) > 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
      }
    }
    // Perform a final XOR operation and return the CRC value
    return (crc ^ 0xffffffff).toString();
    // return `${crc} & 0xffff`;
  };

  // Function to generate PIX payment
  const generatePixPayment = async () => {
    if (!user) {
      showNotification(
        "Você precisa estar logado para fazer um pedido",
        "error"
      );
      return;
    }

    try {
      setIsProcessing(true);

      // Create order in Firestore
      const orderData = {
        userId: user.uid,
        items: basketItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          stock: item.stock,
          price: item.product.price,
          total: item.product.price * item.stock,
        })),
        shippingInfo: {
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        paymentMethod: "pix",
        total: total,
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes expiration
      };

      const orderRef = await addDoc(
        collection(firestoreDB, "orders"),
        orderData
      );

      // Create PIX payment data
      const pixData: PixPaymentData = {
        orderId: orderRef.id,
        userId: user.uid,
        sellerId: basketItems[0]?.product.owner || "",
        pixKey: "040.257.529.64", // Your PIX key
        pixKeyType: "cpf", // Type of your PIX key
        pixPayload: "", // Will be set after generation
        amount: total,
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      // Generate PIX payload
      const pixPayload = generatePixPayload(pixData);
      pixData.pixPayload = pixPayload;

      // In production, you would call your payment provider's API here
      // For example:
      // const paymentResponse = await paymentProvider.createPixPayment({
      //   amount: total,
      //   pixKey: pixData.pixKey,
      //   orderId: orderRef.id,
      //   expiresAt: pixData.expiresAt,
      // });

      const pixPaymentRef = await addDoc(
        collection(firestoreDB, "pixPayments"),
        {
          ...pixData,
          pixPayload,
          // transactionId: paymentResponse.transactionId, // In production
        }
      );

      setPixPaymentData({ ...pixData, id: pixPaymentRef.id, pixPayload });
      showNotification("QR Code PIX gerado com sucesso!", "success");
    } catch (error) {
      console.error("Error generating PIX payment:", error);
      showNotification(
        "Erro ao gerar pagamento PIX. Tente novamente.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
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
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm ${
                      formErrors.email ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.email}
                    </p>
                  )}
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

            {/* Payment Method Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                {t("checkout.paymentMethod")}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("credit_card")}
                    className={`p-4 border rounded-lg text-center ${
                      paymentMethod === "credit_card"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-500"
                    }`}
                  >
                    <div className="font-medium">
                      {t("checkout.creditCard")}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pix")}
                    className={`p-4 border rounded-lg text-center ${
                      paymentMethod === "pix"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-500"
                    }`}
                  >
                    <div className="font-medium">{t("checkout.pix")}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank_transfer")}
                    className={`p-4 border rounded-lg text-center ${
                      paymentMethod === "bank_transfer"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-500"
                    }`}
                  >
                    <div className="font-medium">
                      {t("checkout.bankTransfer")}
                    </div>
                  </button>
                </div>

                {/* Payment Forms */}
                {paymentMethod === "credit_card" && (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="cardNumber"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Número do Cartão
                      </label>
                      <input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        placeholder="1234 5678 9012 3456"
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          formErrors.cardNumber
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.cardNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.cardNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="cardName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nome no Cartão
                      </label>
                      <input
                        type="text"
                        id="cardName"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          formErrors.cardName
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.cardName && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.cardName}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="expiryDate"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Data de Expiração
                        </label>
                        <input
                          type="text"
                          id="expiryDate"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleInputChange}
                          placeholder="MM/AA"
                          className={`mt-1 block w-full rounded-md shadow-sm ${
                            formErrors.expiryDate
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                        />
                        {formErrors.expiryDate && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.expiryDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="cvv"
                          className="block text-sm font-medium text-gray-700"
                        >
                          CVV
                        </label>
                        <input
                          type="text"
                          id="cvv"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          placeholder="123"
                          className={`mt-1 block w-full rounded-md shadow-sm ${
                            formErrors.cvv
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                        />
                        {formErrors.cvv && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.cvv}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "pix" && (
                  <div className="space-y-4">
                    {!pixPaymentData ? (
                      <div>
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <p className="text-sm text-gray-600">
                            Preencha os dados de entrega e clique em "Finalizar
                            Compra" para gerar o QR Code PIX. O pedido será
                            confirmado automaticamente após a confirmação do
                            pagamento.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Pagamento PIX
                          </h3>

                          <div className="flex justify-center mb-4">
                            {pixPaymentData && (
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <QRCodeSVG
                                  value={pixPaymentData.pixPayload || ""}
                                  size={200}
                                  level="H"
                                  includeMargin={true}
                                />
                                <div className="mt-4 text-center">
                                  <p className="text-sm text-gray-600">
                                    Escaneie o QR Code com seu aplicativo
                                    bancário
                                  </p>
                                  <p className="text-sm text-gray-600 mt-2">
                                    Ou copie a chave PIX:{" "}
                                    {pixPaymentData.pixKey}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 text-center">
                            <p className="text-sm text-gray-600">
                              Chave PIX: {pixPaymentData.pixKey}
                            </p>
                            <p className="text-sm text-gray-600">
                              Valor: R$ {pixPaymentData.amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Expira em:{" "}
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
                                  ? "Pagamento confirmado"
                                  : pixPaymentData.status === "expired"
                                  ? "Tempo expirado"
                                  : "Aguardando pagamento"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {pixPaymentData.status === "expired" && (
                          <button
                            type="button"
                            onClick={generatePixPayment}
                            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Gerar novo QR Code
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "bank_transfer" && (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="bankName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nome do Banco
                      </label>
                      <input
                        type="text"
                        id="bankName"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          formErrors.bankName
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.bankName && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.bankName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="accountNumber"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Número da Conta
                      </label>
                      <input
                        type="text"
                        id="accountNumber"
                        name="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          formErrors.accountNumber
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.accountNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.accountNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="accountHolder"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nome do Titular
                      </label>
                      <input
                        type="text"
                        id="accountHolder"
                        name="accountHolder"
                        value={formData.accountHolder}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          formErrors.accountHolder
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.accountHolder && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.accountHolder}
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Após o pedido, você receberá os dados bancários para
                        transferência. O pedido será confirmado após a
                        confirmação do pagamento.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isProcessing ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  {t("checkout.processing")}
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

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
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  Timestamp,
  DocumentReference,
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
  couponCode: string;
  // Installment fields
  paymentMethod: 'pix' | 'installment';
  installments: number;
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

interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  expiresAt?: Timestamp;
  minimumPurchase?: number;
  productIds?: string[]; // Array of product IDs this coupon applies to
  maxUses?: number;
  currentUses?: number;
}

interface OrderData {
  userId: string;
  items: {
    productId: string;
    name: string;
    stock: number;
    price: number;
    total: number;
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
  paymentMethod: 'pix' | 'installment';
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
  };
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
  const [discount, setDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string>("");
  const [appliedCouponRef, setAppliedCouponRef] = useState<DocumentReference | null>(null);

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
    couponCode: "",
    // Installment fields
    paymentMethod: 'pix',
    installments: 1,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Calculate total from basketItems
  const total = basketItems.reduce(
    (sum, item) => sum + item.product.price * item.stock,
    0
  ) - discount;

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
      showNotification(t("checkout.notifications.processingOrder"), "info");

      // Check product availability and stock before proceeding
      for (const item of basketItems) {
        const productRef = doc(firestoreDB, "products", item.product.id);
        const productDoc = await getDoc(productRef);

        if (!productDoc.exists()) {
          showNotification(
            t("checkout.notifications.productNotFound", { name: item.product.name }),
            "error"
          );
          setIsProcessing(false);
          return;
        }

        const currentStock = productDoc.data().stock;
        if (currentStock < item.stock) {
          showNotification(
            t("checkout.notifications.insufficientStock", {
              name: item.product.name,
              available: currentStock,
              requested: item.stock
            }),
            "error"
          );
          setIsProcessing(false);
          return;
        }
      }

      // Update user data in Firestore with the latest information
      const userRef = doc(firestoreDB, "users", user.id);
      await updateDoc(userRef, {
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      });

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
      
      // Show success notification for 3 seconds then redirect
      setTimeout(() => {
        clearBasket();
        if (productContext?.refreshProducts) {
          productContext.refreshProducts();
        }
        navigate("/my-purchases");
      }, 3000);

      return pixData;
    } catch (error) {
      console.error("Error in checkout process:", error);
        showNotification(t("checkout.notifications.paymentError"), "error");
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
      throw new Error("User not logged in");
    }

    try {
      setIsProcessing(true);

      // Validate environment variables
      const pixKey = import.meta.env.VITE_PIX_KEY;
      const pixKeyType = import.meta.env.VITE_PIX_KEY_TYPE;

      if (!pixKey || !pixKeyType) {
        throw new Error("Missing PIX configuration");
      }

      // Validate PIX key format
      if (!validatePixKey(pixKey, pixKeyType)) {
        throw new Error("Invalid PIX key format");
      }

      // Generate PIX payload
      let pixPayload;
      try {
        pixPayload = generatePixPayload();
      } catch {
        throw new Error("Failed to generate PIX payload");
      }

      // Create order in Firestore
      const orderData: OrderData = {
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
        paymentMethod: formData.paymentMethod,
        total: data.amount,
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        ...(formData.paymentMethod === 'pix' ? {
        pixPayment: {
          pixPayload: pixPayload,
          pixKey: pixKey,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          }
        } : {
          installmentPayment: {
            installments: formData.installments,
            installmentValue: total / formData.installments,
            nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            remainingInstallments: formData.installments,
            paidInstallments: 0,
          }
        }),
      };

      let orderRef;
      try {
        orderRef = await addDoc(collection(firestoreDB, "orders"), orderData);
      } catch (error) {
        console.error("Error creating order:", error);
        throw new Error("Failed to create order");
      }

      // Update order with PIX payment data if applicable
      if (formData.paymentMethod === 'pix') {
        await updateDoc(orderRef, {
          pixPayment: {
            ...orderData.pixPayment,
            orderId: orderRef.id,
          },
        });
      }

      // Update product stock
      for (const item of basketItems) {
        const productRef = doc(firestoreDB, "products", item.product.id);
        const productDoc = await getDoc(productRef);
        
        if (productDoc.exists()) {
          const currentStock = productDoc.data().stock;
          await updateDoc(productRef, {
            stock: currentStock - item.stock
          });
        }
      }
      
      // Clear basket immediately after successful order creation
      clearBasket();
      
      // If there's an applied coupon, increment its currentUses
      if (appliedCouponRef) {
        const couponDoc = await getDoc(appliedCouponRef);
        if (couponDoc.exists()) {
          const couponData = couponDoc.data();
          await updateDoc(appliedCouponRef, {
            currentUses: (couponData.currentUses || 0) + 1
          });
        }
      }

      const pixPaymentData: PixPaymentData = {
        id: orderRef.id,
        orderId: orderRef.id,
        userId: user.id,
        sellerId: basketItems[0]?.product.owner || "",
        pixKey,
        pixKeyType: pixKeyType as "cpf" | "email" | "phoneNumber" | "random",
        pixPayload,
        amount: data.amount,
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        transactionId: data.transactionId,
      };

      setPixPaymentData(pixPaymentData);
      showNotification(t("checkout.notifications.orderSuccess"), "success");
      
      // Show success notification for 3 seconds then redirect
      setTimeout(() => {
        clearBasket();
        if (productContext?.refreshProducts) {
          productContext.refreshProducts();
        }
        navigate("/my-purchases");
      }, 3000);

      return pixPaymentData;
    } catch (error) {
      console.error("Error generating PIX payment:", error);
      showNotification(
        "Erro ao gerar pagamento PIX. Tente novamente.",
        "error"
      );
      setIsProcessing(false);
      throw error;
    }
  };

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

  const handleApplyCoupon = async () => {
    if (!formData.couponCode.trim()) {
      setCouponError(t("checkout.validation.couponRequired"));
      return;
    }

    try {
      // Query the coupons collection
      const couponsRef = collection(firestoreDB, "coupons");
      const q = query(
        couponsRef,
        where("code", "==", formData.couponCode.toUpperCase()),
        where("isActive", "==", true)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setCouponError(t("checkout.validation.invalidCoupon"));
        setDiscount(0);
        setAppliedCouponRef(null);
        return;
      }

      const couponDoc = querySnapshot.docs[0];
      const couponData = couponDoc.data() as Coupon;

      // Check if coupon is expired
      if (couponData.expiresAt && couponData.expiresAt.toDate() < new Date()) {
        setCouponError(t("checkout.validation.expiredCoupon"));
        setDiscount(0);
        setAppliedCouponRef(null);
        return;
      }

      // Check if coupon has minimum purchase amount
      if (couponData.minimumPurchase && total < couponData.minimumPurchase) {
        setCouponError(t("checkout.validation.minimumPurchase", { amount: couponData.minimumPurchase }));
        setDiscount(0);
        setAppliedCouponRef(null);
        return;
    }

      // Check if coupon has reached maximum uses
      if (couponData.maxUses && couponData.currentUses && couponData.currentUses >= couponData.maxUses) {
        setCouponError(t("checkout.validation.couponLimitReached"));
        setDiscount(0);
        setAppliedCouponRef(null);
        return;
      }

      // Calculate discount
      let discountAmount = 0;

      if (couponData.productIds && couponData.productIds.length > 0) {
        // Product-specific coupon
        const eligibleItems = basketItems.filter(item => 
          couponData.productIds!.includes(item.product.id)
        );

        if (eligibleItems.length === 0) {
          setCouponError(t("checkout.validation.couponNotEligible"));
          setDiscount(0);
          setAppliedCouponRef(null);
          return;
        }

        const eligibleTotal = eligibleItems.reduce(
          (sum, item) => sum + item.product.price * item.stock,
          0
        );

        if (couponData.discountType === "percentage") {
          discountAmount = (eligibleTotal * couponData.discountValue) / 100;
        } else {
          discountAmount = couponData.discountValue;
            }
      } else {
        // Generic coupon
        if (couponData.discountType === "percentage") {
          discountAmount = (total * couponData.discountValue) / 100;
        } else {
          discountAmount = couponData.discountValue;
        }
      }

      // Ensure discount doesn't exceed total
      discountAmount = Math.min(discountAmount, total);

      setDiscount(discountAmount);
      setCouponError("");
      setAppliedCouponRef(couponDoc.ref); // Store coupon ref for later use
      showNotification(t("checkout.notifications.couponApplied"), "success");
    } catch (error) {
      console.error("Error applying coupon:", error);
      setCouponError(t("checkout.validation.couponError"));
      setDiscount(0);
      setAppliedCouponRef(null);
    }
  };

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
            onClick={() => navigate("/home")}
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
                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="pix"
                        checked={formData.paymentMethod === 'pix'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">PIX</span>
                    </label>
                    <label className={`flex items-center ${total < 500 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="installment"
                        checked={formData.paymentMethod === 'installment'}
                        onChange={handleInputChange}
                        disabled={total < 500}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t("checkout.installments")}</span>
                    </label>
                  </div>
                  {total < 500 && (
                    <p className="text-sm text-gray-500 mt-2">
                      {t("checkout.minInstallmentValue")}
                    </p>
                  )}
                </div>

                {/* PIX Payment Section */}
                {formData.paymentMethod === 'pix' && (
                  <>
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
                  </>
                )}

                {/* Installment Payment Section */}
                {formData.paymentMethod === 'installment' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {t("checkout.installmentsDescription")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t("checkout.selectInstallments")}
                      </label>
                      <select
                        name="installments"
                        value={formData.installments}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        {(() => {
                          const maxAllowedInstallments = Math.min(
                            10,
                            Math.max(
                              ...basketItems.map(item => 
                                item.product.allowInstallments ? (item.product.maxInstallments || 1) : 1
                              )
                            )
                          );
                          return Array.from({ length: maxAllowedInstallments }, (_, i) => i + 1).map((num) => {
                            let installmentValue = total / num;
                            let displayTotal = total;
                            
                            // Add 2% interest for installments beyond 5x
                            if (num > 6) {
                              const interestRate = 0.02;
                              displayTotal = total * (1 + interestRate);
                              installmentValue = displayTotal / num;
                            }

                            return (
                              <option key={num} value={num}>
                                {num}x {t("checkout.installments")} - R${installmentValue.toFixed(2)} ({t("checkout.installmentTotal")}: R${displayTotal.toFixed(2)})
                                {num > 6 && ` (+2% ${t("checkout.interest")})`}
                              </option>
                            );
                          });
                        })()}
                      </select>
                      <p className="text-sm text-gray-500">
                        {t("checkout.installmentTotal")}: R${total.toFixed(2)}
                      </p>

                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coupon Code Section */}
            {!pixPaymentData && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  {t("checkout.couponCode")}
                </h2>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      id="couponCode"
                      name="couponCode"
                      value={formData.couponCode}
                      onChange={handleInputChange}
                      placeholder={t("checkout.couponPlaceholder")}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        couponError ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                    {couponError && (
                      <p className="mt-1 text-sm text-red-600">{couponError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="mt-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t("checkout.applyCoupon")}
                  </button>
                </div>
              </div>
            )}

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
            {discount > 0 && (
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <p>{t("common.discount")}</p>
                <p>-R${discount.toFixed(2)}</p>
              </div>
            )}
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

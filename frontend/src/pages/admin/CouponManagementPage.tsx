import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

import { useNotification } from "../context/NotificationContext";
import { firestoreDB } from "../utils/FirebaseConfig";

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed" | "installment";
  discountValue: number;
  isActive: boolean;
  expiresAt: Timestamp;
  minimumPurchase: number;
  maxUses: number;
  currentUses: number;
  productIds?: string[];
  minInstallments: number;
  maxInstallments: number;
  installmentDiscount: {
    type: "percentage" | "fixed";
    value: number;
  };
}

const CouponManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed" | "installment",
    discountValue: 0,
    isActive: true,
    expiresAt: "",
    minimumPurchase: 0,
    maxUses: 0,
    productIds: [] as string[],
    minInstallments: 6,
    maxInstallments: 12,
    installmentDiscount: {
      type: "percentage" as "percentage" | "fixed",
      value: 0
    }
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const couponsRef = collection(firestoreDB, "coupons");
      const snapshot = await getDocs(couponsRef);
      const couponsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        expiresAt: doc.data().expiresAt instanceof Timestamp ? doc.data().expiresAt : Timestamp.fromDate(new Date(doc.data().expiresAt)),
      })) as Coupon[];
      setCoupons(couponsList);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      showNotification(t("admin.coupons.errors.fetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const couponData = {
        ...formData,
        expiresAt: Timestamp.fromDate(new Date(formData.expiresAt)),
        currentUses: editingCoupon?.currentUses || 0,
        ...(formData.discountType === 'installment' ? {
          minInstallments: formData.minInstallments,
          maxInstallments: formData.maxInstallments,
          installmentDiscount: formData.installmentDiscount
        } : {})
      };

      if (editingCoupon) {
        await updateDoc(
          doc(firestoreDB, "coupons", editingCoupon.id),
          couponData
        );
        showNotification(
          t("admin.coupons.notifications.updateSuccess"),
          "success"
        );
      } else {
        await addDoc(collection(firestoreDB, "coupons"), couponData);
        showNotification(
          t("admin.coupons.notifications.createSuccess"),
          "success"
        );
      }

      setIsModalOpen(false);
      setEditingCoupon(null);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error("Error saving coupon:", error);
      showNotification(t("admin.coupons.errors.saveFailed"), "error");
    }
  };

  const handleDelete = async (couponId: string) => {
    if (window.confirm(t("admin.coupons.deleteConfirmation"))) {
      try {
        await deleteDoc(doc(firestoreDB, "coupons", couponId));
        showNotification(
          t("admin.coupons.notifications.deleteSuccess"),
          "success"
        );
        fetchCoupons();
      } catch (error) {
        console.error("Error deleting coupon:", error);
        showNotification(t("admin.coupons.errors.deleteFailed"), "error");
      }
    }
  };

  const handleEdit = (coupon: Coupon) => {
    const date = coupon.expiresAt?.toDate?.();
    const formattedDate = date instanceof Date && !isNaN(date.getTime()) 
      ? date.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
      : "";

    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      isActive: coupon.isActive,
      expiresAt: formattedDate,
      minimumPurchase: coupon.minimumPurchase,
      maxUses: coupon.maxUses,
      productIds: coupon.productIds || [],
      minInstallments: coupon.minInstallments,
      maxInstallments: coupon.maxInstallments,
      installmentDiscount: coupon.installmentDiscount,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discountType: "percentage",
      discountValue: 0,
      isActive: true,
      expiresAt: "",
      minimumPurchase: 0,
      maxUses: 0,
      productIds: [],
      minInstallments: 6,
      maxInstallments: 12,
      installmentDiscount: {
        type: "percentage",
        value: 0
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("admin.coupons.title")}
        </h1>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {t("admin.coupons.addNew")}
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {coupons.map((coupon) => (
            <li key={coupon.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {coupon.code}
                    </p>
                    <span
                      className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        coupon.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {coupon.isActive
                        ? t("admin.coupons.active")
                        : t("admin.coupons.inactive")}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : coupon.discountType === "fixed"
                        ? `${t("common.currency")}${coupon.discountValue}`
                        : `${t("admin.coupons.installment")} ${coupon.minInstallments}-${coupon.maxInstallments}`}
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      {t("admin.coupons.uses")}: {coupon.currentUses}/
                      {coupon.maxUses}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    {t("admin.coupons.expires")}:{" "}
                    {coupon.expiresAt.toDate().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setIsModalOpen(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75 pointer-events-auto"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-20 pointer-events-auto">
              <form onSubmit={handleSubmit} className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingCoupon
                    ? t("admin.coupons.editCoupon")
                    : t("admin.coupons.addNew")}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("admin.coupons.code")}
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("admin.coupons.discountType")}
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountType: e.target.value as "percentage" | "fixed" | "installment",
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="percentage">
                        {t("admin.coupons.percentage")}
                      </option>
                      <option value="fixed">{t("admin.coupons.fixed")}</option>
                      <option value="installment">{t("admin.coupons.installment")}</option>
                    </select>
                  </div>

                  {formData.discountType === 'installment' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("admin.coupons.minInstallments")}
                        </label>
                        <input
                          type="number"
                          value={formData.minInstallments}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              minInstallments: Number(e.target.value),
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("admin.coupons.maxInstallments")}
                        </label>
                        <input
                          type="number"
                          value={formData.maxInstallments}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxInstallments: Number(e.target.value),
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                          min={formData.minInstallments}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("admin.coupons.installmentDiscountType")}
                        </label>
                        <select
                          value={formData.installmentDiscount.type}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              installmentDiscount: {
                                ...formData.installmentDiscount,
                                type: e.target.value as "percentage" | "fixed"
                              }
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="percentage">
                            {t("admin.coupons.percentage")}
                          </option>
                          <option value="fixed">{t("admin.coupons.fixed")}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("admin.coupons.installmentDiscountValue")}
                        </label>
                        <input
                          type="number"
                          value={formData.installmentDiscount.value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              installmentDiscount: {
                                ...formData.installmentDiscount,
                                value: Number(e.target.value)
                              }
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                          min="0"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("admin.coupons.discountValue")}
                      </label>
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountValue: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                        min="0"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("admin.coupons.expiresAt")}
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) =>
                        setFormData({ ...formData, expiresAt: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("admin.coupons.minimumPurchase")}
                    </label>
                    <input
                      type="number"
                      value={formData.minimumPurchase}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minimumPurchase: Number(e.target.value),
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("admin.coupons.maxUses")}
                    </label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxUses: Number(e.target.value),
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                      min="0"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isActive)}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      {t("admin.coupons.isActive")}
                    </label>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  >
                    {editingCoupon
                      ? t("common.save")
                      : t("admin.coupons.create")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingCoupon(null);
                      resetForm();
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagementPage;
 
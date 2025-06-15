import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestoreDB } from "./utils/FirebaseConfig";
import { useTranslation } from "react-i18next";
import { useNotification } from "./context/NotificationContext";
import { useBasket } from "./context/BasketContext";
import UserContext from "./context/UserContext";
import ImageModal from "./components/ImageModal";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { Product, ProductQuestion } from "../types";

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { addToBasket, getBasketItem } = useBasket();
  const { user } = useContext(UserContext)!;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [answer, setAnswer] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;

      try {
        const productRef = doc(firestoreDB, "products", productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          setProduct({ id: productSnap.id, ...productSnap.data() } as Product);
        } else {
          showNotification(t("products.errors.notFound"), "error");
          navigate("/home", { replace: true });
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        showNotification(t("products.errors.fetchFailed"), "error");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, navigate, showNotification, t]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!productId) return;

      try {
        const questionsRef = collection(firestoreDB, "products-questions");
        const q = query(questionsRef, where("productId", "==", productId));
        const querySnapshot = await getDocs(q);
        const questionsData = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            answeredAt: doc.data().answeredAt?.toDate(),
          }))
          .sort(
            (a, b) =>
              (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
          ) as ProductQuestion[];
        setQuestions(questionsData);
      } catch (error) {
        console.error("Error fetching questions:", error);
        showNotification(t("products.errors.fetchQuestionsFailed"), "error");
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [productId, showNotification, t]);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (product.stock <= 0) {
      showNotification(t("products.errors.outOfStock"), "error");
      return;
    }

    const basketItem = await getBasketItem(product.id);
    if (basketItem && basketItem.stock >= product.stock) {
      showNotification(t("products.errors.maxStockReached"), "error");
      return;
    }

    const result = await addToBasket(product);
    if (result.success) {
      showNotification(t("products.addedToCart"), "success");
    } else {
      showNotification(result.reason || t("products.addToCartError"), "error");
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !productId || !question.trim() || !user.email || !product)
      return;

    try {
      const questionsRef = collection(firestoreDB, "products-questions");
      await addDoc(questionsRef, {
        productId,
        userEmail: user.email,
        userName: user.displayName || "Anonymous",
        question: question.trim(),
        productOwnerEmail: product.owner,
        createdAt: serverTimestamp(),
      });

      showNotification(t("products.questionSubmitted"), "success");
      setQuestion("");
      // Refresh questions
      const q = query(questionsRef, where("productId", "==", productId));
      const querySnapshot = await getDocs(q);
      const questionsData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          answeredAt: doc.data().answeredAt?.toDate(),
        }))
        .sort(
          (a, b) =>
            (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        ) as ProductQuestion[];
      setQuestions(questionsData);
    } catch (error) {
      console.error("Error submitting question:", error);
      showNotification(t("products.errors.submitQuestionFailed"), "error");
    }
  };

  const handleSubmitAnswer = async (questionId: string) => {
    if (!answer[questionId]?.trim()) return;

    try {
      const questionRef = doc(firestoreDB, "products-questions", questionId);
      await updateDoc(questionRef, {
        answer: answer[questionId].trim(),
        answeredAt: serverTimestamp(),
      });

      showNotification(t("products.answerSubmitted"), "success");
      setAnswer((prev) => ({ ...prev, [questionId]: "" }));
      // Refresh questions
      const questionsRef = collection(firestoreDB, "products-questions");
      const q = query(questionsRef, where("productId", "==", productId));
      const querySnapshot = await getDocs(q);
      const questionsData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          answeredAt: doc.data().answeredAt?.toDate(),
        }))
        .sort(
          (a, b) =>
            (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        ) as ProductQuestion[];
      setQuestions(questionsData);
    } catch (error) {
      console.error("Error submitting answer:", error);
      showNotification(t("products.errors.submitAnswerFailed"), "error");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm(t("products.deleteQuestionConfirmation"))) return;

    try {
      const questionRef = doc(firestoreDB, "products-questions", questionId);
      await deleteDoc(questionRef);

      showNotification(t("products.questionDeleted"), "success");
      // Refresh questions
      const questionsRef = collection(firestoreDB, "products-questions");
      const q = query(questionsRef, where("productId", "==", productId));
      const querySnapshot = await getDocs(q);
      const questionsData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          answeredAt: doc.data().answeredAt?.toDate(),
        }))
        .sort(
          (a, b) =>
            (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        ) as ProductQuestion[];
      setQuestions(questionsData);
    } catch (error) {
      console.error("Error deleting question:", error);
      showNotification(t("products.errors.deleteQuestionFailed"), "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
        {/* Image gallery */}
        <div className="lg:max-w-lg">
          <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden">
            <img
              src={
                product.imageMetadataRef?.[selectedImageIndex]
                  ?.thumbnailDataURL ?? ""
              }
              alt={product.name}
              className="w-full h-full object-center object-cover cursor-pointer"
              onClick={() => handleImageClick(selectedImageIndex)}
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {product.imageMetadataRef?.map((image, index) => (
              <div
                key={index}
                className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => setSelectedImageIndex(index)}
              >
                <img
                  src={image.thumbnailDataURL ?? ""}
                  alt={`${product.name} - Image ${index + 1}`}
                  className="w-full h-full object-center object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Product info */}
        <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {product.name}
          </h1>

          <div className="mt-3">
            <h2 className="sr-only">Product information</h2>
            <p className="text-3xl text-gray-900">
              {t("products.currency")}
              {product.price.toFixed(2)}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="sr-only">Description</h3>
            <div className="text-base text-gray-700 space-y-6">
              <p>{product.description}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-gray-900">{t("products.condition")}:</h3>
              <p className="ml-2 text-sm text-gray-500">{t(`products.conditions.${product.condition}`)}</p>
            </div>
            <div className="flex items-center mt-2">
              <h3 className="text-sm font-medium text-gray-900">{t("products.category")}:</h3>
              <p className="ml-2 text-sm text-gray-500">{t(`products.categories.${product.category}`)}</p>
            </div>
            <div className="flex items-center mt-2">
              <h3 className="text-sm font-medium text-gray-900">Stock:</h3>
              <p className="ml-2 text-sm text-gray-500">
                {product.stock} available
              </p>
            </div>
          </div>

          <div className="mt-10">
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className={`w-full bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                product.stock <= 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {product.stock <= 0
                ? t("products.outOfStock")
                : t("products.addToCart")}
            </button>
          </div>
        </div>
      </div>

      {/* Questions section */}
      <div className="mt-16 border-t border-gray-200 pt-10">
        <h2 className="text-2xl font-bold text-gray-900">
          {t("products.questionsAndAnswers")}
        </h2>

        {/* Question Form */}
        {user && (
          <div className="mt-6">
            <form onSubmit={handleSubmitQuestion} className="space-y-4">
              <div>
                <label
                  htmlFor="question"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("products.askQuestion")}
                </label>
                <div className="mt-1">
                  <textarea
                    id="question"
                    name="question"
                    rows={3}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t("products.questionPlaceholder")}
                  />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={!question.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("products.submitQuestion")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions List */}
        <div className="mt-8 space-y-6">
          {loadingQuestions ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : questions.length === 0 ? (
            <p className="text-gray-500 text-center">
              {t("products.noQuestions")}
            </p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {q.userName}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-500">
                          {q.createdAt.toLocaleDateString()}
                        </p>
                        {user?.email === product?.owner && (
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-red-600 hover:text-red-800"
                            title={t("products.deleteQuestion")}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-gray-700">{q.question}</p>

                    {q.answer ? (
                      <div className="mt-4 pl-4 border-l-4 border-indigo-200">
                        <p className="text-sm text-gray-500">
                          {t("products.answer")}
                        </p>
                        <p className="mt-1 text-gray-700">{q.answer}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {q.answeredAt?.toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      user?.email === product?.owner && (
                        <div className="mt-4">
                          <textarea
                            rows={2}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            value={answer[q.id] || ""}
                            onChange={(e) =>
                              setAnswer((prev) => ({
                                ...prev,
                                [q.id]: e.target.value,
                              }))
                            }
                            placeholder={t("products.answerPlaceholder")}
                          />
                          <button
                            onClick={() => handleSubmitAnswer(q.id)}
                            disabled={!answer[q.id]?.trim()}
                            className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t("products.submitAnswer")}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Image Modal */}
      {product.imageMetadataRef && (
        <ImageModal
          isOpen={isModalOpen}
          thumbnailDataURL={
            product.imageMetadataRef[selectedImageIndex]?.thumbnailDataURL ??
            null
          }
          fullImageRef={
            product.imageMetadataRef[selectedImageIndex]?.fullImageRef ??
            undefined
          }
          onClose={() => setIsModalOpen(false)}
          images={product.imageMetadataRef
            .map((img) => img.fullImageRef)
            .filter((ref): ref is string => !!ref)}
          currentIndex={selectedImageIndex}
          onNext={() =>
            setSelectedImageIndex((prev) =>
              prev < (product.imageMetadataRef?.length ?? 0) - 1
                ? prev + 1
                : prev
            )
          }
          onPrevious={() =>
            setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : prev))
          }
          type={product.imageMetadataRef[selectedImageIndex]?.type}
          videoId={
            product.imageMetadataRef[selectedImageIndex]?.videoId ?? undefined
          }
        />
      )}
    </div>
  );
};

export default ProductDetailPage;

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firestoreDB } from './utils/FirebaseConfig';
import { useContext } from 'react';
import UserContext from './context/UserContext';
import { QRCodeSVG } from 'qrcode.react';

interface Order {
  id: string;
  userId: string;
  items: Array<{
    productId: string;
    name: string;
    stock: number;
    price: number;
    total: number;
  }>;
  shippingInfo: {
    fullName: string;
    email: string;
    phoneNumber: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentInfo?: {
    cardLast4?: string;
    cardName?: string;
  };
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  pixPayment?: {
    pixPayload: string;
    pixKey: string;
    expiresAt: string;
  };
}

const MyPurchasesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useContext(UserContext)!;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const ordersRef = collection(firestoreDB, 'orders');
        const q = query(
          ordersRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];

        setOrders(ordersData);
      } catch (err) {
        setError(t('orders.fetchError'));
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, t]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('orders.myPurchases')}</h1>
        <div className="text-center text-gray-600">
          {t('orders.noPurchases')}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('orders.myPurchases')}</h1>
      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {t('orders.orderNumber')}: {order.id}
                </h2>
                <p className="text-gray-600">
                  {t('orders.orderDate')}: {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {t(`orders.status.${order.status}`)}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium mb-2">{t('orders.items')}</h3>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} x {item.stock}</span>
                    <span>${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">{t('orders.total')}</span>
                <span className="font-bold">${order.total.toFixed(2)}</span>
              </div>
            </div>

            {order.status === 'pending' && order.pixPayment && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="font-medium mb-4">{t('orders.pixPayment')}</h3>
                <div className="flex flex-col items-center bg-gray-50 p-4 rounded-lg">
                  <div className="w-48 h-48 mb-4">
                    <QRCodeSVG
                      value={order.pixPayment.pixPayload}
                      size={192}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      {t('orders.scanQRCode')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('orders.pixKey')}: {order.pixPayment.pixKey}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {t('orders.expiresAt')}: {new Date(order.pixPayment.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-medium mb-2">{t('orders.shippingAddress')}</h3>
              <p className="text-sm text-gray-600">
                {order.shippingInfo.fullName}<br />
                {order.shippingInfo.address}<br />
                {order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.zipCode}<br />
                {order.shippingInfo.phoneNumber}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPurchasesPage; 
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFavorites } from './context/FavoritesContext';
import { Link } from 'react-router-dom';
import Loading from './Loading';
import { doc, getDoc } from 'firebase/firestore';
import { firestoreDB } from './utils/FirebaseConfig';
import type { Product } from '../types';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useNotification } from './context/NotificationContext';

interface FavoriteWithProduct {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
  product: Product;
}

const MyFavoritesPage: React.FC = () => {
  const { t } = useTranslation();
  const { favorites, removeFromFavorites } = useFavorites();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [favoritesWithProducts, setFavoritesWithProducts] = useState<FavoriteWithProduct[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsPromises = favorites.map(async (favorite) => {
          const productDoc = await getDoc(doc(firestoreDB, 'products', favorite.productId));
          if (productDoc.exists()) {
            const productData = productDoc.data();
            return {
              ...favorite,
              product: {
                id: productDoc.id,
                name: productData.name,
                description: productData.description,
                price: productData.price,
                category: productData.category,
                condition: productData.condition,
                stock: productData.stock,
                owner: productData.owner,
                createdAt: productData.createdAt,
                imageMetadataRef: productData.imageMetadataRef || [],
                userId: productData.userId,
                updatedAt: productData.updatedAt,
                brand: productData.brand,
                weight: productData.weight,
                dimensions: productData.dimensions,
                shippingCost: productData.shippingCost,
                freeShipping: productData.freeShipping,
                status: productData.status
              } as Product
            };
          }
          return null;
        });

        const results = await Promise.all(productsPromises);
        setFavoritesWithProducts(results.filter((result): result is FavoriteWithProduct => result !== null));
      } catch (error) {
        console.error('Error fetching favorite products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [favorites]);

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await removeFromFavorites(productId);
    } catch (error) {
      console.error('Error removing favorite:', error);
      showNotification(t('products.favoriteRemoveError'), 'error');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('favorites.title')}</h1>
      
      {favoritesWithProducts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">{t('favorites.empty')}</p>
          <Link
            to="/home"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            {t('favorites.browseProducts')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoritesWithProducts.map((favorite) => (
            <div
              key={favorite.id}
              className="bg-white rounded-lg shadow-md overflow-hidden relative"
            >
              <button
                onClick={() => handleRemoveFavorite(favorite.productId)}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors z-10"
                title={t('products.removeFromFavorites')}
              >
                <TrashIcon className="h-5 w-5 text-red-500" />
              </button>
              <Link to={`/product/${favorite.productId}`}>
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={favorite.product.imageMetadataRef?.[0]?.thumbnailDataURL || '/placeholder.png'}
                    alt={favorite.product.name}
                    className="object-cover w-full h-48"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-2">{favorite.product.name}</h2>
                  <p className="text-gray-600 mb-2">{favorite.product.description}</p>
                  <p className="text-indigo-600 font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(favorite.product.price)}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFavoritesPage; 
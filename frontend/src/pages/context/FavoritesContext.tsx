import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { firestoreDB } from '../utils/FirebaseConfig';
import UserContext from './UserContext';
import { useNotification } from './NotificationContext';
import { useTranslation } from 'react-i18next';

interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

interface FavoritesContextType {
  favorites: Favorite[];
  favoritesLoading: boolean;
  addToFavorites: (productId: string) => Promise<void>;
  removeFromFavorites: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const userContext = useContext(UserContext);
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  // Listen to favorites changes
  useEffect(() => {
    if (!userContext?.user) {
      setFavorites([]);
      setFavoritesLoading(false);
      return;
    }

    setFavoritesLoading(true);
    const userId = userContext.user.uid;

    const q = query(
      collection(firestoreDB, 'favorites'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const favoritesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Favorite[];
        setFavorites(favoritesList);
        setFavoritesLoading(false);
      },
      (error) => {
        console.error('Error fetching favorites:', error);
        showNotification(t('favorites.errors.fetchFailed'), 'error');
        setFavoritesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userContext?.user, showNotification, t]);

  const addToFavorites = useCallback(async (productId: string) => {
    if (!userContext?.user) {
      showNotification(t('auth.notifications.mustLogin'), 'error');
      return;
    }

    try {
      // Check if already favorited
      const existingFavorite = favorites.find(f => f.productId === productId);
      if (existingFavorite) {
        showNotification(t('favorites.alreadyFavorited'), 'info');
        return;
      }

      await addDoc(collection(firestoreDB, 'favorites'), {
        userId: userContext.user.uid,
        productId,
        createdAt: new Date()
      });

      showNotification(t('products.favorites.added'), 'success');
    } catch (error) {
      console.error('Error adding to favorites:', error);
      showNotification(t('products.favorites.error'), 'error');
    }
  }, [userContext?.user, favorites, showNotification, t]);

  const removeFromFavorites = useCallback(async (productId: string) => {
    if (!userContext?.user) return;

    try {
      const favoriteToRemove = favorites.find(f => f.productId === productId);
      if (!favoriteToRemove) return;

      await deleteDoc(doc(firestoreDB, 'favorites', favoriteToRemove.id));
      showNotification(t('products.favorites.removed'), 'success');
    } catch (error) {
      console.error('Error removing from favorites:', error);
      showNotification(t('products.favorites.error'), 'error');
    }
  }, [userContext?.user, favorites, showNotification, t]);

  const isFavorite = useCallback((productId: string) => {
    return favorites.some(f => f.productId === productId);
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      favoritesLoading,
      addToFavorites,
      removeFromFavorites,
      isFavorite
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}; 
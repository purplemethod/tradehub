import { useContext } from 'react';
import * as permissions from '../utils/permissions';
import UserContext from '../pages/context/UserContext';
import { UserRole } from '../types';

export const useUserRole = () => {
  const { user } = useContext(UserContext)!;
  const userRole = user?.role || UserRole.BUYER;

  return {
    userRole,
    isAdmin: userRole === UserRole.ADMIN,
    isSeller: userRole === UserRole.SELLER,
    isBuyer: userRole === UserRole.BUYER,
    canManageProducts: permissions.canManageProducts(userRole),
    canManageAllProducts: permissions.canManageAllProducts(userRole),
    canManageUsers: permissions.canManageUsers(userRole),
    canDeleteQuestions: (isProductOwner: boolean) => 
      permissions.canDeleteQuestions(userRole, isProductOwner),
    canUpdateProduct: (isProductOwner: boolean) => 
      permissions.canUpdateProduct(userRole, isProductOwner),
    canDeleteProduct: (isProductOwner: boolean) => 
      permissions.canDeleteProduct(userRole, isProductOwner),
  };
}; 
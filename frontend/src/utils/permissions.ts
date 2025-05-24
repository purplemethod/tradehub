import { UserRole } from "../types";


export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy = {
    [UserRole.ADMIN]: 3,
    [UserRole.SELLER]: 2,
    [UserRole.BUYER]: 1
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const canManageProducts = (userRole: UserRole): boolean => {
  return hasPermission(userRole, UserRole.SELLER);
};

export const canManageAllProducts = (userRole: UserRole): boolean => {
  return hasPermission(userRole, UserRole.ADMIN);
};

export const canManageUsers = (userRole: UserRole): boolean => {
  return hasPermission(userRole, UserRole.ADMIN);
};

export const canDeleteQuestions = (userRole: UserRole, isProductOwner: boolean): boolean => {
  return hasPermission(userRole, UserRole.ADMIN) || isProductOwner;
};

export const canUpdateProduct = (userRole: UserRole, isProductOwner: boolean): boolean => {
  return hasPermission(userRole, UserRole.ADMIN) || 
         (hasPermission(userRole, UserRole.SELLER) && isProductOwner);
};

export const canDeleteProduct = (userRole: UserRole, isProductOwner: boolean): boolean => {
  return hasPermission(userRole, UserRole.ADMIN) || 
         (hasPermission(userRole, UserRole.SELLER) && isProductOwner);
}; 
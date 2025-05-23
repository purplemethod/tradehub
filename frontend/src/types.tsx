import { Timestamp } from "firebase/firestore";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  stock: number;
  owner: string;
  createdAt: Timestamp;
  imageMetadataRef?: ImageMetadata[];
  userId?: string;
  updatedAt?: Date;
  brand?: string;
  weight?: string;
  dimensions?: string;
  shippingCost?: number;
  freeShipping?: boolean;
  status?: "active" | "inactive" | "draft";
}

export interface ImageMetadata {
  thumbnailDataURL?: string | null;
  fullImageRef?: string | null;
  videoId?: string | null;
  videoUrl?: string | null;
  type: "image" | "youtube";
}

export interface ProductQuestion {
  id: string;
  userId: string;
  productId: string;
  userEmail: string;
  userName: string;
  question: string;
  answer?: string;
  createdAt: Date;
  answeredAt?: Date;
  productOwnerEmail: string;
}

export interface UserProfile {
  id: string;
  name: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
} 
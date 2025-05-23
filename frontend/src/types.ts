import { Timestamp } from "firebase/firestore";

export interface ImageMetadata {
  type: "image" | "youtube";
  thumbnailDataURL: string;
  fullImageRef: string | null;
  videoId: string | null;
  videoUrl: string | null;
}

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
  userEmail?: string;
  updatedAt?: Date;
  brand?: string;
  weight?: string;
  dimensions?: string;
  shippingCost?: number;
  freeShipping?: boolean;
  status?: "active" | "inactive" | "draft";
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
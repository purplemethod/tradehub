// src/types.ts

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  condition: string;
  owner: string;
  availableQuantity: number;
  imagesMetadata: Array<{
    thumbnailRef: string;
    fullImageRef: string;
  }>;
}

export interface ProductWithImages extends Product {
  thumbnailUrls: string[];
  fullImageRefs: string[];
}

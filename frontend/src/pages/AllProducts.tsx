import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import type { ProductWithImages } from "../types";
import { firestoreDB } from "./utils/FirebaseConfig";
import ProductCard from "./ProductCard";

const AllProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  // const [selectedImage, setSelectedImage] = useState<string | null>(null); // State to hold the full image data URL

  useEffect(() => {
    // "products" , "products-image-metadata" "products-images" and "products-images-thumb" collections
    // "products" ->    id,name,category,quantity,price,condition,owner,imageMetadataRef,availableQuantity
    // "products-image-metadata" -> images[],productId
    // "products-images" -> createdAt, metadataRef,mimeType,productId,chunkCount -> chunks['chunk{i}'].data
    // chunks['chunk{i}'].data = fullImageRef
    // "products-images-thumb" -> createdAt, metadataRef,mimeType,productId,thumbnailUrl

    const fetchProductsAndThumbnails = async () => {
      try {
        setLoadingProducts(true);
        const productsCollection = collection(firestoreDB, "products");

        const productsSnapshot = await getDocs(productsCollection);

        // Get products
        let productsList: ProductWithImages[] = productsSnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            owner: doc.data().owner,
            name: doc.data().name,
            category: doc.data().category,
            quantity: doc.data().quantity,
            price: doc.data().price,
            condition: doc.data().condition,
            imagesMetadata: [],
            // ...doc.data(),
            thumbnailUrls: [],
          })
        ) as unknown as ProductWithImages[];

        // const productsImgMetadataCollection = collection(firestoreDB, 'products-image-metadata', `${productId}-metadata`);
        const productsImgMetadataCollection = collection(
          firestoreDB,
          "products-image-metadata"
        );
        const productsImgMetadataSnapshot = await getDocs(
          productsImgMetadataCollection
        );

        productsList = productsList.map((product) => {
          // console.log("product", product);
          const imgFullMetaDataDoc = productsImgMetadataSnapshot.docs.find(
            (doc) => doc.data().productId === product.id
          );
          // console.log("imgFullMetaDataDoc", imgFullMetaDataDoc?.data());
          return {
            ...product,
            imagesMetadata: imgFullMetaDataDoc?.data().images || [],
          };
        });

        // setProducts((prevProducts) =>
        //   prevProducts.map((p) => {
        //     const imgFullMetaDataDoc = productsImgMetadataSnapshot.docs.find(
        //       (doc) =>
        //         doc.data().productId === p.id ? doc.data().images : null
        //     );
        //     return {
        //       ...p,
        //       imagesMetadata: imgFullMetaDataDoc?.data().images || [],
        //     };
        //   })
        // );
        setProducts(productsList);

        setLoadingProducts(false);

        // const productsImgMetaDataCollection = collection(
        //   firestoreDB,
        //   "products-image-metadata"
        // );
        // const productsImgMetaDataSnapshot = await getDocs(
        //   productsImgMetaDataCollection
        // );

        // const printAsync = async () => {
        //   const products = await productsImgMetaDataSnapshot.docs.map(
        //     (doc) => ({
        //       id: doc.id,
        //       productId: doc.data().productId,
        //       images: doc.data().images,
        //     })
        //   );
        //   return products;
        // };

        // const productsImgMetaDataList = await printAsync();
        // console.log("productsImgMetaDataList", productsImgMetaDataList);

        // console.log("productsList", productsList);

        for (const product of productsList) {
          //Get Thumbnails
          try {
            const thumbnailUrls: string[] = [];
            for (const imageMetadata of product.imagesMetadata) {
              if (imageMetadata.thumbnailRef) {
                const thumbnailDocRef = doc(
                  firestoreDB,
                  imageMetadata.thumbnailRef
                );
                const thumbnailDocSnap = await getDoc(thumbnailDocRef);
                if (thumbnailDocSnap.exists()) {
                  const thumbnailData = thumbnailDocSnap.data();
                  if (thumbnailData.thumbnailUrl) {
                    thumbnailUrls.push(thumbnailData.thumbnailUrl);
                  }
                }
              }
              setProducts((prevProducts) =>
                prevProducts.map((p) =>
                  p.id === product.id ? { ...p, thumbnailUrls } : p
                )
              );
            }
          } catch (err) {
            console.error(
              `Error fetching images for product ${product.id}:`,
              err
            );
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setFetchError("Error fetching products.");
        setLoadingProducts(false);
      }
    };

    fetchProductsAndThumbnails();
  }, []);

  // const reconstructDataUrlFromChunks = (chunks: string[], mimeType: string): string | null => {
  //   if (!chunks || chunks.length === 0 || !mimeType) {
  //     return null;
  //   }

  //   // Concatenate all raw base64 data chunks
  //   const fullBase64Data = chunks.join('');

  //   // Reconstruct the full data URL with the correct MIME type
  //   const fullDataUrl = `data:${mimeType};base64,${fullBase64Data}`;

  //   return fullDataUrl;
  // };

  // const handleThumbnailClick = async (
  //   product: ProductWithImages,
  //   imageIndex: number
  // ) => {
  //   const fullImageRefPath = product.fullImageRefs[imageIndex];
  //   if (!fullImageRefPath) {
  //     console.error("Full image reference not found for this thumbnail.");
  //     return;
  //   }

  //   try {
  //     const fullImageDocRef = doc(firestoreDB, fullImageRefPath);
  //     const fullImageDocSnap = await getDoc(fullImageDocRef);

  //     if (fullImageDocSnap.exists()) {
  //       const fullImageData = fullImageDocSnap.data();
  //       if (fullImageData.chunks) {
  //         const fullImageUrl = reconstructDataUrlFromChunks(
  //           fullImageData.chunks,
  //           fullImageData.mimeType
  //         ); // Assuming mimeType is stored in the full image document
  //         setSelectedImage(fullImageUrl);
  //         setIsModalOpen(true);
  //       } else {
  //         console.error("Full image data chunks not found.");
  //       }
  //     } else {
  //       console.error("Full image document not found.");
  //     }
  //   } catch (error) {
  //     console.error("Error fetching full image:", error);
  //   }
  // };

  // const handleCloseModal = () => {
  //   setIsModalOpen(false);
  //   setSelectedImage(null);
  // };

  return (
    <div>
      {loadingProducts && <div>Loading products...</div>}
      {fetchError && <p>{fetchError}</p>}
      {!loadingProducts && products?.length === 0 && !fetchError && (
        <p>No products available.</p>
      )}
      <div className="flex flex-wrap justify-center gap-6">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default AllProductsPage;

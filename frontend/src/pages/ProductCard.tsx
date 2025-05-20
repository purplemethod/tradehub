import { useEffect, useState } from "react";
import type { ProductWithImages } from "../types";
import { useBasket } from "./context/useBasket";
import { addImageData, getImageData } from "./utils/indexedDB";
import GetFullImageDataURL from "./utils/getFullImageDataURL";

interface ProductCardProps {
  product: ProductWithImages;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { thumbnailUrls } = product;
  const [highlightedImageIndex, setHighlightedImageIndex] = useState(0);
  const [highlightedImageDataURL, setHighlightedImageDataURL] = useState<
    string | null
  >();
  const { addToBasket } = useBasket();

  const handleBuy = () => {
    addToBasket(product);
  };

  useEffect(() => {
    const loadImage = async (index: number) => {
      const imageId = `${product.id}-${index}`;
      const cachedImageData = await getImageData(imageId);

      if (cachedImageData) {
        setHighlightedImageDataURL(cachedImageData.dataURL);
      } else {
        if (!product.imagesMetadata[index]) {
          console.error("Image metadata not found for this thumbnail.");
          return;
        }
        const dataURL = await GetFullImageDataURL({
          fullImageRef: product.imagesMetadata[index].fullImageRef,
        });
        setHighlightedImageDataURL(dataURL);
        if (dataURL) {
          await addImageData({ id: imageId, dataURL });
        }
      }
    };
    loadImage(highlightedImageIndex);
  }, [highlightedImageIndex, product.id, product.imagesMetadata]);

  const handleThumbnailClick = async (index: number) => {
    const imageId = `${product.id}-${index}`;
    const cachedImageData = await getImageData(imageId);

    if (cachedImageData) {
      setHighlightedImageDataURL(cachedImageData.dataURL);
    } else {
      if (!product.imagesMetadata[index]) {
        console.error("Image metadata not found for this thumbnail.");
        return;
      }
      const dataURL = await GetFullImageDataURL({
        fullImageRef: product.imagesMetadata[index].fullImageRef,
      });
      setHighlightedImageDataURL(dataURL);
      if (dataURL) {
        await addImageData({ id: imageId, dataURL });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="flex flex-rows m-2">
        <div className="p-2">
          <ul className="overflow-hidden">
            {thumbnailUrls &&
              thumbnailUrls.map((thumbnailUrl, index) => (
                <li key={index} className="m-2 last:mr-0">
                  <div
                    className={`w-12 h-12 cursor-pointer ${
                      index === highlightedImageIndex
                        ? "border-2 border-blue-500 rounded-lg p-1"
                        : ""
                    }`}
                    onClick={() => {
                      handleThumbnailClick(index);
                      setHighlightedImageIndex(index);
                    }}
                  >
                    <img
                      className="w-full h-full object-cover object-center"
                      src={thumbnailUrl}
                      alt={`${product.name} Thumbnail ${index + 1}`}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </div>
        <div className="">
          {highlightedImageDataURL ? (
            <div className="rounded-2xl relative w-[320px] h-[320px]">
              <img
                className="rounded-lg w-full h-full object-scale-down"
                src={highlightedImageDataURL}
                alt={`${product.name} Highlighted Image`}
              />
              <p
                onClick={handleBuy}
                className="absolute right-2 bottom-2 cursor-pointer p-2 rounded-full bg-blue-600 text-white mx-5 -mt-4 hover:bg-blue-500 focus:outline-none focus:bg-blue-500 group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 group-hover:opacity-50 opacity-70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </p>
              <p className="absolute right-2 top-2 cursor-pointer p-2 rounded-full bg-purple-600 text-white mx-5 -mb-4 hover:bg-purple-500 focus:outline-none focus:bg-purple-500 group">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 group-hover:opacity-70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </p>
            </div>
          ) : (
            // <Loading />
            "Loading..."
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="">
          <p className="text-2xl uppercase text-gray-900 font-bold">
            {product.name}
          </p>
        </div>
        <div className="">
          <div className="text-gray-900">
            <p className="font-bold text-xl">R${product.price?.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

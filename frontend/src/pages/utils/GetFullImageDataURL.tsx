import { firestoreDB } from "./FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default async function GetFullImageDataURL(props: {
  fullImageRef: string;
}): Promise<string> {
  try {
    const imageDoc = await getDoc(doc(firestoreDB, props.fullImageRef));

    if (!imageDoc.exists()) {
      throw new Error(
        `Image document not found at path: ${props.fullImageRef}`
      );
    }

    const imageData = imageDoc.data();

    // If this is a thumbnail document (from products-images-thumb collection)
    if (props.fullImageRef.includes("products-images-thumb")) {
      if (imageData.thumbnailUrl) {
        return imageData.thumbnailUrl;
      }
      throw new Error(
        `No thumbnailUrl found in document: ${props.fullImageRef}`
      );
    }

    // If this is a full image document (from products-images collection)
    if (props.fullImageRef.includes("products-images")) {
      const imageId = props.fullImageRef.split("/").pop();
      if (!imageId) {
        throw new Error(
          `Could not extract image ID from fullImageRef: ${props.fullImageRef}`
        );
      }

      const chunkCount = imageData.chunkCount || 0;
      if (chunkCount === 0) {
        throw new Error("No chunks found in metadata");
      }

      // Create an array to store chunks in order
      const chunks: string[] = new Array(chunkCount).fill("");

      // Fetch all chunks in parallel
      const chunkPromises = Array.from({ length: chunkCount }, async (_, i) => {
        const chunkRef = doc(
          firestoreDB,
          "products-images",
          imageId,
          "chunks",
          `chunk${i}`
        );
        const chunkDoc = await getDoc(chunkRef);

        if (!chunkDoc.exists()) {
          throw new Error(`Chunk ${i} not found`);
        }

        const chunkData = chunkDoc.data();
        if (!chunkData.data) {
          throw new Error(`No data found in chunk ${i}`);
        }

        return { index: i, data: chunkData.data };
      });

      // Wait for all chunks to be fetched
      const chunkResults = await Promise.all(chunkPromises);

      // Sort chunks by index and store their data
      chunkResults.forEach(({ index, data }) => {
        chunks[index] = data;
      });

      // Check if we have all chunks
      if (chunks.some((chunk) => chunk === "")) {
        throw new Error("Some chunks are missing");
      }

      const mimeType = imageData.mimeType || "image/jpeg";
      const base64Data = chunks.join("");

      // Validate base64 data
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
        throw new Error("Invalid base64 data in chunks");
      }

      return `data:${mimeType};base64,${base64Data}`;
    }

    throw new Error("Invalid image reference path");
  } catch (error) {
    console.error("Error in GetFullImageDataURL:", error);
    throw error;
  }
}

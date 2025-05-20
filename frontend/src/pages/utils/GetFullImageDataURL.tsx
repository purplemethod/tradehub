import { firestoreDB } from "./FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface GetFullImageDataURLProps {
  fullImageRef: string;
}

export default async function GetFullImageDataURL(
  props: GetFullImageDataURLProps
): Promise<string> {
  const fullImageDocRef = doc(firestoreDB, props.fullImageRef);
  if (!props.fullImageRef) {
    console.error("Full image reference not found for this thumbnail.");
    return "Full image reference not found.";
  }
  const fullImageDocSnap = await getDoc(fullImageDocRef);

  if (fullImageDocSnap.exists()) {
    const fullImageData = fullImageDocSnap.data();
    const chunksCount = fullImageData.chunkCount;
    let fullBase64Data = "";
    for (let chunkIndex = 0; chunkIndex < chunksCount; chunkIndex++) {
      const chunkDocRef = doc(
        firestoreDB,
        props.fullImageRef,
        `chunks`,
        `chunk${chunkIndex}`
      );
      const chunkDocSnap = await getDoc(chunkDocRef);
      if (chunkDocSnap.exists()) {
        const chunkData = chunkDocSnap.data();
        if (chunkData.data) {
          fullBase64Data += chunkData.data;
        } else {
          console.error("Chunk data not found.");
          return "Chunk data not found.";
        }
      }
    }
    return `data:${fullImageData.mimeType};base64,${fullBase64Data}`;
  } else {
    console.error("Full image document not found.");
    return "Full image document not found.";
  }
}

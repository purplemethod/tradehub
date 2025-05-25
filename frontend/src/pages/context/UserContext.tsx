import React, {
  createContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { auth, firestoreDB } from "../utils/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { UserRole, type UserProfile } from "../../types";

interface UserContextType {
  user: UserProfile | null;
  userLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!isMounted) return;

        if (user) {
          try {
            // Create or update user document in Firestore
            const userRef = doc(firestoreDB, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              await setDoc(
                userRef,
                {
                  id: userData.id || "",
                  email: userData.email || "",
                  displayName: userData.displayName || "",
                  photoURL: userData.photoURL || "",
                  role: userData.role || UserRole.BUYER,
                  createdAt: userData.createdAt || serverTimestamp(),
                  lastLogin: serverTimestamp(),
                },
                { merge: true }
              );
              setUser({
                ...userData,
                id: userData.id || "",
                email: userData.email || "",
                displayName: userData.displayName || "",
                photoURL: userData.photoURL || "",
                role: userData.role || UserRole.BUYER,
                createdAt: userData.createdAt || serverTimestamp(),
                lastLogin: serverTimestamp(),
              } as unknown as UserProfile);
            } else {
              await setDoc(
                userRef,
                {
                  id: user.uid,
                  email: user.email,
                  displayName: user.displayName || "",
                  photoURL: user.photoURL || "",
                  role: UserRole.BUYER,
                  createdAt: serverTimestamp(),
                  lastLogin: serverTimestamp(),
                },
                { merge: true }
              );
              setUser({
                ...user,
                id: user.uid,
                email: user.email,
                displayName: user.displayName || "",
                photoURL: user.photoURL || "",
                role: UserRole.BUYER,
              } as unknown as UserProfile);
            }
          } catch (error) {
            console.error("Error updating user document:", error);
            // Don't set user to null here, as the auth state is still valid
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setUserLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ user, userLoading, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;

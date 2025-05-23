import React, {
  createContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { auth, firestoreDB } from "../utils/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

interface UserContextType {
  user: User | null;
  userLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!isMounted) return;

        if (user) {
          setUser(user);
          try {
            // Create or update user document in Firestore
            const userRef = doc(firestoreDB, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
              // Create new user document
              await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName || "",
                photoURL: user.photoURL || "",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
              });
            } else {
              // Update last login
              await setDoc(
                userRef,
                {
                  lastLogin: serverTimestamp(),
                },
                { merge: true }
              );
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

import type { User } from "firebase/auth";
import { createContext } from "react";

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export default UserContext;

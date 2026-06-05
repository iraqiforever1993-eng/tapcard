import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { setAuthToken, apiRequest } from "./queryClient";

export type AuthUser = {
  id: string;
  email: string;
  subscriptionStatus: string | null;
  trialEndsAt: number | null;
  isActive: boolean;
  isTrialing: boolean;
  stripeCustomerId: string | null;
};
export type AuthCard = {
  id: string;
  userId: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  instagram: string | null;
  bio: string | null;
  photoDataUrl: string | null;
  accentColor: string;
  updatedAt: number;
  // v2 fields
  layoutStyle: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  backgroundPhotoUrl: string | null;
  profilePhotoUrl: string | null;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  card: AuthCard | null;
  loading: boolean;
  signIn: (token: string, user: AuthUser, card: AuthCard) => void;
  signOut: () => Promise<void>;
  setCard: (c: AuthCard) => void;
  setUser: (u: AuthUser) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [card, setCardState] = useState<AuthCard | null>(null);
  const [loading] = useState(false);

  // keep queryClient's authHeader in sync
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const signIn = useCallback((t: string, u: AuthUser, c: AuthCard) => {
    setAuthToken(t);
    setToken(t);
    setUserState(u);
    setCardState(c);
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (token) await apiRequest("POST", "/api/auth/logout");
    } catch {}
    setAuthToken(null);
    setToken(null);
    setUserState(null);
    setCardState(null);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ token, user, card, loading, signIn, signOut, setCard: setCardState, setUser: setUserState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// React
import React, { createContext, useCallback, useContext, useState } from "react";

// Supabase
import { supabase } from "../lib/supabase";

// Cache
import { areCacheEqual, clearAllCaches, getCached, setCached } from "../lib/cacheService";

// Balance
import { calculateBalance, peekBalance } from "../lib/BalanceService";

const CACHE_KEY_SELF = "@cache:user:self";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

export type UserBalance = {
  devendo: number;
  areceber: number;
};

type UserContextType = {
  profile: UserProfile | null;
  balance: UserBalance;
  loadUser: (userId: string) => Promise<void>;
  clearUser: () => Promise<void>;
  refreshBalance: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<UserBalance>({
    devendo: 0,
    areceber: 0,
  });

  // loadUser | carrega perfil e balance (do cache ou do Supabase)
  const loadUser = useCallback(async (userId: string) => {
    // perfil
    const cached = await getCached<UserProfile>(CACHE_KEY_SELF);
    if (cached?.id === userId) {
      setProfile(cached);
    } else {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, avatar_url, created_at")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data);
        await setCached(CACHE_KEY_SELF, data);
      }
    }

    // balance: cache imediato + sincronização via RPC
    const cachedBalance = await peekBalance();
    if (cachedBalance) {
      setBalance(cachedBalance);
    }

    const freshBalance = await calculateBalance();
    setBalance((prev) =>
      areCacheEqual(prev, freshBalance) ? prev : freshBalance
    );
  }, []);

  // refreshBalance | recalcula balance e atualiza contexto só se mudou
  const refreshBalance = useCallback(async () => {
    const freshBalance = await calculateBalance();
    setBalance((prev) =>
      areCacheEqual(prev, freshBalance) ? prev : freshBalance
    );
  }, []);

  // clearUser | reseta tudo e limpa caches
  const clearUser = useCallback(async () => {
    setProfile(null);
    setBalance({ devendo: 0, areceber: 0 });
    await clearAllCaches();
  }, []);

  return (
    <UserContext.Provider
      value={{ profile, balance, loadUser, clearUser, refreshBalance }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser deve ser usado dentro de UserProvider");
  return ctx;
}

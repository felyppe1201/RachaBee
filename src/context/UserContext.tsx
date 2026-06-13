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
  refreshBalance: () => Promise<boolean>;
};

const UserContext = createContext<UserContextType | null>(null);

// ensureUserProfile | Recria o perfil em public.users a partir da sessão do Auth
// Cobre o caso de a linha ter sido removida direto no banco enquanto a conta
// permanece no Auth (o trigger handle_new_user só roda em cadastros novos).
async function ensureUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;

  if (!authUser || authUser.id !== userId) return null;

  const email = authUser.email ?? "";
  const metadata = authUser.user_metadata ?? {};
  const name =
    (typeof metadata.name === "string" && metadata.name) ||
    (email ? email.split("@")[0] : "Usuário");
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  const { data, error } = await supabase
    .from("users")
    .upsert(
      { id: userId, name, email, avatar_url: avatarUrl },
      { onConflict: "id" },
    )
    .select("id, name, email, avatar_url, created_at")
    .single();

  if (error || !data) return null;

  return data;
}

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
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        await setCached(CACHE_KEY_SELF, data);
      } else if (!data) {
        // Perfil ausente em public.users (ex: linha deletada direto no banco,
        // mas a conta continua no Auth). Recria a partir dos dados da sessão.
        const recovered = await ensureUserProfile(userId);
        if (recovered) {
          setProfile(recovered);
          await setCached(CACHE_KEY_SELF, recovered);
        }
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

  // refreshBalance | exibe cache imediato e sincroniza via RPC; atualiza contexto só se mudou
  const refreshBalance = useCallback(async (): Promise<boolean> => {
    const cachedBalance = await peekBalance();
    if (cachedBalance) {
      setBalance(cachedBalance);
    }

    const freshBalance = await calculateBalance();
    setBalance((prev) =>
      areCacheEqual(prev, freshBalance) ? prev : freshBalance
    );

    return !!cachedBalance;
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

// React
import React, { createContext, useCallback, useContext, useState } from "react";

// Supabase
import { supabase } from "../lib/supabase";

// Cache
import { clearAllCaches, getCached, setCached } from "../lib/cacheService";

// chave do cache do perfil do próprio usuário autenticado
const CACHE_KEY_SELF = "@cache:user:self";

// dados do perfil do usuário, espelhados da tabela users
export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

// saldo calculado do usuário (não guardado no banco, apenas em memória)
export type UserBalance = {
  devendo: number;
  areceber: number;
};

type UserContextType = {
  profile: UserProfile | null;
  balance: UserBalance;
  loadUser: (userId: string) => Promise<void>;
  clearUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

// UserProvider | provê os dados do usuário autenticado para toda a árvore de componentes
export function UserProvider({ children }: { children: React.ReactNode }) {
  // perfil do usuário autenticado
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // saldo calculado - placeholder até a lógica de cálculo ser implementada
  const [balance, setBalance] = useState<UserBalance>({
    devendo: 200,
    areceber: 200,
  });

  // loadUser | carrega o perfil do cache ou do Supabase, e atualiza o cache
  const loadUser = useCallback(async (userId: string) => {
    const cached = await getCached<UserProfile>(CACHE_KEY_SELF);
    if (cached) {
      setProfile(cached);
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, avatar_url, created_at")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data as UserProfile);
      await setCached(CACHE_KEY_SELF, data);
    }
  }, []);

  // clearUser | reseta o estado em memória e apaga todos os caches da aplicação
  const clearUser = useCallback(async () => {
    setProfile(null);
    setBalance({ devendo: 200, areceber: 200 });
    await clearAllCaches();
  }, []);

  return (
    <UserContext.Provider value={{ profile, balance, loadUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

// useUser | acessa os dados do usuário autenticado de qualquer componente
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser deve ser usado dentro de UserProvider");
  return ctx;
}

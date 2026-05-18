// React
import { useEffect, useState } from "react";

// Supabase
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// useAuth | verifica e observa a sessão autenticada do usuário
export function useAuth() {
  // sessão atual do usuário autenticado
  const [session, setSession] = useState<Session | null>(null);
  // indica se a verificação inicial da sessão ainda está em andamento
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // busca a sessão persistida ao montar o componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // escuta mudanças de estado de autenticação (login, logout, refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}

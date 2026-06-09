import { supabase } from "./supabase";
import { getCached, setCached, removeCached } from "./cacheService";
import { UserBalance } from "../context/UserContext";

const CACHE_KEY_BALANCE = "@cache:balance:self";

// calculateBalance | chama a RPC e retorna o balance calculado
export async function calculateBalance(): Promise<UserBalance> {
  const { data, error } = await supabase.rpc("actualglobalbalance");

  if (error || !data) {
    console.log("Erro ao calcular balance:", error?.message);
    return { devendo: 0, areceber: 0 };
  }

  const balance: UserBalance = {
    devendo: data.devendo ?? 0,
    areceber: data.areceber ?? 0,
  };

  await setCached(CACHE_KEY_BALANCE, balance);
  return balance;
}

// getBalance | retorna do cache se existir, senão calcula
export async function getBalance(): Promise<UserBalance> {
  const cached = await getCached<UserBalance>(CACHE_KEY_BALANCE);
  if (cached) return cached;
  return calculateBalance();
}

// invalidateBalanceCache | força recálculo na próxima chamada
export async function invalidateBalanceCache(): Promise<void> {
  await removeCached(CACHE_KEY_BALANCE);
}

// Supabase
import { supabase } from "./supabase";

// Cache
import {
  clearCachesByTag,
  getCached,
  removeCached,
  syncCache,
} from "./cacheService";

// Context
import { UserBalance } from "../context/UserContext";

// Área Tipos | Modelos de dados de balance

export type ExpenseSplit = {
  expense_id: string;
  total: number;
  total_members: number;
  val_por_participante: number;
};

// Área Cache | Chaves e sincronização com comparação

const CACHE_KEY_GLOBAL = "@cache:balance:self";
const CACHE_KEY_GROUP_PREFIX = "@cache:balance:group:";
const CACHE_KEY_EXPENSE_PREFIX = "@cache:balance:expense:";

// groupBalanceCacheKey | Gera chave de cache para balance de um grupo
function groupBalanceCacheKey(groupId: string): string {
  return `${CACHE_KEY_GROUP_PREFIX}${groupId}`;
}

// expenseSplitCacheKey | Gera chave de cache para split de uma despesa
function expenseSplitCacheKey(expenseId: string): string {
  return `${CACHE_KEY_EXPENSE_PREFIX}${expenseId}`;
}

// peekBalance | Retorna cache do balance global sem consultar RPC
export async function peekBalance(): Promise<UserBalance | null> {
  return getCached<UserBalance>(CACHE_KEY_GLOBAL);
}

// Área Balance global | ActualGlobalBalance

const EMPTY_BALANCE: UserBalance = { devendo: 0, areceber: 0 };

// fetchGlobalBalance | Chama RPC ActualGlobalBalance
async function fetchGlobalBalance(): Promise<UserBalance> {
  const { data, error } = await supabase.rpc("ActualGlobalBalance");

  if (error || !data) {
    console.log("Erro ao calcular balance:", error?.message);
    return EMPTY_BALANCE;
  }

  return {
    devendo: data.devendo ?? 0,
    areceber: data.areceber ?? 0,
  };
}

// calculateBalance | Consulta RPC e sincroniza cache se houver diferença
export async function calculateBalance(): Promise<UserBalance> {
  const fresh = await fetchGlobalBalance();
  return syncCache(CACHE_KEY_GLOBAL, fresh);
}

// getBalance | Retorna cache imediato; se ausente, calcula via RPC
export async function getBalance(): Promise<UserBalance> {
  const cached = await getCached<UserBalance>(CACHE_KEY_GLOBAL);
  if (cached) return cached;
  return calculateBalance();
}

// invalidateBalanceCache | Remove cache do balance global
export async function invalidateBalanceCache(): Promise<void> {
  await removeCached(CACHE_KEY_GLOBAL);
}

// Área Balance por grupo | ActualBalanceByGroupUUID

// fetchGroupBalance | Chama RPC ActualBalanceByGroupUUID
async function fetchGroupBalance(groupId: string): Promise<UserBalance> {
  console.log("[BalanceService:ActualBalanceByGroupUUID] request", {
    group_id: groupId,
  });

  const { data, error } = await supabase.rpc("ActualBalanceByGroupUUID", {
    group_id: groupId,
  });

  console.log("[BalanceService:ActualBalanceByGroupUUID] response", {
    group_id: groupId,
    data,
    error: error
      ? { message: error.message, code: error.code, details: error.details }
      : null,
  });

  if (error || !data) {
    console.log(
      "[BalanceService:ActualBalanceByGroupUUID] fallback EMPTY_BALANCE",
      { group_id: groupId, reason: error ? "rpc_error" : "empty_data" },
    );
    return EMPTY_BALANCE;
  }

  const balance = {
    devendo: data.devendo ?? 0,
    areceber: data.areceber ?? 0,
  };

  console.log("[BalanceService:ActualBalanceByGroupUUID] parsed", {
    group_id: groupId,
    balance,
    raw_devendo: data.devendo,
    raw_areceber: data.areceber,
  });

  return balance;
}

// calculateGroupBalance | Consulta RPC e sincroniza cache do grupo se diferente
export async function calculateGroupBalance(
  groupId: string
): Promise<UserBalance> {
  const fresh = await fetchGroupBalance(groupId);
  return syncCache(groupBalanceCacheKey(groupId), fresh);
}

// peekGroupBalance | Retorna cache do balance do grupo sem consultar RPC
export async function peekGroupBalance(
  groupId: string
): Promise<UserBalance | null> {
  return getCached<UserBalance>(groupBalanceCacheKey(groupId));
}

// getGroupBalance | Retorna cache do grupo; se ausente, calcula via RPC
export async function getGroupBalance(groupId: string): Promise<UserBalance> {
  const cached = await getCached<UserBalance>(groupBalanceCacheKey(groupId));
  if (cached) return cached;
  return calculateGroupBalance(groupId);
}

// invalidateGroupBalanceCache | Remove cache do balance de um grupo
export async function invalidateGroupBalanceCache(
  groupId: string
): Promise<void> {
  await removeCached(groupBalanceCacheKey(groupId));
}

// Área Despesa | GetValForExpenseUUID

const EMPTY_EXPENSE_SPLIT: ExpenseSplit = {
  expense_id: "",
  total: 0,
  total_members: 0,
  val_por_participante: 0,
};

// fetchExpenseSplit | Chama RPC GetValForExpenseUUID
async function fetchExpenseSplit(expenseId: string): Promise<ExpenseSplit> {
  const { data, error } = await supabase.rpc("GetValForExpenseUUID", {
    expense_id: expenseId,
  });

  if (error || !data) {
    console.log("Erro ao calcular split da despesa:", error?.message);
    return { ...EMPTY_EXPENSE_SPLIT, expense_id: expenseId };
  }

  return {
    expense_id: data.expense_id ?? expenseId,
    total: data.total ?? 0,
    total_members: data.total_members ?? 0,
    val_por_participante: data.val_por_participante ?? 0,
  };
}

// calculateExpenseSplit | Consulta RPC e sincroniza cache da despesa se diferente
export async function calculateExpenseSplit(
  expenseId: string
): Promise<ExpenseSplit> {
  const fresh = await fetchExpenseSplit(expenseId);
  return syncCache(expenseSplitCacheKey(expenseId), fresh);
}

// getExpenseSplit | Retorna cache da despesa; se ausente, calcula via RPC
export async function getExpenseSplit(expenseId: string): Promise<ExpenseSplit> {
  const cached = await getCached<ExpenseSplit>(expenseSplitCacheKey(expenseId));
  if (cached) return cached;
  return calculateExpenseSplit(expenseId);
}

// invalidateExpenseSplitCache | Remove cache do split de uma despesa
export async function invalidateExpenseSplitCache(
  expenseId: string
): Promise<void> {
  await removeCached(expenseSplitCacheKey(expenseId));
}

// Área Invalidação | Limpeza de caches de balance

// invalidateAllBalanceCaches | Remove todos os caches de balance da aplicação
export async function invalidateAllBalanceCaches(): Promise<void> {
  await clearCachesByTag("balance");
}

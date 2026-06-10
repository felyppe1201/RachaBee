// Supabase
import { supabase } from "./supabase";

// Cache
import { getCached, removeCached, syncCache } from "./cacheService";

// Área Tipos | Modelos de dados de atividade

export type ActivityType = "expense" | "payment";

export type ActivityExpense = {
  id: string;
  description: string;
  amount: number;
  group_id: string;
  paid_by: string;
  receipt_url: string | null;
  created_at: string;
  val_por_participante: number;
  payments_feitos: number;
  payments_faltantes: number;
};

export type ActivityPayment = {
  id: string;
  expense_id: string;
  group_id: string;
  amount: number;
  description: string;
  transfer_receipt_url: string | null;
  created_at: string;
};

export type ActivityFeed = {
  expenses: ActivityExpense[];
  payments: ActivityPayment[];
};

export type GroupNameMap = Record<string, string>;

export type ActivityListItem = {
  id: string;
  type: ActivityType;
  amount: number;
  description: string;
  created_at: string;
  group_id: string;
  group_name: string;
};

// Área Cache | Chaves e sincronização do feed de atividades

const CACHE_KEY_ACTIVITY_FEED = "@cache:activity:feed";

// Área Erros | Tratamento centralizado de falhas do serviço

type ActivityServiceContext = "getActivity";

const KNOWN_USER_MESSAGES = [
  "usuário não autenticado",
  "não foi possível carregar as atividades",
];

// extractErrorMessage | Obtém mensagem textual de qualquer erro
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

// extractErrorCode | Obtém código do erro quando disponível
function extractErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    return code == null ? undefined : String(code);
  }
  return undefined;
}

// logActivityServiceError | Registra erro bruto no terminal para debug
function logActivityServiceError(
  context: ActivityServiceContext,
  error: unknown
): void {
  const message = extractErrorMessage(error);
  const code = extractErrorCode(error);

  console.error(`[ActivityService:${context}]`, error);
  console.error(
    `[ActivityService:${context}] code=${code ?? "n/a"} message=${message}`
  );
}

// resolveUserMessage | Traduz erro para mensagem amigável ao usuário
function resolveUserMessage(error: unknown): string {
  const message = extractErrorMessage(error);
  const lower = message.toLowerCase();
  const code = extractErrorCode(error);

  if (KNOWN_USER_MESSAGES.some((known) => lower.includes(known))) {
    return message;
  }

  if (lower.includes("infinite recursion")) {
    return "Não foi possível concluir por um problema de permissão no servidor. Tente novamente mais tarde.";
  }

  if (
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    code === "42501"
  ) {
    return "Você não tem permissão para realizar esta ação.";
  }

  if (
    lower.includes("jwt") ||
    lower.includes("session") ||
    lower.includes("token") ||
    lower.includes("not authenticated") ||
    lower.includes("invalid claim")
  ) {
    return "Sua sessão expirou. Faça login novamente.";
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("conexão") ||
    lower.includes("conexao") ||
    lower.includes("timeout") ||
    lower.includes("timed out")
  ) {
    return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
  }

  return message || "Não foi possível carregar as atividades.";
}

// throwActivityServiceError | Loga e propaga erro com mensagem para o usuário
function throwActivityServiceError(
  context: ActivityServiceContext,
  error: unknown
): never {
  logActivityServiceError(context, error);
  throw new Error(resolveUserMessage(error));
}

// Área Lista | Montagem e resolução de itens do feed

// resolveGroupName | Obtém nome do grupo pelo mapa de cache
function resolveGroupName(groupId: string, groupNames: GroupNameMap): string {
  return groupNames[groupId] ?? "Grupo";
}

// buildActivityList | Une despesas e pagamentos ordenados por data decrescente
export function buildActivityList(
  feed: ActivityFeed,
  groupNames: GroupNameMap = {}
): ActivityListItem[] {
  const expenses: ActivityListItem[] = feed.expenses.map((item) => ({
    id: item.id,
    type: "expense",
    amount: item.amount,
    description: item.description,
    created_at: item.created_at,
    group_id: item.group_id,
    group_name: resolveGroupName(item.group_id, groupNames),
  }));

  const payments: ActivityListItem[] = feed.payments.map((item) => ({
    id: item.id,
    type: "payment",
    amount: item.amount,
    description: item.description,
    created_at: item.created_at,
    group_id: item.group_id,
    group_name: resolveGroupName(item.group_id, groupNames),
  }));

  return [...expenses, ...payments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// resolveActivityExpense | Localiza despesa no feed de atividades
export function resolveActivityExpense(
  feed: ActivityFeed | null,
  activityId: string
): ActivityExpense | null {
  return feed?.expenses.find((item) => item.id === activityId) ?? null;
}

// resolveActivityPayment | Localiza pagamento no feed de atividades
export function resolveActivityPayment(
  feed: ActivityFeed | null,
  activityId: string
): ActivityPayment | null {
  return feed?.payments.find((item) => item.id === activityId) ?? null;
}

// Área Atividades | GetActivity

// fetchActivity | Chama RPC GetActivity
async function fetchActivity(): Promise<ActivityFeed> {
  const { data, error } = await supabase.rpc("GetActivity");

  if (error) throwActivityServiceError("getActivity", error);

  return {
    expenses: (data?.expenses ?? []) as ActivityExpense[],
    payments: (data?.payments ?? []) as ActivityPayment[],
  };
}

// peekActivityFeed | Retorna cache do feed sem consultar RPC
export async function peekActivityFeed(): Promise<ActivityFeed | null> {
  return getCached<ActivityFeed>(CACHE_KEY_ACTIVITY_FEED);
}

// calculateActivityFeed | Consulta RPC e sincroniza cache se houver diferença
export async function calculateActivityFeed(): Promise<ActivityFeed> {
  const fresh = await fetchActivity();
  return syncCache(CACHE_KEY_ACTIVITY_FEED, fresh);
}

// getActivityFeed | Retorna cache imediato; se ausente, calcula via RPC
export async function getActivityFeed(): Promise<ActivityFeed> {
  const cached = await peekActivityFeed();
  if (cached) return cached;
  return calculateActivityFeed();
}

// invalidateActivityCache | Remove cache do feed de atividades
export async function invalidateActivityCache(): Promise<void> {
  await removeCached(CACHE_KEY_ACTIVITY_FEED);
}

// Supabase
import { supabase } from "./supabase";

// Cache
import { getCached, removeCached, setCached, syncCache } from "./cacheService";

// Balance
import {
  ExpenseSplit,
  invalidateAllBalanceCaches,
  invalidateExpenseSplitCache,
} from "./BalanceService";

// Grupos
import { invalidateGroupInfoCache } from "./GroupService";

// Área Tipos | Modelos de dados de despesas e pagamentos

export type CreateExpenseResult = {
  success: boolean;
  expense_id: string;
  total_members: number;
  val_por_participante: number;
  receiptUploadFailed?: boolean;
};

export type CreateExpenseInput = {
  groupId: string;
  description: string;
  amount: number;
  receiptUrl?: string | null;
  receiptUri?: string | null;
};

export type CreatePaymentInput = {
  expenseId: string;
  groupId: string;
  description: string;
  transferReceiptUrl?: string | null;
  transferReceiptUri?: string | null;
};

export type CreatePaymentResult = {
  success: boolean;
  payment_id: string;
  amount: number;
  receiptUploadFailed?: boolean;
};

export type ExpensePayment = {
  id: string;
  paid_by: string;
  amount: number;
  description: string;
  transfer_receipt_url: string | null;
  created_at: string;
  payer_name: string;
  payer_avatar_url: string | null;
};

// Área Cache | Chaves de split e pagamentos sincronizadas após mutações

const CACHE_KEY_EXPENSE_SPLIT_PREFIX = "@cache:balance:expense:";
const CACHE_KEY_EXPENSE_PAYMENTS_PREFIX = "@cache:expense:payments:";

// expenseSplitCacheKey | Gera chave de cache para split de uma despesa
function expenseSplitCacheKey(expenseId: string): string {
  return `${CACHE_KEY_EXPENSE_SPLIT_PREFIX}${expenseId}`;
}

// expensePaymentsCacheKey | Gera chave de cache para pagamentos de uma despesa
function expensePaymentsCacheKey(expenseId: string): string {
  return `${CACHE_KEY_EXPENSE_PAYMENTS_PREFIX}${expenseId}`;
}

// Área Erros | Tratamento centralizado de falhas do serviço

type ExpenseServiceContext =
  | "createExpense"
  | "createPayment"
  | "getExpensePayments"
  | "uploadExpenseReceipt"
  | "uploadTransferReceipt";

const KNOWN_USER_MESSAGES = [
  "usuário não autenticado",
  "grupo não encontrado",
  "você não tem acesso a este grupo",
  "despesa não encontrada",
  "valor inválido",
  "descrição inválida",
  "quem pagou a despesa não pode registrar pagamento",
  "quem pagou a expense não pode registrar payment",
  "você já registrou um pagamento para esta despesa",
  "um usuário só pode registrar um payment por expense",
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

// logExpenseServiceError | Registra erro bruto no terminal para debug
function logExpenseServiceError(
  context: ExpenseServiceContext,
  error: unknown,
): void {
  const message = extractErrorMessage(error);
  const code = extractErrorCode(error);

  console.error(`[ExpenseService:${context}]`, error);
  console.error(
    `[ExpenseService:${context}] code=${code ?? "n/a"} message=${message}`,
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

  if (code === "23505") {
    return "Esta ação já foi realizada anteriormente.";
  }

  if (code === "23503") {
    return "Não foi possível concluir: algum dado relacionado não foi encontrado.";
  }

  if (code === "PGRST116") {
    return "Registro não encontrado.";
  }

  return message || "Ocorreu um erro inesperado. Tente novamente.";
}

// throwExpenseServiceError | Loga e propaga erro com mensagem para o usuário
function throwExpenseServiceError(
  context: ExpenseServiceContext,
  error: unknown,
): never {
  logExpenseServiceError(context, error);
  throw new Error(resolveUserMessage(error));
}

// assertRpcSuccess | Valida retorno de RPCs que expõem success
function assertRpcSuccess(
  context: ExpenseServiceContext,
  data: { success: boolean } | null,
  error: unknown,
): void {
  if (error) throwExpenseServiceError(context, error);
  if (!data?.success) {
    throw new Error("Operação não concluída.");
  }
}

// Área Upload | Comprovantes de despesa e pagamento

const RECEIPTS_BUCKET = "receipts";

// uploadReceiptImage | Envia imagem local para o bucket de comprovantes
async function uploadReceiptImage(
  context: ExpenseServiceContext,
  localUri: string,
  fileName: string,
): Promise<string | null> {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(fileName, uint8Array, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      logExpenseServiceError(context, uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from(RECEIPTS_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    logExpenseServiceError(context, error);
    return null;
  }
}

// uploadExpenseReceipt | Envia comprovante da despesa e retorna URL pública
export async function uploadExpenseReceipt(
  expenseId: string,
  localUri: string,
): Promise<string | null> {
  return uploadReceiptImage(
    "uploadExpenseReceipt",
    localUri,
    `expenses/${expenseId}.jpg`,
  );
}

// uploadTransferReceipt | Envia comprovante da transferência e retorna URL pública
export async function uploadTransferReceipt(
  paymentId: string,
  localUri: string,
): Promise<string | null> {
  return uploadReceiptImage(
    "uploadTransferReceipt",
    localUri,
    `payments/${paymentId}.jpg`,
  );
}

// Área Invalidação | Limpeza de caches relacionados a despesas

// invalidateExpenseRelatedCaches | Remove caches afetados por mutações de despesa
async function invalidateExpenseRelatedCaches(
  groupId: string,
  expenseId?: string,
): Promise<void> {
  await invalidateGroupInfoCache(groupId);
  await invalidateAllBalanceCaches();

  if (expenseId) {
    await invalidateExpenseSplitCache(expenseId);
    await invalidateExpensePaymentsCache(expenseId);
  }
}

// syncExpenseSplitCache | Grava split retornado pela RPC no cache local
async function syncExpenseSplitCache(
  expenseId: string,
  amount: number,
  totalMembers: number,
  valPorParticipante: number,
): Promise<void> {
  const fresh: ExpenseSplit = {
    expense_id: expenseId,
    total: amount,
    total_members: totalMembers,
    val_por_participante: valPorParticipante,
  };

  await setCached(expenseSplitCacheKey(expenseId), fresh);
}

// Área Despesas | CreateExpense

// generatePendingReceiptId | Gera id temporário para upload antes da criação
function generatePendingReceiptId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// resolveReceiptUrl | Envia comprovante local e retorna URL pública
async function resolveReceiptUrl(
  receiptUrl?: string | null,
  receiptUri?: string | null,
): Promise<{ receiptUrl?: string; receiptUploadFailed: boolean }> {
  if (receiptUrl) {
    return { receiptUrl, receiptUploadFailed: false };
  }

  if (!receiptUri) {
    return { receiptUploadFailed: false };
  }

  const uploadedUrl = await uploadExpenseReceipt(
    generatePendingReceiptId(),
    receiptUri,
  );

  if (!uploadedUrl) {
    return { receiptUploadFailed: true };
  }

  return { receiptUrl: uploadedUrl, receiptUploadFailed: false };
}

// createExpense | Registra nova despesa no grupo via RPC
export async function createExpense(
  input: CreateExpenseInput,
): Promise<CreateExpenseResult> {
  const { groupId, description, amount, receiptUrl, receiptUri } = input;
  const { receiptUrl: resolvedReceiptUrl, receiptUploadFailed } =
    await resolveReceiptUrl(receiptUrl, receiptUri);

  const { data, error } = await supabase.rpc("CreateExpense", {
    group_id: groupId,
    description,
    amount,
    receipt_url: resolvedReceiptUrl,
  });

  assertRpcSuccess("createExpense", data, error);
  if (!data?.expense_id) {
    throw new Error("Não foi possível criar a despesa.");
  }

  const result = data as CreateExpenseResult;

  await syncExpenseSplitCache(
    result.expense_id,
    amount,
    result.total_members,
    result.val_por_participante,
  );
  await invalidateGroupInfoCache(groupId);
  await invalidateAllBalanceCaches();

  return {
    ...result,
    receiptUploadFailed: receiptUploadFailed || undefined,
  };
}

// Área Pagamentos | CreatePayment

// resolveTransferReceiptUrl | Envia comprovante local e retorna URL pública
async function resolveTransferReceiptUrl(
  transferReceiptUrl?: string | null,
  transferReceiptUri?: string | null,
): Promise<{ transferReceiptUrl?: string; receiptUploadFailed: boolean }> {
  if (transferReceiptUrl) {
    return { transferReceiptUrl, receiptUploadFailed: false };
  }

  if (!transferReceiptUri) {
    return { receiptUploadFailed: false };
  }

  const uploadedUrl = await uploadTransferReceipt(
    generatePendingReceiptId(),
    transferReceiptUri,
  );

  if (!uploadedUrl) {
    return { receiptUploadFailed: true };
  }

  return { transferReceiptUrl: uploadedUrl, receiptUploadFailed: false };
}

// createPayment | Registra pagamento de uma despesa via RPC
export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const {
    expenseId,
    groupId,
    description,
    transferReceiptUrl,
    transferReceiptUri,
  } = input;
  const { transferReceiptUrl: resolvedReceiptUrl, receiptUploadFailed } =
    await resolveTransferReceiptUrl(transferReceiptUrl, transferReceiptUri);

  const { data, error } = await supabase.rpc("CreatePayment", {
    expense_id: expenseId,
    description,
    transfer_receipt_url: resolvedReceiptUrl,
  });

  assertRpcSuccess("createPayment", data, error);
  if (!data?.payment_id) {
    throw new Error("Não foi possível registrar o pagamento.");
  }

  await invalidateExpenseRelatedCaches(groupId, expenseId);

  return {
    ...(data as CreatePaymentResult),
    receiptUploadFailed: receiptUploadFailed || undefined,
  };
}

// Área Pagamentos | GetPaymentsByExpenseUUID com cache

// sortExpensePaymentsByDate | Ordena pagamentos por data de registro ascendente
function sortExpensePaymentsByDate(
  payments: ExpensePayment[],
): ExpensePayment[] {
  return [...payments].sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

// fetchExpensePayments | Chama RPC GetPaymentsByExpenseUUID
async function fetchExpensePayments(
  expenseId: string,
): Promise<ExpensePayment[]> {
  const { data, error } = await supabase.rpc("GetPaymentsByExpenseUUID", {
    expense_id: expenseId,
  });

  if (error) throwExpenseServiceError("getExpensePayments", error);

  return sortExpensePaymentsByDate((data ?? []) as ExpensePayment[]);
}

// calculateExpensePayments | Consulta RPC e sincroniza cache se diferente
export async function calculateExpensePayments(
  expenseId: string,
): Promise<ExpensePayment[]> {
  const fresh = await fetchExpensePayments(expenseId);
  return syncCache(expensePaymentsCacheKey(expenseId), fresh);
}

// peekExpensePayments | Retorna cache de pagamentos sem consultar RPC
export async function peekExpensePayments(
  expenseId: string,
): Promise<ExpensePayment[] | null> {
  return getCached<ExpensePayment[]>(expensePaymentsCacheKey(expenseId));
}

// getExpensePayments | Retorna cache imediato; se ausente, calcula via RPC
export async function getExpensePayments(
  expenseId: string,
): Promise<ExpensePayment[]> {
  const cached = await peekExpensePayments(expenseId);
  if (cached) return cached;
  return calculateExpensePayments(expenseId);
}

// invalidateExpensePaymentsCache | Remove cache de pagamentos de uma despesa
export async function invalidateExpensePaymentsCache(
  expenseId: string,
): Promise<void> {
  await removeCached(expensePaymentsCacheKey(expenseId));
}

// resolveExpensePayment | Localiza pagamento no cache da despesa
export function resolveExpensePayment(
  payments: ExpensePayment[] | null,
  paymentId: string,
): ExpensePayment | null {
  return payments?.find((payment) => payment.id === paymentId) ?? null;
}

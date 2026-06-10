// Supabase
import { supabase } from "./supabase";

// Cache
import { getCached, removeCached, syncCache } from "./cacheService";

export type Group = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type PublicUser = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type GroupMemberInfo = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  joined_at: string;
  devendo: number;
  areceber: number;
};

export type GroupExpenseInfo = {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  created_at: string;
  receipt_url: string | null;
  total_members: number;
  val_por_participante: number;
  payments_feitos: number;
  payments_faltantes: number;
};

export type GroupInfo = {
  group: Group;
  members: GroupMemberInfo[];
  expenses: GroupExpenseInfo[];
};

export type RpcActionResult = {
  success: boolean;
  message: string;
};

export type GroupWithCreator = Group & {
  creatorName: string;
};

// Área Cache | Chaves e sincronização da listagem de grupos

const CACHE_KEY_GROUPS_LIST = "@cache:groups:list";

// enrichGroupsWithCreators | Anexa nome do criador a cada grupo
async function enrichGroupsWithCreators(
  data: Group[]
): Promise<GroupWithCreator[]> {
  const creatorIds = [...new Set(data.map((group) => group.created_by))];

  const creators = await Promise.all(
    creatorIds.map((id) => getPublicUser(id))
  );

  const creatorNames = Object.fromEntries(
    creatorIds.map((id, index) => [
      id,
      creators[index]?.name ?? "Desconhecido",
    ])
  );

  return data.map((group) => ({
    ...group,
    creatorName: creatorNames[group.created_by] ?? "Desconhecido",
  }));
}

// peekGroupsList | Retorna cache da listagem sem consultar RPC
export async function peekGroupsList(): Promise<GroupWithCreator[] | null> {
  return getCached<GroupWithCreator[]>(CACHE_KEY_GROUPS_LIST);
}

// invalidateGroupsListCache | Remove cache da listagem de grupos
export async function invalidateGroupsListCache(): Promise<void> {
  await removeCached(CACHE_KEY_GROUPS_LIST);
}

// Área Convite | Codificação e decodificação de códigos de convite

const INVITE_SEPARATOR = ":";

// toBase64 | Codifica string em Base64 compatível com React Native
function toBase64(value: string): string {
  const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  if (typeof globalThis.btoa !== "function") {
    throw new Error("Codificação de convite indisponível");
  }

  return globalThis.btoa(binary);
}

// fromBase64 | Decodifica Base64 para texto
function fromBase64(value: string): string {
  if (typeof globalThis.atob !== "function") {
    throw new Error("Decodificação de convite indisponível");
  }

  const binary = globalThis.atob(value.trim());
  const bytes = Array.from(binary, (char) =>
    `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`
  );

  return decodeURIComponent(bytes.join(""));
}

// encodeInvitePayload | Gera código de convite a partir de groupId e userId
function encodeInvitePayload(groupId: string, userId: string): string {
  return toBase64(`${groupId}${INVITE_SEPARATOR}${userId}`);
}

// decodeInvitePayload | Extrai groupId e creatorId do código de convite
function decodeInvitePayload(inviteCode: string): {
  groupId: string;
  creatorId: string;
} {
  const decoded = fromBase64(inviteCode);
  const separatorIndex = decoded.indexOf(INVITE_SEPARATOR);

  if (separatorIndex === -1) {
    throw new Error("Código de convite inválido");
  }

  const groupId = decoded.slice(0, separatorIndex);
  const creatorId = decoded.slice(separatorIndex + 1);

  if (!groupId || !creatorId) {
    throw new Error("Código de convite inválido");
  }

  return { groupId, creatorId };
}

// Área Erros | Tratamento centralizado de falhas do serviço

type GroupServiceContext =
  | "createNewGroup"
  | "readInviteCode"
  | "joinGroup"
  | "leaveGroup"
  | "deleteGroup"
  | "getGroups"
  | "getGroupInfo"
  | "createGroupInvite";

const KNOWN_USER_MESSAGES = [
  "usuário não autenticado",
  "código de convite inválido",
  "convite inválido",
  "você já faz parte deste grupo",
  "grupo não encontrado",
  "você não tem acesso a este grupo",
  "apenas o criador do grupo pode excluí-lo",
  "codificação de convite indisponível",
  "decodificação de convite indisponível",
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

// logGroupServiceError | Registra erro bruto no terminal para debug
function logGroupServiceError(
  context: GroupServiceContext,
  error: unknown
): void {
  const message = extractErrorMessage(error);
  const code = extractErrorCode(error);

  console.error(`[GroupService:${context}]`, error);
  console.error(
    `[GroupService:${context}] code=${code ?? "n/a"} message=${message}`
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

// throwGroupServiceError | Loga e propaga erro com mensagem para o usuário
function throwGroupServiceError(
  context: GroupServiceContext,
  error: unknown
): never {
  logGroupServiceError(context, error);
  throw new Error(resolveUserMessage(error));
}

// assertRpcSuccess | Valida retorno de RPCs que expõem success/message
function assertRpcSuccess(
  context: GroupServiceContext,
  data: RpcActionResult | null,
  error: unknown
): void {
  if (error) throwGroupServiceError(context, error);
  if (!data?.success) {
    throw new Error(data?.message || "Operação não concluída.");
  }
}

// Área Grupos autenticados | Operações que exigem sessão ativa

// createNewGroup | Cria grupo e adiciona o criador como membro
export async function createNewGroup(groupName: string): Promise<Group> {
  const { data: group, error } = await supabase.rpc("create_group", {
    group_name: groupName,
  });

  if (error) throwGroupServiceError("createNewGroup", error);
  if (!group) throw new Error("Não foi possível criar o grupo.");

  await invalidateGroupsListCache();

  return group as Group;
}

// fetchGroups | Chama RPC GetGroups
async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase.rpc("GetGroups");

  if (error) throwGroupServiceError("getGroups", error);

  return (data ?? []) as Group[];
}

// calculateGroupsList | Consulta RPC, enriquece e sincroniza cache se diferente
export async function calculateGroupsList(): Promise<GroupWithCreator[]> {
  const raw = await fetchGroups();
  const fresh = await enrichGroupsWithCreators(raw);
  return syncCache(CACHE_KEY_GROUPS_LIST, fresh);
}

// getGroupsList | Retorna cache imediato; se ausente, calcula via RPC
export async function getGroupsList(): Promise<GroupWithCreator[]> {
  const cached = await peekGroupsList();
  if (cached) return cached;
  return calculateGroupsList();
}

// getGroups | Lista grupos do usuário autenticado (RPC bruto, sem cache)
export async function getGroups(): Promise<Group[]> {
  return fetchGroups();
}

// Área Detalhe do grupo | GetGroupInfoByUUID com cache

const CACHE_KEY_GROUP_INFO_PREFIX = "@cache:groups:info:";

// groupInfoCacheKey | Gera chave de cache para detalhes de um grupo
function groupInfoCacheKey(groupId: string): string {
  return `${CACHE_KEY_GROUP_INFO_PREFIX}${groupId}`;
}

// fetchGroupInfo | Chama RPC GetGroupInfoByUUID
async function fetchGroupInfo(groupId: string): Promise<GroupInfo> {
  const { data, error } = await supabase.rpc("GetGroupInfoByUUID", {
    group_id: groupId,
  });

  if (error) throwGroupServiceError("getGroupInfo", error);
  if (!data?.group) throw new Error("Grupo não encontrado");

  return data as GroupInfo;
}

// calculateGroupInfo | Consulta RPC e sincroniza cache do grupo se diferente
export async function calculateGroupInfo(groupId: string): Promise<GroupInfo> {
  const fresh = await fetchGroupInfo(groupId);
  return syncCache(groupInfoCacheKey(groupId), fresh);
}

// peekGroupInfo | Retorna cache do detalhe do grupo sem consultar RPC
export async function peekGroupInfo(
  groupId: string
): Promise<GroupInfo | null> {
  return getCached<GroupInfo>(groupInfoCacheKey(groupId));
}

// getGroupInfo | Retorna cache imediato; se ausente, calcula via RPC
export async function getGroupInfo(groupId: string): Promise<GroupInfo> {
  const cached = await peekGroupInfo(groupId);
  if (cached) return cached;
  return calculateGroupInfo(groupId);
}

// invalidateGroupInfoCache | Remove cache de detalhes de um grupo
export async function invalidateGroupInfoCache(groupId: string): Promise<void> {
  await removeCached(groupInfoCacheKey(groupId));
}

// joinGroup | Entra em um grupo a partir do código de convite
export async function joinGroup(inviteCode: string): Promise<RpcActionResult> {
  const { groupId, creatorId } = decodeInvitePayload(inviteCode);

  const { data, error } = await supabase.rpc("JoinGroupByGroupUUID", {
    group_id: groupId,
    creator_id: creatorId,
  });

  assertRpcSuccess("joinGroup", data, error);

  await invalidateGroupsListCache();
  await invalidateGroupInfoCache(groupId);

  return data as RpcActionResult;
}

// leaveGroup | Remove o usuário autenticado do grupo
export async function leaveGroup(groupId: string): Promise<void> {
  const { data, error } = await supabase.rpc("LeaveGroupByGroupUUID", {
    group_id: groupId,
  });

  assertRpcSuccess("leaveGroup", data, error);

  await invalidateGroupsListCache();
  await invalidateGroupInfoCache(groupId);
}

// deleteGroup | Exclui grupo e dados associados (apenas criador)
export async function deleteGroup(groupId: string): Promise<void> {
  const { data, error } = await supabase.rpc("DeleteGroupByGroupUUID", {
    group_id: groupId,
  });

  assertRpcSuccess("deleteGroup", data, error);

  await invalidateGroupsListCache();
  await invalidateGroupInfoCache(groupId);
}

// Área Usuários | Consulta de perfis públicos

// getPublicUser | Busca dados públicos de um usuário pelo UUID
export async function getPublicUser(
  userId: string
): Promise<PublicUser | null> {
  const { data, error } = await supabase.rpc("get_user_by_uuid", {
    user_id: userId,
  });

  if (error || !data) return null;

  return data as PublicUser;
}

// Área Convite público | Leitura e geração de convites

// readInviteCode | Carrega preview do convite (criador + grupo)
export async function readInviteCode(
  inviteCode: string
): Promise<{ user: PublicUser; group: Group }> {
  const { groupId, creatorId } = decodeInvitePayload(inviteCode);

  const user = await getPublicUser(creatorId);
  if (!user) throw new Error("Convite inválido");

  const { data: groupInfo, error: groupError } = await supabase.rpc(
    "GetGroupInfoByUUID",
    { group_id: groupId }
  );

  if (groupError) throwGroupServiceError("readInviteCode", groupError);
  if (!groupInfo?.group) throw new Error("Convite inválido");

  return { user: user as PublicUser, group: groupInfo.group as Group };
}

// createGroupInvite | Gera código de convite para um grupo existente
export async function createGroupInvite(
  groupId: string,
  userId: string
): Promise<string> {
  const { data, error } = await supabase.rpc("GetGroupInfoByUUID", {
    group_id: groupId,
  });

  if (error) throwGroupServiceError("createGroupInvite", error);
  if (!data?.group) throw new Error("Grupo não encontrado");

  return encodeInvitePayload(groupId, userId);
}

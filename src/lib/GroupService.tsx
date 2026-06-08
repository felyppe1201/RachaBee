// Supabase
import { supabase } from "./supabase";

// Perfil do usuario na tabela users
import type { UserProfile } from "../context/UserContext";

export type Group = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
};

export type GroupMemberWithUser = GroupMember & {
  users: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
};

export type GroupInfo = Group & {
  group_members: GroupMemberWithUser[];
};

// Separador entre groupId e userId no payload do convite
const INVITE_SEPARATOR = ":";

// Formato retornado pelo Supabase em joins aninhados (objeto ou array)
type SupabaseRelation<T> = T | T[] | null;

// Payload bruto de getGroupInfo antes da normalizacao
type GroupInfoRaw = Group & {
  group_members: Array<
    GroupMember & {
      users: SupabaseRelation<NonNullable<GroupMemberWithUser["users"]>>;
    }
  >;
};

// normalizeRelation | Normaliza relações do Supabase
// Joins aninhados no PostgREST podem retornar objeto único ou array; unifica o formato para sempre devolver um array e evitar erros de tipagem.
function normalizeRelation<T>(value: SupabaseRelation<T>): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// normalizeMemberUser | Converte o campo users de um membro
// A relação users no join pode vir como objeto ou array; garante compatibilidade com GroupMemberWithUser sem casts inseguros.
function normalizeMemberUser(
  users: SupabaseRelation<NonNullable<GroupMemberWithUser["users"]>>
): GroupMemberWithUser["users"] {
  if (users == null) return null;
  if (Array.isArray(users)) return users[0] ?? null;
  return users;
}

// mapToGroupInfo | Mapeia resposta bruta para GroupInfo
// Usado por getGroupInfo após a query com joins aninhados; elimina o cast direto que quebra a checagem estrita do TypeScript.
function mapToGroupInfo(data: GroupInfoRaw): GroupInfo {
  return {
    id: data.id,
    name: data.name,
    created_by: data.created_by,
    created_at: data.created_at,
    group_members: data.group_members.map((member) => ({
      id: member.id,
      group_id: member.group_id,
      user_id: member.user_id,
      joined_at: member.joined_at,
      users: normalizeMemberUser(member.users),
    })),
  };
}

// requireAuthUserId | Obtém id do usuário autenticado
// Consulta a sessão ativa do Supabase Auth; chamado por operações que exigem usuário logado.
async function requireAuthUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Usuário não autenticado");

  return user.id;
}

// toBase64 | Codifica string em Base64
// Compatível com React Native; usado na geração do código de convite do grupo.
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
// Usado na leitura e validação do código de convite; indisponibilidade de atob impede entrada em grupos.
function fromBase64(value: string): string {
  if (typeof globalThis.atob !== "function") {
    throw new Error("Decodificação de convite indisponível");
  }

  const binary = globalThis.atob(value.trim());
  const bytes = Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`);

  return decodeURIComponent(bytes.join(""));
}

// encodeInvitePayload | Gera payload do convite
// Combina groupId e userId separados por INVITE_SEPARATOR e codifica em Base64 para formar o código compartilhável.
function encodeInvitePayload(groupId: string, userId: string): string {
  return toBase64(`${groupId}${INVITE_SEPARATOR}${userId}`);
}

// decodeInvitePayload | Extrai groupId e userId do convite
// Decodifica o Base64 e separa as partes do payload; usado em joinGroup e readInviteCode para validar o convite.
function decodeInvitePayload(inviteCode: string): { groupId: string; userId: string } {
  // Texto decodificado do Base64
  const decoded = fromBase64(inviteCode);
  // Posicao do separador entre groupId e userId
  const separatorIndex = decoded.indexOf(INVITE_SEPARATOR);

  if (separatorIndex === -1) {
    throw new Error("Código de convite inválido");
  }

  // Parte esquerda do payload: id do grupo
  const groupId = decoded.slice(0, separatorIndex);
  // Parte direita do payload: id do usuario criador
  const userId = decoded.slice(separatorIndex + 1);

  if (!groupId || !userId) {
    throw new Error("Código de convite inválido");
  }

  return { groupId, userId };
}

// Area do Usuario Logado | Interage com token e autentificacao ja existente

// createNewGroup | Cria um novo grupo
// Insere o grupo no banco e adiciona o criador como primeiro membro; se a inserção do membro falhar, reverte a criação do grupo.
export async function createNewGroup(groupName: string): Promise<Group> {
  // Id do usuario autenticado que sera o criador do grupo
  const userId = await requireAuthUserId();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name: groupName,
      created_by: userId,
    })
    .select("id, name, created_by, created_at")
    .single();

  if (groupError) throw groupError;

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
  });

  if (memberError) {
    await supabase.from("groups").delete().eq("id", group.id);
    throw memberError;
  }

  return group;
}

// readInviteCode | Lê o convite decodificado
// Retorna perfil do criador e dados do grupo para exibição na tela de preview antes do usuário confirmar entrada.
export async function readInviteCode(
  inviteCode: string
): Promise<{ user: UserProfile; group: Group }> {
  // Ids extraidos do codigo de convite decodificado
  const { userId, groupId } = decodeInvitePayload(inviteCode);

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (userError) throw userError;

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, created_by, created_at")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError) throw groupError;
  if (!user || !group) throw new Error("Convite inválido");

  return { user, group };
}

// joinGroup | Usuário entra em um grupo
// Valida o convite, verifica duplicidade de membro e insere o usuário autenticado na tabela group_members.
export async function joinGroup(inviteCode: string): Promise<GroupMember> {
  // Id do usuario que esta entrando no grupo
  const userId = await requireAuthUserId();
  // Id do grupo alvo do convite
  const { groupId } = decodeInvitePayload(inviteCode);

  const { data: existingMember, error: existingError } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingMember) throw new Error("Você já faz parte deste grupo");

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError) throw groupError;
  if (!group) throw new Error("Grupo não encontrado");

  const { data: member, error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: userId,
    })
    .select("id, group_id, user_id, joined_at")
    .single();

  if (memberError) throw memberError;

  return member;
}

// leaveGroup | Remove usuário do grupo
// Deleta o registro de group_members do usuário autenticado no grupo informado.
export async function leaveGroup(groupId: string): Promise<void> {
  const userId = await requireAuthUserId();

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) throw error;
}

// deleteGroup | Exclui um grupo
// Apenas o criador pode executar; remove todos os membros antes de excluir o grupo.
export async function deleteGroup(groupId: string): Promise<void> {
  const userId = await requireAuthUserId();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, created_by")
    .eq("id", groupId)
    .single();

  if (groupError) throw groupError;
  if (group.created_by !== userId) {
    throw new Error("Apenas o criador do grupo pode exclui-lo");
  }

  const { error: membersError } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId);

  if (membersError) throw membersError;

  const { error: deleteError } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (deleteError) throw deleteError;
}

// getGroups | Lista grupos do usuário
// Busca via group_members os grupos em que o usuário autenticado participa; alimenta a listagem na tela principal.
export async function getGroups(): Promise<Group[]> {
  // Id do usuario cujos grupos serao listados
  const userId = await requireAuthUserId();

  const { data, error } = await supabase
    .from("group_members")
    .select("groups(id, name, created_by, created_at)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).flatMap((row) =>
    normalizeRelation(row.groups as SupabaseRelation<Group>)
  );
}

// getGroupInfo | Busca informações completas do grupo
// Retorna dados do grupo com membros e perfis; exige que o usuário autenticado seja membro do grupo consultado.
export async function getGroupInfo(groupId: string): Promise<GroupInfo> {
  // Id do usuario que solicita os dados do grupo
  const userId = await requireAuthUserId();

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("Você não tem acesso a este grupo");

  const { data, error } = await supabase
    .from("groups")
    .select(
      `
      id,
      name,
      created_by,
      created_at,
      group_members (
        id,
        group_id,
        user_id,
        joined_at,
        users (
          id,
          name,
          email,
          avatar_url
        )
      )
    `
    )
    .eq("id", groupId)
    .single();

  if (error) throw error;

  return mapToGroupInfo(data as GroupInfoRaw);
}

// Area independente de login | Nao usa necessariamente o token e autentificacao do usuario

// createGroupInvite | Cria código de convite
// Verifica se o grupo existe e gera o código Base64 com groupId e userId do criador do convite.
export async function createGroupInvite(
  groupId: string,
  userId: string
): Promise<string> {
  const { data: group, error } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw error;
  if (!group) throw new Error("Grupo não encontrado");

  return encodeInvitePayload(groupId, userId);
}

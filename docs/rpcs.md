# Toma — RPCs Disponíveis (Supabase)

Referência das RPCs expostas no backend. Todas as chamadas usam `supabase.rpc(...)`.

---

## Índice

1. [get_user_by_uuid](#get_user_by_uuid)
2. [JoinGroupByGroupUUID](#joingroupbygroupuuid)
3. [LeaveGroupByGroupUUID](#leavegroupbygroupuuid)
4. [DeleteGroupByGroupUUID](#deletegroupbygroupuuid)
5. [GetGroups](#getgroups)
6. [GetGroupInfoByUUID](#getgroupinfobyuuid)
7. [ActualGlobalBalance](#actualglobalbalance)
8. [ActualBalanceByGroupUUID](#actualbalancebygroupuuid)
9. [GetValForExpenseUUID](#getvalforexpenseuuid)
10. [GetActivity](#getactivity)
11. [CreateExpense](#createexpense)
12. [CreatePayment](#createpayment)

---

## get_user_by_uuid

Busca dados públicos de um usuário pelo UUID.

**Parâmetros**

| Nome      | Tipo   | Descrição     |
| --------- | ------ | ------------- |
| `user_id` | `uuid` | ID do usuário |

**Retorno**

```typescript
{
  id: string;
  name: string;
  avatar_url: string | null;
}
```

**Chamada**

```typescript
supabase.rpc("get_user_by_uuid", {
  user_id: "uuid",
});
```

---

## JoinGroupByGroupUUID

Entra em um grupo existente.

**Parâmetros**

| Nome         | Tipo   | Descrição              |
| ------------ | ------ | ---------------------- |
| `group_id`   | `uuid` | ID do grupo            |
| `creator_id` | `uuid` | ID do criador do grupo |

**Retorno**

```typescript
{
  success: boolean;
  message: string;
}
```

**Chamada**

```typescript
supabase.rpc("JoinGroupByGroupUUID", {
  group_id: "uuid",
  creator_id: "uuid",
});
```

---

## LeaveGroupByGroupUUID

Sai de um grupo.

**Parâmetros**

| Nome       | Tipo   | Descrição   |
| ---------- | ------ | ----------- |
| `group_id` | `uuid` | ID do grupo |

**Retorno**

```typescript
{
  success: boolean;
  message: string;
}
```

**Chamada**

```typescript
supabase.rpc("LeaveGroupByGroupUUID", {
  group_id: "uuid",
});
```

---

## DeleteGroupByGroupUUID

Remove um grupo e todos os dados associados.

**Parâmetros**

| Nome       | Tipo   | Descrição   |
| ---------- | ------ | ----------- |
| `group_id` | `uuid` | ID do grupo |

**Retorno**

```typescript
{
  success: boolean;
  message: string;
}
```

**Chamada**

```typescript
supabase.rpc("DeleteGroupByGroupUUID", {
  group_id: "uuid",
});
```

**Observações**

- Apenas o criador do grupo pode executar a operação.
- Remove os dados na seguinte ordem:
  1. Payments
  2. Expenses
  3. Membros
  4. Grupo

---

## GetGroups

Lista todos os grupos do usuário autenticado.

**Parâmetros**

Nenhum.

**Retorno**

```typescript
{
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}
[];
```

**Chamada**

```typescript
supabase.rpc("GetGroups");
```

---

## GetGroupInfoByUUID

Retorna informações completas de um grupo: dados do grupo, membros, despesas e métricas de pagamento.

**Parâmetros**

| Nome       | Tipo   | Descrição   |
| ---------- | ------ | ----------- |
| `group_id` | `uuid` | ID do grupo |

**Retorno**

```typescript
{
  group: {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
  }
  members: {
    user_id: string;
    name: string;
    avatar_url: string | null;
    joined_at: string;
    devendo: number;
    areceber: number;
  }
  [];
  expenses: {
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
  }
  [];
}
```

**Chamada**

```typescript
supabase.rpc("GetGroupInfoByUUID", {
  group_id: "uuid",
});
```

---

## ActualGlobalBalance

Calcula o saldo global do usuário autenticado (todas as despesas de todos os grupos).

**Parâmetros**

Nenhum.

**Retorno**

```typescript
{
  devendo: number;
  areceber: number;
}
```

**Chamada**

```typescript
supabase.rpc("ActualGlobalBalance");
```

**Observações**

- O cálculo respeita o campo `joined_at`.
- Participantes entram apenas nas despesas criadas após sua entrada no grupo.

---

## ActualBalanceByGroupUUID

Calcula o saldo do usuário autenticado em um grupo específico.

**Parâmetros**

| Nome       | Tipo   | Descrição   |
| ---------- | ------ | ----------- |
| `group_id` | `uuid` | ID do grupo |

**Retorno**

```typescript
{
  devendo: number;
  areceber: number;
}
```

**Chamada**

```typescript
supabase.rpc("ActualBalanceByGroupUUID", {
  group_id: "uuid",
});
```

**Observações**

- O cálculo respeita o campo `joined_at`.
- Considera apenas despesas criadas após a entrada do participante no grupo.

---

## GetValForExpenseUUID

Retorna o valor por participante de uma despesa específica.

**Parâmetros**

| Nome         | Tipo   | Descrição     |
| ------------ | ------ | ------------- |
| `expense_id` | `uuid` | ID da despesa |

**Retorno**

```typescript
{
  expense_id: string;
  total: number;
  total_members: number;
  val_por_participante: number;
}
```

**Chamada**

```typescript
supabase.rpc("GetValForExpenseUUID", {
  expense_id: "uuid",
});
```

---

## GetActivity

Retorna o feed de atividades do usuário autenticado (despesas e pagamentos).

**Parâmetros**

Nenhum.

**Retorno**

```typescript
{
  expenses: {
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
  }
  [];
  payments: {
    id: string;
    expense_id: string;
    group_id: string;
    amount: number;
    description: string;
    transfer_receipt_url: string | null;
    created_at: string;
  }
  [];
}
```

**Chamada**

```typescript
supabase.rpc("GetActivity");
```

---

## CreateExpense

Cria uma nova despesa em um grupo.

**Parâmetros**

| Nome          | Tipo     | Obrigatório | Descrição                    |
| ------------- | -------- | ----------- | ---------------------------- |
| `group_id`    | `uuid`   | Sim         | ID do grupo                  |
| `description` | `string` | Sim         | Descrição da despesa         |
| `amount`      | `number` | Sim         | Valor total da despesa       |
| `receipt_url` | `string` | Não         | URL do comprovante da despesa |

**Retorno**

```typescript
{
  success: boolean;
  expense_id: string;
  total_members: number;
  val_por_participante: number;
}
```

**Chamada**

```typescript
supabase.rpc("CreateExpense", {
  group_id: "uuid",
  description: "Mercado",
  amount: 150.0,
  receipt_url: "url_opcional",
});
```

---

## CreatePayment

Registra um pagamento para uma despesa.

**Parâmetros**

| Nome                   | Tipo     | Obrigatório | Descrição                          |
| ---------------------- | -------- | ----------- | ---------------------------------- |
| `expense_id`           | `uuid`   | Sim         | ID da despesa                      |
| `description`          | `string` | Sim         | Descrição do pagamento             |
| `transfer_receipt_url` | `string` | Não         | URL do comprovante da transferência |

**Retorno**

```typescript
{
  success: boolean;
  payment_id: string;
  amount: number;
}
```

**Chamada**

```typescript
supabase.rpc("CreatePayment", {
  expense_id: "uuid",
  description: "Pix enviado",
  transfer_receipt_url: "url_opcional",
});
```

**Observações**

- O `amount` é calculado automaticamente pela RPC com base no total de membros elegíveis pelo `joined_at`.
- Quem pagou a expense não pode registrar payment para si mesmo.
- Um usuário só pode registrar um payment por expense.

---

## Regras comuns de balance

- `devendo`: valor que o usuário deve para outras pessoas.
- `areceber`: valor que outras pessoas devem para o usuário.
- Cálculos de balance respeitam `joined_at` — o participante só entra em despesas criadas depois que entrou no grupo.

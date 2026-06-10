# Toma — Padrão de Cache

Documentação do comportamento de cache da aplicação. Objetivo: exibir dados imediatamente na interface, sincronizar com o backend em background e atualizar a tela somente quando houver diferença real.

---

## Princípios

1. **Cache vive no service**, não na tela.
2. **Leitura imediata** via `peek*` ou `get*` para renderização rápida.
3. **Sincronização** via `calculate*`, que sempre consulta RPC/API e compara com cache.
4. **Escrita condicional**: cache só é substituído se os dados forem diferentes.
5. **UI atualiza só se mudou**, usando `areCacheEqual` antes de `setState`.
6. **Invalidação explícita** após mutações (create, update, delete).

---

## Camadas

```
┌─────────────────────────────────────────┐
│  Tela / Contexto (React)                │
│  peek ->exibe cache                     │
│  calculate ->sincroniza                 │
│  setState só se areCacheEqual = false   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Service (BalanceService, GroupService) │
│  peek* / get* / calculate* / invalidate*│
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  cacheService.ts                        │
│  getCached / setCached / syncCache      │
│  areCacheEqual / clearCachesByTag       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  AsyncStorage (@cache:...)              │
└─────────────────────────────────────────┘
```

---

## cacheService.ts

Funções base usadas por todos os services.

| Função                         | Descrição                                         |
| ------------------------------ | ------------------------------------------------- |
| `getCached<T>(key)`            | Lê e desserializa valor do AsyncStorage           |
| `setCached<T>(key, value)`     | Grava valor serializado                           |
| `removeCached(key)`            | Remove uma chave                                  |
| `clearAllCaches()`             | Remove todas as chaves `@cache:*`                 |
| `clearCachesByTag(tag)`        | Remove chaves `@cache:{tag}:*`                    |
| `areCacheEqual(cached, fresh)` | Compara via `JSON.stringify`                      |
| `syncCache(key, fresh)`        | Grava cache somente se diferente; retorna `fresh` |

### Convenção de chaves

```
@cache:{domínio}:{escopo}
```

Exemplos:

| Chave                                 | Conteúdo                       |
| ------------------------------------- | ------------------------------ |
| `@cache:balance:self`                 | Balance global do usuário      |
| `@cache:balance:group:{groupId}`      | Balance por grupo              |
| `@cache:balance:expense:{expenseId}`  | Split de uma despesa           |
| `@cache:groups:list`                  | Listagem de grupos com criador |
| `@cache:expense:payments:{expenseId}` | Pagamentos de uma despesa      |
| `@cache:user:self`                    | Perfil do usuário logado       |

---

## Contrato dos Services

Cada domínio com cache deve expor funções com papéis fixos:

| Função               | Consulta RPC?       | Grava cache?      | Retorno         |
| -------------------- | ------------------- | ----------------- | --------------- |
| `peek*()`            | Não                 | Não               | Cache ou `null` |
| `get*()`             | Só se cache ausente | Sim, se diferente | Cache ou fresh  |
| `calculate*()`       | Sempre              | Sim, se diferente | Sempre fresh    |
| `invalidate*Cache()` | Não                 | Remove cache      | `void`          |

### Fluxo interno de `calculate*`

```
1. fetch*()        ->chama RPC/API
2. syncCache()     ->compara com cache existente
3. retorna fresh   ->sempre os dados mais recentes
```

### Fluxo interno de `get*`

```
1. getCached()     ->se existir, retorna cache
2. calculate*()    ->senão, busca e sincroniza
```

---

## Padrão na Interface (Tela / Contexto)

Fluxo recomendado ao montar ou focar uma tela:

```typescript
import { areCacheEqual } from "../lib/cacheService";
import { peekGroupsList, calculateGroupsList } from "../lib/GroupService";

// 1. Exibir cache imediato (se existir)
const cached = await peekGroupsList();
if (cached) {
  setGroups(cached);
  setLoading(false);
}

// 2. Sincronizar com backend
try {
  const fresh = await calculateGroupsList();
  setGroups((prev) => (areCacheEqual(prev, fresh) ? prev : fresh));
} catch (err) {
  // Se houver cache, mantém a tela; senão, exibe erro
}
```

### Por que `setState` condicional?

- Evita re-render quando dados não mudaram.
- Mantém referência estável do array/objeto quando igual.
- Melhora usabilidade: lista não "pisca" ao voltar para a aba.

### Pull-to-refresh

Mesmo fluxo, mas com indicador visual:

```typescript
setRefreshing(true);
const fresh = await calculateGroupsList();
setGroups((prev) => (areCacheEqual(prev, fresh) ? prev : fresh));
setRefreshing(false);
```

---

## Invalidação

### Quando invalidar

| Situação                              | Ação                            |
| ------------------------------------- | ------------------------------- |
| Mutação que altera os dados cacheados | `invalidate*Cache()` no service |
| Logout                                | `clearAllCaches()`              |
| Domínio inteiro desatualizado         | `clearCachesByTag("balance")`   |

### Quando NÃO invalidar antes de recarregar

Preferir `calculate*()` diretamente. Ele já compara e substitui cache se necessário. Invalidar + `get*` força duas operações quando uma basta.

```typescript
// Preferir
const fresh = await calculateBalance();

// Evitar (desnecessário)
await invalidateBalanceCache();
const fresh = await getBalance();
```

---

## Tratamento de erros

| Cenário                  | Comportamento                                    |
| ------------------------ | ------------------------------------------------ |
| RPC falha e há cache     | Mantém cache na tela, não exibe erro             |
| RPC falha e não há cache | Exibe erro ou valor vazio (conforme service)     |
| Cache corrompido         | `getCached` retorna `null`, dispara `calculate*` |

---

## Checklist para novos services com cache

1. Definir chave `@cache:{domínio}:{escopo}`.
2. Implementar `fetch*` privado (RPC bruto).
3. Implementar `calculate*` com `syncCache`.
4. Implementar `peek*` com `getCached`.
5. Implementar `get*` (cache ou calculate).
6. Implementar `invalidate*Cache`.
7. Chamar invalidação nas mutações relacionadas.
8. Na tela: `peek` ->exibir ->`calculate` ->`setState` condicional com `areCacheEqual`.

---

## Referências no código

| Arquivo                   | Papel                   |
| ------------------------- | ----------------------- |
| `src/lib/cacheService.ts` | Infraestrutura de cache |

<p align="center">
  <img src="src/assets/logo_completo.png" alt="RachaBee" width="260" />
</p>
<p align="center">
  App mobile para <b>dividir despesas em grupo</b>: viagens, rolês, contas da casa, o que precisar.<br/>
  Feito com <b>React Native + Expo</b> e <b>Supabase</b>.
</p>

---

## 📖 Sobre o projeto

O **RachaBee** nasceu para acabar com a confusão de "quem pagou o quê" e "quem deve quanto pra quem". A ideia é simples: você cria um grupo, chama a galera e vai lançando os gastos. O app calcula os saldos de cada um e mostra quem precisa pagar quem.

### ✨ Funcionalidades

- **Cadastro e login** com e-mail e senha (Supabase Auth), com foto de perfil opcional
- **Grupos**: crie grupos, veja os membros, saia ou exclua um grupo
- **Convite por código**: compartilhe o código do grupo e os amigos entram colando esse código
- **Despesas**: registre quem pagou, o valor, a descrição e anexe a foto do comprovante
- **Pagamentos**: registre os acertos entre membros, com comprovante de transferência
- **Saldos**: saldo global (quanto você deve/recebe no total) e saldo por grupo
- **Atividade**: histórico de tudo o que aconteceu nos seus grupos
- **Perfil**: dados da conta, ajuda, termos de uso e política de privacidade

### 🛠️ Tecnologias

| Camada | Tecnologia |
| --- | --- |
| App | React Native 0.81, Expo SDK 54, TypeScript |
| Navegação | React Navigation (bottom tabs + native stack) |
| Estilo | NativeWind (Tailwind CSS) |
| Backend | Supabase (PostgreSQL, Auth, Storage, RPCs e RLS) |
| Testes / CI | Jest + GitHub Actions (testes e build do APK Android) |

### 📁 Estrutura de pastas

```
RachaBee/
├── App.tsx                  # Ponto de entrada do app
├── src/
│   ├── components/          # Componentes de interface, modais e popups (formulários)
│   ├── context/             # Contexto do usuário logado
│   ├── hooks/               # Hooks (ex.: useAuth)
│   ├── lib/                 # Serviços: Supabase, grupos, despesas, saldos, atividade, cache
│   ├── navigation/          # Navegação por abas
│   └── pages/               # Telas: login, home, grupos, atividade, perfil
├── supabase/
│   └── migrations/
│       └── schema.sql       # Script completo do banco (tabelas, RPCs, RLS e storage)
└── docs/                    # Documentação das RPCs e do padrão de cache
```

---

## 🚀 Como rodar o projeto

### Pré-requisitos

Antes de começar, você vai precisar de:

- [Node.js](https://nodejs.org/) **20 ou superior** (recomendado: versão LTS)
- [Git](https://git-scm.com/)
- Uma conta gratuita no [Supabase](https://supabase.com/)
- No celular: o app **Expo Go** ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))
  - ou um emulador Android (Android Studio) / simulador iOS (Xcode, só no macOS)

---

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/felyppe1201/RachaBee.git
cd RachaBee
```

---

### Passo 2 — Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com/) e faça login (dá pra entrar com o GitHub).
2. Clique em **New project**.
3. Preencha:
   - **Name**: `RachaBee` (ou o nome que preferir)
   - **Database Password**: crie uma senha forte e **guarde-a**
   - **Region**: escolha a mais próxima (ex.: `South America (São Paulo)`)
4. Clique em **Create new project** e espere alguns minutos até o projeto ficar pronto.

<!-- COLE AQUI A PRINT DA CRIAÇÃO DO PROJETO NO SUPABASE -->

---

### Passo 3 — Subir o script do banco de dados

O arquivo [`supabase/migrations/schema.sql`](supabase/migrations/schema.sql) cria tudo de que o app precisa: tabelas, trigger de criação de usuário, funções (RPCs), políticas de segurança (RLS) e o bucket de comprovantes.

1. No painel do seu projeto, vá no menu lateral em **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/migrations/schema.sql` no seu editor, **copie todo o conteúdo** e cole no SQL Editor.
4. Clique em **Run** (ou `Ctrl + Enter`).
5. Deve aparecer a mensagem **"Success. No rows returned"**.

<!-- COLE AQUI A PRINT DO SQL EDITOR COM O SCRIPT EXECUTADO -->

Para conferir, vá em **Table Editor**: devem aparecer as tabelas `users`, `groups`, `group_members`, `expenses` e `payments`.

> ⚠️ Rode o script **uma única vez** em um projeto novo. Se rodar de novo, vai dar erro de "already exists", porque as tabelas e políticas já foram criadas.

---

### Passo 4 — Criar o bucket de avatares

O script já cria o bucket `receipts` (comprovantes), mas o bucket de **fotos de perfil** precisa ser criado manualmente:

1. No menu lateral, vá em **Storage**.
2. Clique em **New bucket**.
3. Em **Name**, digite exatamente: `avatars`
4. Marque a opção **Public bucket**.
5. Clique em **Create bucket**.

<!-- COLE AQUI A PRINT DA CRIAÇÃO DO BUCKET -->

Ao final, em **Storage**, você deve ver os dois buckets: `avatars` e `receipts`.

---

### Passo 5 — Configurar a autenticação

Por padrão, o Supabase exige que o usuário confirme o e-mail antes de entrar. Você tem duas opções:

- **Manter a confirmação** (padrão): ao se cadastrar, o usuário recebe um e-mail e precisa clicar no link antes de fazer login.
- **Desativar a confirmação** (mais prático para testes): vá em **Authentication → Sign In / Providers → Email** e desmarque **Confirm email**. Depois clique em **Save**.

<!-- COLE AQUI A PRINT DA CONFIGURAÇÃO DE AUTENTICAÇÃO -->

---

### Passo 6 — Pegar as chaves da API

1. No painel, clique em **Project Settings** (ícone de engrenagem) → **API** (ou no botão **Connect** no topo da página).
2. Copie dois valores:
   - **Project URL**: algo como `https://abcdefghijkl.supabase.co`
   - **anon public** key: uma chave longa que começa com `eyJ...`

<!-- COLE AQUI A PRINT DA TELA DE API KEYS -->

> 🔒 Use **somente a chave `anon`**. Nunca coloque a chave `service_role` no app, porque ela ignora todas as regras de segurança do banco.

---

### Passo 7 — Criar o arquivo `.env`

Na **raiz do projeto** (mesma pasta do `package.json`), crie um arquivo chamado `.env` com o seguinte conteúdo, trocando pelos valores do passo anterior:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
```

Formas de criar o arquivo:

- **VS Code**: clique com o botão direito na raiz do projeto → **New File** → digite `.env`.
- **Terminal (Windows PowerShell)**:
  ```powershell
  New-Item .env -ItemType File
  ```
- **Terminal (macOS / Linux / Git Bash)**:
  ```bash
  touch .env
  ```

Dicas importantes:

- O nome do arquivo é só `.env`, **sem** `.txt` no final (no Windows, cuidado com o Bloco de Notas, que adiciona `.txt` sozinho).
- Não coloque aspas nem espaços em volta do `=`.
- As variáveis **precisam** começar com `EXPO_PUBLIC_` para o Expo enxergá-las no app.
- O `.env` já está no `.gitignore`, então ele **não** vai para o GitHub.

---

### Passo 8 — Instalar as dependências

No terminal, dentro da pasta do projeto:

```bash
npm install
```

Isso pode levar alguns minutos na primeira vez.

---

### Passo 9 — Iniciar o Expo

```bash
npx expo start
```

(ou `npm start`, que faz a mesma coisa)

Um **QR Code** vai aparecer no terminal. Agora é só abrir o app:

| Onde | Como |
| --- | --- |
| **Celular Android** | Abra o **Expo Go** e escaneie o QR Code |
| **iPhone** | Abra a **Câmera** do iPhone, escaneie o QR Code e toque na notificação para abrir no Expo Go |
| **Emulador Android** | Com o emulador aberto, aperte `a` no terminal |
| **Simulador iOS** (macOS) | Aperte `i` no terminal |

<!-- COLE AQUI A PRINT DO TERMINAL COM O QR CODE -->

> 📶 O celular e o computador precisam estar **na mesma rede Wi-Fi**. Se não conectar (rede da faculdade, VPN, firewall...), rode com túnel:
> ```bash
> npx expo start --tunnel
> ```

Pronto! Crie uma conta na tela de cadastro e comece a rachar as contas. 🐝

---

### 🧰 Comandos úteis

| Comando | O que faz |
| --- | --- |
| `npm start` | Inicia o servidor do Expo |
| `npm run android` | Inicia e abre direto no Android |
| `npm run ios` | Inicia e abre direto no iOS |
| `npm test` | Roda os testes com Jest |
| `npx expo start -c` | Inicia limpando o cache do Metro |

---

## ❓ Problemas comuns

**O app abre mas dá erro de conexão / `supabaseUrl is required`**
O `.env` não foi lido. Confira se ele está na raiz do projeto, se os nomes das variáveis estão certos e reinicie o Expo limpando o cache: `npx expo start -c`.

**Erro ao cadastrar: "Email not confirmed" ao fazer login**
A confirmação de e-mail está ativa. Confirme pelo link enviado no e-mail ou desative a opção no Passo 5.

**A foto de perfil não aparece após o cadastro**
Verifique se o bucket `avatars` foi criado com esse nome exato e marcado como **público** (Passo 4).

**O QR Code não conecta no celular**
Confira se ambos estão na mesma rede ou use `npx expo start --tunnel`.

**Erro "already exists" ao rodar o `schema.sql`**
O script já foi executado nesse projeto. Use um projeto novo do Supabase ou apague as tabelas antes de rodar de novo.

---

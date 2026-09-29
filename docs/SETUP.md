# 📖 Guia de Instalação — Filmografia

Este guia leva você do **clone** até o **deploy em produção**, sem pegadinhas. Siga na ordem. Tempo estimado: **15–25 minutos** (a maior parte é criar as contas gratuitas).

- [0. Pré-requisitos](#0-pré-requisitos)
- [1. Clonar e instalar](#1-clonar-e-instalar)
- [2. Banco de dados no Neon](#2-banco-de-dados-no-neon)
- [3. Variáveis de ambiente e primeiro acesso](#3-variáveis-de-ambiente-e-primeiro-acesso)
- [4. Deploy na Vercel](#4-deploy-na-vercel)
- [5. Scripts de verificação (opcional)](#5-scripts-de-verificação-opcional)
- [Dicas para o tier free](#dicas-para-o-tier-free)

> Erros? Consulte a [Solução de Problemas](TROUBLESHOOTING.md).

---

## 0. Pré-requisitos

| Ferramenta | Versão | Para quê | Como instalar |
| --- | --- | --- | --- |
| **Node.js** | 18.18 ou superior (recomendado 20+) | Rodar o app e o npm | [nodejs.org](https://nodejs.org) |
| **npm** | vem com o Node | Gerenciar dependências | — |
| **Git** | qualquer versão recente | Clonar o repositório | [git-scm.com](https://git-scm.com) |
| Conta **TMDB** | gratuita | Chave da API de filmes | [themoviedb.org](https://www.themoviedb.org/signup) |
| Conta **Neon** | gratuita | Banco PostgreSQL serverless | [neon.tech](https://neon.tech) |
| Conta **Vercel** | gratuita (só para deploy) | Hospedagem | [vercel.com](https://vercel.com/signup) |
| Conta **OMDb** | gratuita (opcional) | Nota oficial do IMDb | [omdbapi.com](https://www.omdbapi.com/apikey.aspx) |

Verifique as instalações:

```bash
node -v    # deve imprimir v18.18+ ou v20+
npm -v
git --version
```

---

## 1. Clonar e instalar

```bash
# Clone o seu fork/cópia do repositório
git clone https://github.com/SEU-USUARIO/filmografia.git
cd filmografia

# Instale as dependências.
# O script "postinstall" já roda `prisma generate` automaticamente.
npm install
```

Se `npm install` terminar sem erros vermelhos, está pronto. (Avisos amarelos de *peer deps* ou do `npm audit` em pacotes **exclusivos do CLI do Prisma** são inofensivos — veja a [Solução de Problemas](TROUBLESHOOTING.md).)

---

## 2. Banco de dados no Neon

O Neon é um PostgreSQL serverless com *pooler* embutido — ideal para as funções serverless da Vercel. O plano gratuito atende um catálogo pessoal.

1. Crie a conta em [neon.tech](https://neon.tech) (entrar com GitHub/Google é mais rápido) e crie um projeto chamado `filmografia`.
   - **Database name**: `neondb`
   - **Region**: AWS São Paulo (`sa-east-1`) se disponível; senão, US East.
2. No painel do projeto, abra **Connection Details** e copie **duas** strings:
   - **Pooled connection** (o host contém `-pooler`) → será o seu `DATABASE_URL` (usado em runtime/serverless).
   - **Direct connection** (o host **não** contém `-pooler`) → será o seu `DIRECT_URL` (usado pelo Prisma CLI nas migrações).

   Formato:
   ```
   postgresql://USUARIO:SENHA@ep-xxxx[-pooler].REGIAO.aws.neon.tech/neondb?sslmode=require
   ```

3. Crie as tabelas. Com o `.env` já preenchido (passo 3), rode:

   ```bash
   npm run db:deploy
   ```

   > **Alternativa sem CLI:** copie o conteúdo de [`prisma/init.sql`](../prisma/init.sql) e execute no **SQL Editor** do painel do Neon.

> 💡 O projeto Neon "adormece" após alguns minutos de inatividade e "acorda" na primeira requisição — a 1ª carga pode levar ~1s. É normal no tier free.

---

## 3. Variáveis de ambiente e primeiro acesso

### 3.1 Criar o `.env`

```bash
cp .env.example .env          # Linux/macOS
# Windows (PowerShell): Copy-Item .env.example .env
```

### 3.2 Preencher o `.env`

Abra o `.env` e preencha:

```dotenv
# Neon — string "pooled" (host COM -pooler). Usada em runtime.
DATABASE_URL="postgresql://USUARIO:SENHA@ep-xxxx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&connection_timeout=10"

# Neon — string "direct" (host SEM -pooler). Usada só pelo Prisma CLI nas migrações.
DIRECT_URL="postgresql://USUARIO:SENHA@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require"

# Pool de conexões por função serverless (deixe 3 no tier free).
PG_POOL_MAX="3"

# TMDB (obrigatória) — chave "v3 auth" de https://www.themoviedb.org/settings/api
TMDB_API_KEY="sua_chave_tmdb_aqui"

# OMDb (opcional) — https://www.omdbapi.com/apikey.aspx
OMDB_API_KEY=""

# Segredo que assina o cookie de sessão (obrigatório, mín. 16 chars).
# Gere um valor aleatório longo com o comando abaixo.
AUTH_SECRET="cole_aqui_um_segredo_aleatorio_longo"
```

**Como obter a `TMDB_API_KEY`:**
1. Crie conta em [themoviedb.org](https://www.themoviedb.org/signup) e faça login.
2. Vá em **Settings → API** ([link direto](https://www.themoviedb.org/settings/api)) e clique em **Create** / **Request an API Key**.
3. Escolha **Developer**, aceite os termos e preencha o formulário (pode usar dados de estudo/pessoal).
4. Copie a **API Key (v3 auth)** — é ela que vai no `TMDB_API_KEY`.

**Como gerar o `AUTH_SECRET`:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cole o valor impresso no `AUTH_SECRET`. **Use um segredo diferente em produção.**

### 3.3 Aplicar as migrações e rodar

```bash
npm run db:deploy   # cria as tabelas no Neon
npm run dev         # sobe em http://localhost:3000
```

### 3.4 Primeiro acesso (bootstrap do admin)

1. Abra [http://localhost:3000](http://localhost:3000).
2. Como o banco está vazio, você será redirecionado ao modo **bootstrap**.
3. Crie a conta de **administrador**: nome, e-mail e senha (a senha precisa ser confirmada).
4. Pronto! Você está logado como `ADMIN`. Novos colaboradores são criados depois, no **Dashboard**.

> ⚠️ O bootstrap só funciona **enquanto não existir nenhum usuário**. Se quiser recomeçar, veja "Resetar dados" na [Solução de Problemas](TROUBLESHOOTING.md).

---

## 4. Deploy na Vercel

Você tem duas opções. A **Opção A** (via Git) é a recomendada porque gera deploy automático a cada push.

### Opção A — Importar um repositório Git

1. Crie um repositório (público ou privado) no GitHub e envie este projeto:
   ```bash
   git init
   git add .
   git commit -m "Filmografia: setup inicial"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/filmografia.git
   git push -u origin main
   ```
   > O `.gitignore` já exclui `.env`, `.next`, `node_modules`, `.vercel` e o client Prisma gerado. **Confirme que o `.env` NÃO foi enviado** antes de dar push.
2. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório.
3. A Vercel detecta o framework (**Next.js**) e o build (`prisma generate && next build`) automaticamente.
4. Em **Settings → Environment Variables**, cadastre as mesmas chaves do `.env`:
   `DATABASE_URL`, `DIRECT_URL`, `TMDB_API_KEY`, `AUTH_SECRET` (**gere um segredo novo**, diferente do local) e, opcionalmente, `OMDB_API_KEY`, `PG_POOL_MAX`.
5. Clique em **Deploy**.

### Opção B — Deploy direto via CLI (sem Git)

```bash
npx vercel            # deploy de preview; siga o assistente no terminal
npx vercel --prod     # deploy em produção
```

### Depois do primeiro deploy

As migrações precisam ser aplicadas no banco de **produção**. Como o Neon é o mesmo banco, se você já rodou `npm run db:deploy` no passo 3, as tabelas já existem. Caso contrário, rode localmente com o `.env` apontando para o banco de produção, ou execute [`prisma/init.sql`](../prisma/init.sql) no SQL Editor do Neon.

---

## 5. Scripts de verificação (opcional)

A pasta [`scripts/`](../scripts) contém utilitários em **PowerShell** que testam a API localmente (bootstrap, login, filtros, relatórios). São úteis para conferir se tudo funciona após a instalação.

Pré-requisito: app rodando em `http://localhost:3000` (`npm run dev`) e banco vazio (para o bootstrap).

```powershell
# Windows (PowerShell 7+)
./scripts/test-auth-flow.ps1     # fluxo completo: bootstrap → login → colaborar → relatórios
./scripts/verify-filters.ps1     # confere os filtros avançados
./scripts/verify-ui.ps1          # checagens de UI/HTML
```

> Esses scripts usam credenciais **fictícias** de teste (`admin@filmografia.test` / `admin12345`) que criam usuários no **seu** banco local. Use apenas em ambiente de desenvolvimento.

---

## Dicas para o tier free

- **Vercel Hobby** é para uso não comercial; funções serverless têm limite de execução. O app foi desenhado para ser leve (páginas dinâmicas rápidas e cache de dados do TMDB via `fetch` com revalidação).
- **Pool de conexões baixo** (`PG_POOL_MAX=3`): cada função serverless abre o próprio pool; hospedagem compartilhada costuma limitar o total de conexões.
- **Cache do TMDB**: as respostas são cacheadas pelo Next (busca ~1h, detalhes ~24h, onde assistir ~12h), reduzindo latência e consumo de cota.
- **Neon free**: o banco "adormece" por inatividade; a primeira requisição pode demorar ~1s para "acordar".

---

## ✅ Checklist final

- [ ] `node -v` ≥ 18.18
- [ ] `npm install` sem erros
- [ ] `.env` criado a partir do `.env.example` e preenchido
- [ ] `TMDB_API_KEY` (v3 auth) preenchida
- [ ] `AUTH_SECRET` gerado com valor longo e aleatório
- [ ] `DATABASE_URL` (pooled) e `DIRECT_URL` (direct) corretos
- [ ] `npm run db:deploy` executou sem erro
- [ ] `npm run dev` sobe e o **bootstrap** cria o admin
- [ ] (Produção) Deploy na Vercel com as variáveis de ambiente cadastradas

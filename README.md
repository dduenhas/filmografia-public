# 🎬 Filmografia — Catálogo de Filmes

Sistema web completo para catalogação de filmes, com **login e papéis de acesso**, **múltiplos catálogos** (inclusive compartilhados em equipe), busca em catálogos online gratuitos, **cadastro manual** de obras, capas, trailers, "onde assistir", favoritos, watchlist, avaliação pessoal, anotações, **localização física e tipo de mídia** da cópia, **filtros avançados**, **dashboard com gestão de colaboradores** e **relatórios em CSV e PDF** — tudo persistido em PostgreSQL.

> 📖 **Quer rodar o projeto?** Siga o **[Guia de Instalação passo a passo](docs/SETUP.md)**. Encontrou um erro? Veja a **[Solução de Problemas](docs/TROUBLESHOOTING.md)**.

---

## ✨ Funcionalidades

- 🔐 **Login com papéis**: `ADMIN` (gerencia colaboradores + catálogos), `COLLABORATOR` (cataloga em catálogos compartilhados) e `MEMBER`. O primeiro acesso cria o administrador via *bootstrap*. Sessão em JWT (cookie httpOnly) e senha com bcrypt.
- 📁 **Múltiplos catálogos**: cada usuário pode criar vários catálogos e compartilhá-los com a equipe (regras de isolamento por papel).
- ✍️ **Cadastro manual**: filmes não encontrados nas fontes online podem ser cadastrados/editados à mão (metadados, imagens, links e localização). Sem capa/fundo, o sistema exibe **imagens padrão (placeholder)**.
- 👥 **Dashboard** (admin): estatísticas do catálogo, notas médias, gêneros mais presentes, adicionados recentemente e **gestão de colaboradores** (criar, promover/rebaixar, ativar/desativar, redefinir senha, excluir).
- 🔎 **Busca global** com autocomplete (debounce, navegação por teclado, resultados com capa e nota).
- 📚 **Catálogo local** no PostgreSQL com abas: Todos · Favoritos · Para assistir · Assistidos.
- 🗂️ **Filtros avançados**: gênero, país, faixa de ano, ator/atriz, diretor(a), produtora, **tipo de mídia**, **local** e **estante** (com autocompletar a partir dos valores reais do catálogo e busca parcial).
- 📍 **Localização física da cópia**: local, estante, prateleira e numeração (tudo opcional).
- 💿 **Tipo de mídia**: DVD, VHS, VCD, CD, DVD-R, 8MM, BetaMax ou **Digital** — neste último, habilita o campo de **URL da cópia**.
- 🔃 **Ordenações**: recentes, título, nota TMDB, minha nota, lançamento (novos/antigos) e duração.
- 📊 **Relatórios em CSV e PDF**: exporta o resultado dos filtros atuais ou o catálogo completo. O **CSV** é compatível com Excel/Google Sheets (BOM UTF-8, separador `;`) e inclui metadados, avaliações, links IMDb/TMDB e as colunas de **localização física** e **mídia**. O **PDF** (A4 paisagem) traz uma coluna de **mídia** (tipo + URL quando aplicável).
- 🎞️ **Página do filme**: hero com backdrop, capa, trailer em modal (YouTube sem cookies), demais vídeos, sinopse, elenco, ficha técnica.
- 📺 **Onde assistir no Brasil** (streaming/alugar/comprar) com link para o JustWatch.
- ⭐ **Avaliação pessoal** (0–10), data de "assistido" automática, anotações privadas.
- 🔒 **Segurança**: rotas protegidas por sessão/papel, headers CSP/nosniff/frame-deny, rate limiting, validação zod em todas as entradas, queries parametrizadas (Prisma).

---

## 🧱 Stack

| Camada | Tecnologia | Onde roda |
| --- | --- | --- |
| Frontend + API | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript | Vercel (tier free) |
| Estilo | Tailwind CSS v4 (tema dark de cinema) | — |
| ORM | Prisma 7 + `@prisma/adapter-pg` | Vercel (serverless) |
| Banco | PostgreSQL | Neon (free tier, serverless com pooler) |
| Relatórios | CSV nativo + PDF via `pdfkit` | API route |
| Fontes de dados | **TMDB** (principal) + **OMDb** (complementar, opcional) | APIs externas |

### Fontes de dados gratuitas

- **[TMDB](https://www.themoviedb.org/settings/api)** — fonte principal (obrigatória). Gratuita, com licença atribuída. Fornece busca, capas/backdrops, sinopse em pt-BR, elenco, vídeos/trailers do YouTube e **onde assistir no Brasil** (parceria JustWatch). Cada filme inclui o `imdb_id` oficial.
- **[OMDb](https://www.omdbapi.com/apikey.aspx)** (opcional) — complementa com a **nota oficial do IMDb**, prêmios e classificação indicativa. Free tier: 1.000 requisições/dia. Se `OMDB_API_KEY` não estiver configurada, o sistema funciona normalmente sem ela.

---

## 🚀 Início rápido

Pré-requisitos: **Node.js 18.18+** (recomendado 20+), **npm** e uma conta gratuita no **[TMDB](https://www.themoviedb.org/settings/api)** e no **[Neon](https://neon.tech)**.

```bash
# 1. Clone o repositório
git clone https://github.com/SEU-USUARIO/filmografia.git
cd filmografia

# 2. Instale as dependências (o prisma generate roda automaticamente no postinstall)
npm install

# 3. Crie seu arquivo de ambiente a partir do exemplo
cp .env.example .env          # Windows (PowerShell): Copy-Item .env.example .env

# 4. Preencha o .env (DATABASE_URL, DIRECT_URL, TMDB_API_KEY, AUTH_SECRET) — veja a tabela abaixo

# 5. Crie as tabelas no banco
npm run db:deploy

# 6. Rode em desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Com o banco vazio, você será levado ao modo **bootstrap** para criar a conta de **administrador** (nome, e-mail e senha).

> 👉 O **[Guia de Instalação](docs/SETUP.md)** detalha cada passo — incluindo como obter as strings de conexão do Neon e como publicar na Vercel.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | String de conexão PostgreSQL *pooled* (host com `-pooler`), usada em runtime/serverless. |
| `DIRECT_URL` | ✅ (migrations) | Conexão direta (host **sem** `-pooler`), usada pelo Prisma CLI nas migrações. |
| `TMDB_API_KEY` | ✅ | Chave **v3 auth** do TMDB. Crie grátis em [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api). |
| `AUTH_SECRET` | ✅ | Segredo aleatório longo (mín. 16 chars) que assina o cookie de sessão. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **Use um valor diferente em produção.** |
| `OMDB_API_KEY` | opcional | Nota oficial do IMDb, prêmios e classificação. Crie grátis em [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx). |
| `PG_POOL_MAX` | opcional | Pool de conexões por função serverless (padrão `3`). |

---

## ☁️ Deploy na Vercel (tier free)

1. Suba o projeto para um repositório Git e importe em [vercel.com/new](https://vercel.com/new) — as configurações são detectadas automaticamente (framework Next.js, build `prisma generate && next build`).
2. Em **Settings → Environment Variables**, cadastre: `DATABASE_URL`, `DIRECT_URL`, `TMDB_API_KEY`, `AUTH_SECRET` (gere um segredo **novo**, diferente do local) e, opcionalmente, `OMDB_API_KEY` e `PG_POOL_MAX`.
3. Aplique as migrações no banco de produção: `npm run db:deploy` (com o `DATABASE_URL`/`DIRECT_URL` de produção no seu `.env` local) — ou execute [`prisma/init.sql`](prisma/init.sql) no **SQL Editor** do Neon.
4. Deploy. ✔️

> **Alternativa sem Git:** rode `npx vercel` (ou `npx vercel --prod`) na pasta do projeto e siga o assistente no terminal.

Passo a passo completo com capturas e dicas de tier free no **[Guia de Instalação](docs/SETUP.md#4-deploy-na-vercel)**.

---

## 📜 Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Gera o client Prisma + build de produção |
| `npm run start` | Servidor de produção local |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Cria/aplica migrations (dev) |
| `npm run db:deploy` | Aplica migrations (produção) |
| `npm run db:studio` | Prisma Studio (GUI do banco) |

---

## 🗂️ Estrutura do projeto

```
prisma/
  schema.prisma       # modelos Movie (metadados + dados pessoais + localização/mídia), User e Catalog
  migrations/         # migrations versionadas (npm run db:deploy)
  init.sql            # SQL para criar as tabelas manualmente (SQL Editor do Neon)
prisma.config.ts      # config do Prisma CLI v7 (URL do banco p/ migrations)
src/
  app/
    page.tsx              # home: catálogo com abas, filtros, ordenação, relatório e paginação
    movie/[tmdbId]/       # detalhes do filme (TMDB + registro local)
    filme/[id]/           # detalhes do filme cadastrado manualmente
    filme/novo/           # formulário de cadastro manual
    login/                # login + bootstrap do primeiro admin
    dashboard/            # estatísticas + gestão de colaboradores (admin)
    api/search/           # busca TMDB (+ flag "no catálogo")
    api/movies/           # POST importa filme · PATCH/DELETE dados pessoais (favorito, nota, localização, mídia…)
    api/movies/manual/    # POST/PATCH cadastro manual de filme
    api/reports/          # GET exporta CSV ou PDF (com os filtros ativos ou completo)
    api/catalogs/         # gestão de catálogos (criar/renomear/selecionar/compartilhar)
    api/users/            # gestão de colaboradores (somente ADMIN)
    api/auth/             # login · logout · bootstrap
  components/             # search box, cards, tabs, filtros, relatório, ações, formulário manual, etc.
  lib/                    # prisma, tmdb, auth (JWT+bcrypt), catalog, report, report-pdf, media, rate-limit, validation
  proxy.ts                # middleware: exige sessão JWT em todas as rotas (exceto /login e /api/auth)
docs/                     # documentação de ajuda (SETUP, TROUBLESHOOTING)
scripts/                  # utilitários de verificação (PowerShell) para testar a API localmente
```

---

## 🖼️ Imagens placeholder

Quando um filme manual não tem capa ou imagem de fundo, o sistema exibe imagens padrão definidas em [`src/components/placeholder-image.tsx`](src/components/placeholder-image.tsx). Elas são carregadas com `next/image` em modo `unoptimized`, então **você pode apontar para qualquer URL de imagem pública** (ou trocar por arquivos locais em `public/`). Substitua pelas suas próprias imagens se preferir.

---

## 🔒 Notas de segurança

- Chaves de API vivem **apenas no servidor** (nunca expostas ao navegador).
- CSP restritiva, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` e `Permissions-Policy` em todas as rotas.
- Trailers incorporados via `youtube-nocookie.com` (sem cookies de rastreamento).
- Rate limiting por IP nas rotas de busca, importação, login e gestão de usuários.
- Autenticação com **JWT (HS256)** em cookie httpOnly/secure/SameSite=Lax e senhas com **bcrypt**; o middleware (`proxy.ts`) bloqueia qualquer rota sem sessão válida, e as rotas/páginas conferem o **papel** antes de ações sensíveis.
- Mensagens de login genéricas (não revelam se o e-mail existe) e proteção contra *open redirect* no redirecionamento pós-login.
- **Nunca** versione o arquivo `.env` (ele já está no `.gitignore`). Use segredos diferentes entre ambiente local e produção.

---

## 🩺 Solução de problemas

Veja a **[Solução de Problemas](docs/TROUBLESHOOTING.md)** para os erros mais comuns: conexão com o Neon, migrações, `AUTH_SECRET`, chaves de API, imagens e deploy.

---

## 📄 Licença

Distribuído sob a licença **MIT** — veja o arquivo [`LICENSE`](LICENSE). Você é livre para usar, adaptar e publicar a sua própria cópia.

## 🙏 Atribuição

Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB. Dados de "onde assistir" fornecidos por JustWatch via TMDB.

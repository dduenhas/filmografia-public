# 🩺 Solução de Problemas — Filmografia

Erros mais comuns durante instalação, execução e deploy — com a causa e a correção. Se o seu problema não estiver aqui, abra uma *issue* no repositório.

---

## Instalação e dependências

### `npm install` falha ou o Prisma não gera o client
- Confirme o **Node.js ≥ 18.18** (`node -v`). Versões antigas quebram o Next.js 16 e o Prisma 7.
- Rode manualmente a geração do client:
  ```bash
  npx prisma generate
  ```
- Limpe o cache e reinstale se algo parecer corrompido:
  ```bash
  rm -rf node_modules package-lock.json   # Windows: Remove-Item -Recurse -Force node_modules, package-lock.json
  npm install
  ```

### `npm audit` aponta vulnerabilidades
Muitos avisos vêm de dependências **exclusivas do CLI do Prisma** (dev-only, ex.: drivers de outros bancos). Elas **não** são empacotadas no deploy da Vercel nem usadas em runtime. Pode ignorar com segurança para uso pessoal.

### Erros de TypeScript sobre campos do Prisma (`Property 'X' does not exist`)
O client Prisma ficou desatualizado em relação ao `schema.prisma`. Regere:
```bash
npx prisma generate
```

---

## Banco de dados (Neon / Prisma)

### `Can't reach database server` / timeout na conexão
- Confira se `DATABASE_URL` usa o host **com `-pooler`** e `DIRECT_URL` o host **sem `-pooler`**.
- Verifique o `?sslmode=require` no final das duas strings.
- O Neon "adormece" por inatividade: a primeira conexão pode falhar/demorar ~1s. Tente novamente.
- Confirme que a **região** e o **nome do banco** (`neondb`) estão corretos.

### `npm run db:deploy` não cria as tabelas
- O Prisma CLI usa o `DIRECT_URL` (veja [`prisma.config.ts`](../prisma.config.ts)). Garanta que ele está preenchido e válido.
- Alternativa manual: execute [`prisma/init.sql`](../prisma/init.sql) no **SQL Editor** do Neon.

### Erro de sintaxe no PostgreSQL mencionando `cast`
`cast` é palavra reservada do PostgreSQL. Em SQL cru, colunas com esse nome precisam de aspas duplas (`"cast"`). O Prisma já trata isso nas queries geradas; se você escrever SQL manual, quote as palavras reservadas.

### Erro `DISTINCT ... ORDER BY` / `COLLATE`
Ao ordenar alfabeticamente com `DISTINCT` em SQL cru, o PostgreSQL exige que a expressão do `ORDER BY` apareça na lista do `SELECT DISTINCT`. Use o padrão `DISTINCT` em subconsulta + `ORDER BY ... COLLATE "und-x-icu"` por fora.

---

## Autenticação e ambiente

### A página fica em loop de login / erro de sessão
- O `AUTH_SECRET` é **obrigatório** e precisa ter **mínimo 16 caracteres**. Gere um novo:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Depois de trocar o segredo, **limpe os cookies** do navegador (o cookie antigo fica inválido).
- Em produção, o cookie exige **HTTPS** (a Vercel já fornece). Localmente use `http://localhost:3000`.

### Não consigo criar o admin (bootstrap)
O bootstrap só aparece **enquanto não existir nenhum usuário** no banco. Se já existe um, faça login com ele. Para recomeçar do zero, apague os dados:
- Prisma Studio: `npm run db:studio` e remova os registros, **ou**
- execute um `TRUNCATE`/`DELETE` nas tabelas via SQL Editor do Neon (cuidado: ação destrutiva).

---

## Imagens

### Capas/backdrops não carregam
- As imagens do TMDB são servidas por CDN pública e não exigem configuração extra.
- Para **imagens externas arbitrárias** (ex.: cadastro manual com URL própria), o componente usa `next/image` com `unoptimized`, então não é preciso configurar `remotePatterns`. Se você remover o `unoptimized`, precisará autorizar o domínio em `next.config.ts`.
- A **CSP** (`img-src 'self' data: blob: https:`) já permite qualquer host HTTPS. Se mudar a política, ajuste em conformidade.

### Quero trocar as imagens placeholder
Edite as constantes em [`src/components/placeholder-image.tsx`](../src/components/placeholder-image.tsx) (URLs de capa e fundo) ou aponte para arquivos seus em `public/`.

---

## Deploy (Vercel)

### Build falha na Vercel, mas funciona local
- Cadastre **todas** as variáveis de ambiente em **Settings → Environment Variables** (`DATABASE_URL`, `DIRECT_URL`, `TMDB_API_KEY`, `AUTH_SECRET`). A ausência de `TMDB_API_KEY` ou `AUTH_SECRET` quebra o build/runtime.
- O comando de build é `prisma generate && next build` (já configurado). Não o remova.
- Confirme que o `.env` **não** foi commitado (ele está no `.gitignore`); as variáveis devem estar na Vercel, não no repositório.

### O deploy subiu, mas o banco não tem tabelas
As migrações rodam pelo Prisma CLI, **não** automaticamente no deploy da Vercel. Rode `npm run db:deploy` localmente apontando para o banco de produção, ou execute [`prisma/init.sql`](../prisma/init.sql) no SQL Editor do Neon.

### `vercel logs` falha no PowerShell ao redirecionar a saída
O wrapper PowerShell do Vercel CLI tem problema com redirecionamento de saída. Invoque o binário Node diretamente:
```powershell
node "$env:APPDATA\npm\node_modules\vercel\dist\vc.js" logs <URL-DO-DEPLOY> --level error --since 5m --no-follow
```

---

## Ainda com problema?

1. Rode `npm run build` e leia a **primeira** mensagem de erro (geralmente é a causa raiz).
2. Confira o checklist final do [Guia de Instalação](SETUP.md#-checklist-final).
3. Abra uma *issue* com: trecho do erro, `node -v`, o passo em que ocorreu e se é ambiente local ou produção. **Nunca** cole seu `.env`, chaves ou strings de conexão.

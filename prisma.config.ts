import "dotenv/config";
import { defineConfig } from "prisma/config";

// Configuração do Prisma CLI (v7+): a URL do banco sai do schema e vem para cá.
// DIRECT_URL é usada pelas migrações (prisma migrate dev/deploy, db push, studio).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  migrations: {
    path: "prisma/migrations",
  },
});

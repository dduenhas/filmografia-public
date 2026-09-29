// Limpa os dados de teste (filmes e usuários) direto no Neon, lendo a URL do .env.
// Uso: node scripts/reset-data.mjs
import "dotenv/config";
import pg from "pg";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL/DATABASE_URL não configuradas");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
const movies = await client.query('DELETE FROM "Movie"');
const users = await client.query('DELETE FROM "User"');
await client.end();
console.log(`Limpo: ${movies.rowCount} filmes, ${users.rowCount} usuários removidos.`);

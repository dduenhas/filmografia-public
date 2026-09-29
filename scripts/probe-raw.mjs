// Sonda cada query raw usada em getFacets/getDashboard/matchArrayValues direto no Neon (pg puro)
// para identificar qual gera erro de sintaxe 42601.
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const queries = {
  facets_genres: `SELECT DISTINCT unnest(genres) AS value FROM "Movie" ORDER BY value`,
  facets_countries: `SELECT DISTINCT unnest(countries) AS value FROM "Movie" ORDER BY value`,
  facets_cast: `SELECT DISTINCT unnest("cast") AS value FROM "Movie" ORDER BY value`,
  facets_companies: `SELECT DISTINCT unnest("productionCompanies") AS value FROM "Movie" ORDER BY value`,
  facets_directors: `SELECT DISTINCT director AS value FROM "Movie" WHERE director IS NOT NULL AND director <> '' ORDER BY director`,
  facets_years: `SELECT DISTINCT EXTRACT(YEAR FROM "releaseDate")::int AS year FROM "Movie" WHERE "releaseDate" IS NOT NULL ORDER BY year DESC`,
  dash_genres: `SELECT g AS genre, COUNT(*) AS count FROM "Movie", unnest(genres) AS g GROUP BY g ORDER BY count DESC LIMIT 8`,
  dash_countries: `SELECT c AS country, COUNT(*) AS count FROM "Movie", unnest(countries) AS c GROUP BY c ORDER BY count DESC LIMIT 6`,
  match_cast: `SELECT DISTINCT u AS value FROM "Movie" m, unnest(m."cast") AS u WHERE u ILIKE '%Keanu%'`,
};

for (const [name, sql] of Object.entries(queries)) {
  try {
    const r = await client.query(sql);
    console.log(`OK    ${name} (${r.rows.length} linhas)`);
  } catch (e) {
    console.log(`ERRO  ${name}: ${e.message.split("\n")[0]}`);
  }
}
await client.end();

import { NextResponse } from "next/server";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import { resolveCurrentCatalogFromRequest } from "@/lib/catalogs";
import { getMoviesForReport } from "@/lib/catalog";
import { buildCatalogCsv } from "@/lib/report";
import { buildCatalogPdf } from "@/lib/report-pdf";
import { catalogQuerySchema } from "@/lib/validation";

const TAB_LABEL: Record<string, string> = {
  all: "Catálogo completo",
  favorites: "Favoritos",
  watchlist: "Para assistir",
  watched: "Assistidos",
};

// GET /api/reports?<mesmos parâmetros do catálogo>&format=csv|pdf — exporta com os filtros ativos.
// Sem parâmetros = relatório completo do catálogo ativo.
export async function GET(req: Request) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const catalog = await resolveCurrentCatalogFromRequest(req, user);

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = catalogQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const p = parsed.data;
  try {
    const movies = await getMoviesForReport({
      catalogId: catalog.id,
      tab: p.tab,
      q: p.q,
      genres: p.genres,
      countries: p.countries,
      yearFrom: p.yearFrom,
      yearTo: p.yearTo,
      cast: p.cast,
      director: p.director,
      company: p.company,
      mediaType: p.mediaType,
      location: p.location,
      shelf: p.shelf,
    });

    const date = new Date().toISOString().slice(0, 10);
    const suffix = p.tab === "all" ? "catalogo" : p.tab;

    if (format === "pdf") {
      const filterParts: string[] = [];
      if (p.q) filterParts.push(`busca “${p.q}”`);
      if (p.genres.length) filterParts.push(`gêneros: ${p.genres.join(", ")}`);
      if (p.countries.length) filterParts.push(`países: ${p.countries.join(", ")}`);
      if (p.yearFrom || p.yearTo) filterParts.push(`anos: ${p.yearFrom ?? "…"}–${p.yearTo ?? "…"}`);
      if (p.cast) filterParts.push(`elenco: ${p.cast}`);
      if (p.director) filterParts.push(`direção: ${p.director}`);
      if (p.company) filterParts.push(`produtora: ${p.company}`);
      if (p.mediaType) filterParts.push(`mídia: ${p.mediaType}`);
      if (p.location) filterParts.push(`local: ${p.location}`);
      if (p.shelf) filterParts.push(`estante: ${p.shelf}`);

      const pdf = await buildCatalogPdf(movies, {
        catalogName: catalog.name,
        tabLabel: TAB_LABEL[p.tab] ?? "Catálogo completo",
        filtersLabel: filterParts.length ? filterParts.join("  ·  ") : undefined,
      });

      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="relatorio-filmografia-${suffix}-${date}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const csv = buildCatalogCsv(movies);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-filmografia-${suffix}-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    return NextResponse.json({ error: "Falha ao gerar relatório" }, { status: 500 });
  }
}

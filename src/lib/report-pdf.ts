import PDFDocument from "pdfkit";
import type { Movie } from "@/generated/prisma/client";
import { releaseYear, formatRating } from "@/lib/format";

// Geração de relatórios PDF (alternativa formatada ao CSV), via pdfkit.
// Layout paisagem A4 com tabela compacta: muitas linhas por página,
// cabeçalho da tabela repetido a cada página, zebrado e rodapé paginado.

export interface ReportMeta {
  catalogName: string;
  tabLabel: string;
  filtersLabel?: string;
}

interface Col {
  label: string;
  w: number;
  align?: "left" | "center" | "right";
  get: (m: Movie) => string;
}

const INK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [113, 113, 122];
const ACCENT: [number, number, number] = [250, 204, 21];
const ACCENT_SOFT: [number, number, number] = [254, 249, 195];
const LINE: [number, number, number] = [228, 228, 231];
const ZEBRA: [number, number, number] = [250, 250, 250];

const BODY_SIZE = 7;
const HEAD_SIZE = 7.5;
const LINE_H = 9;
const ROW_PAD = 5;

function statusOf(m: Movie): string {
  const parts: string[] = [];
  if (m.favorite) parts.push("Fav");
  if (m.watched) parts.push("Assist.");
  if (m.watchlist) parts.push("Lista");
  return parts.join(" · ") || "—";
}

const COLS: Col[] = [
  { label: "Título", w: 190, get: (m) => m.title },
  { label: "Ano", w: 28, align: "center", get: (m) => { const y = releaseYear(m.releaseDate); return y === "—" ? "" : y; } },
  { label: "Min", w: 24, align: "center", get: (m) => (m.runtime != null ? String(m.runtime) : "") },
  { label: "Gêneros", w: 96, get: (m) => m.genres.join(", ") },
  { label: "Direção", w: 84, get: (m) => m.director || "—" },
  { label: "Países", w: 76, get: (m) => m.countries.join(", ") },
  { label: "TMDB", w: 28, align: "center", get: (m) => (m.voteAverage != null ? formatRating(m.voteAverage) : "—") },
  { label: "Nota", w: 26, align: "center", get: (m) => (m.personalRating != null ? String(m.personalRating) : "—") },
  { label: "Status", w: 56, get: statusOf },
  { label: "Origem", w: 40, align: "center", get: (m) => (m.source === "MANUAL" ? "Manual" : "TMDB") },
  // tipo de mídia + URL da cópia (somente quando houver)
  {
    label: "Mídia",
    w: 100,
    get: (m) => {
      if (!m.mediaType && !m.mediaUrl) return "";
      if (m.mediaType && m.mediaUrl) return `${m.mediaType} · ${m.mediaUrl}`;
      return m.mediaType ?? m.mediaUrl ?? "";
    },
  },
];

export function buildCatalogPdf(movies: Movie[], meta: ReportMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    const tableW = COLS.reduce((s, c) => s + c.w, 0);
    const colX: number[] = [];
    let acc = left;
    for (const c of COLS) { colX.push(acc); acc += c.w; }

    // ===== Cabeçalho do documento =====
    doc.rect(left, 30, pageW, 4).fill(ACCENT);
    doc.fillColor(INK).fontSize(17).font("Helvetica-Bold").text("Relatório do Catálogo", left, 44);
    doc.fontSize(10).font("Helvetica").fillColor(MUTED)
      .text(`${meta.catalogName}  ·  ${meta.tabLabel}`, left, 64);

    const favorites = movies.filter((m) => m.favorite).length;
    const watched = movies.filter((m) => m.watched).length;
    const watchlist = movies.filter((m) => m.watchlist).length;
    const rated = movies.filter((m) => m.personalRating != null);
    const avg = rated.length ? rated.reduce((s, m) => s + (m.personalRating as number), 0) / rated.length : null;
    const now = new Date();
    doc.fontSize(8.5).fillColor(MUTED)
      .text(
        `${movies.length} filme${movies.length === 1 ? "" : "s"}  ·  ${favorites} favorito${favorites === 1 ? "" : "s"}  ·  ${watched} assistido${watched === 1 ? "" : "s"}  ·  ${watchlist} na lista  ·  nota média ${avg != null ? avg.toFixed(1).replace(".", ",") : "—"}  ·  gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        left, 78,
      );
    if (meta.filtersLabel) {
      doc.fontSize(8).fillColor(MUTED).text(`Filtros: ${meta.filtersLabel}`, left, 90);
    }
    doc.fontSize(7).fillColor(MUTED).text("Status: Fav = favorito · Assist. = assistido · Lista = para assistir", left, meta.filtersLabel ? 100 : 90);

    let y = meta.filtersLabel ? 114 : 104;

    const drawTableHeader = () => {
      doc.rect(left, y, tableW, 15).fill(ACCENT_SOFT);
      COLS.forEach((c, i) => {
        doc.fillColor(INK).font("Helvetica-Bold").fontSize(HEAD_SIZE)
          .text(c.label.toUpperCase(), colX[i] + 3, y + 4, { width: c.w - 6, align: c.align ?? "left" });
      });
      doc.moveTo(left, y + 15).lineTo(left + tableW, y + 15).strokeColor(INK).lineWidth(0.8).stroke();
      y += 15;
    };

    drawTableHeader();

    // ===== Linhas =====
    movies.forEach((m, idx) => {
      const texts = COLS.map((c) => c.get(m));
      // altura da linha = maior nº de linhas wrap entre as células (mede no fontSize atual)
      doc.fontSize(BODY_SIZE);
      let lines = 1;
      texts.forEach((t, i) => {
        const h = doc.heightOfString(t || " ", { width: COLS[i].w - 6 });
        const n = Math.max(1, Math.round(h / (BODY_SIZE * 1.2)));
        if (n > lines) lines = n;
      });
      const rowH = lines * LINE_H + ROW_PAD;

      if (y + rowH > pageBottom - 18) {
        doc.addPage();
        y = doc.page.margins.top;
        drawTableHeader();
      }

      if (idx % 2 === 1) doc.rect(left, y, tableW, rowH).fill(ZEBRA);

      texts.forEach((t, i) => {
        doc.fillColor(INK).font("Helvetica").fontSize(BODY_SIZE)
          .text(t || " ", colX[i] + 3, y + 3, { width: COLS[i].w - 6, align: COLS[i].align ?? "left", lineGap: 0.5 });
      });

      doc.moveTo(left, y + rowH).lineTo(left + tableW, y + rowH).strokeColor(LINE).lineWidth(0.5).stroke();
      y += rowH;
    });

    if (movies.length === 0) {
      doc.fillColor(MUTED).fontSize(9).text("Nenhum filme para os filtros atuais.", left, y + 8);
    }

    // ===== Rodapé paginado =====
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor(MUTED)
        .text(
          `Filmografia · ${meta.catalogName} · Página ${i + 1} de ${range.count}`,
          left, doc.page.height - 26, { width: pageW, align: "right" },
        );
    }

    doc.end();
  });
}

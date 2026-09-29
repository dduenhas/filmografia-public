/**
 * Gera o relatório PDF "Capacidade nos planos free" (Neon + Vercel + TMDB).
 * Uso: node scripts/gerar-relatorio-capacidade.cjs
 * Dependência temporária (não entra no package.json): pdfkit (npm i --no-save pdfkit)
 *
 * Os números são ESTIMATIVAS derivadas de um modelo de consumo por operação
 * (constantes abaixo). Ajuste as constantes para recalibrar o relatório.
 */
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "relatorio-capacidade-planos-free.pdf");

// ---------------------------------------------------------------------------
// 1) Limites oficiais dos planos free (consultados em 2026-09)
// ---------------------------------------------------------------------------
const NEON = {
  storageGB: 0.5,          // armazenamento por projeto (contínuo, não mensal)
  cuHours: 100,            // CU-hours de compute por projeto/mês
  networkGB: 5,            // transferência pública por projeto/mês
  scaleToZeroMin: 5,       // compute zera após 5 min de inatividade
};
const VERCEL = {
  transferGB: 100,         // Fast Data Transfer / mês
  originGB: 10,            // Fast Origin Transfer / mês
  cdnRequests: 1_000_000,  // CDN requests / mês
  cpuHours: 4,             // Active CPU / mês
  memGBHours: 360,         // Provisioned Memory / mês
  invocations: 1_000_000,  // Function Invocations / mês
  imgTransform: 5_000,     // Image Transformations / mês
  imgCacheRead: 300_000,   // Image Cache Reads / mês
  imgCacheWrite: 100_000,  // Image Cache Writes / mês
};
const TMDB = {
  rps: 40,                 // ~40 req/s por IP (limite de taxa, não diário)
  dailyCap: null,          // sem teto diário oficial publicado (uso não comercial)
};

// ---------------------------------------------------------------------------
// 2) Modelo de consumo por operação (premissas)
// ---------------------------------------------------------------------------
const PER = {
  // um filme cadastrado (linha no Postgres + índices + TOAST)
  movieStorageKB: 2,
  // uma pesquisa na busca do site (1 invocação, 1 call TMDB, 8 pôsteres)
  searchInvocations: 1,
  searchTmdb: 1,
  searchImgs: 8,
  searchCpuS: 0.08,
  // uma visualização de página de catálogo (SSR + ~24 pôsteres + ~60 KB do DB)
  pageInvocations: 1,
  pageDbKB: 60,
  pageImgs: 24,
  pageCpuS: 0.15,
  pageTransferMB_optimized: 0.7,   // HTML + pôsteres via otimizador Vercel
  pageTransferMB_direct: 0.15,     // HTML apenas (pôsteres direto do CDN TMDB)
  // um cadastro via TMDB (detalhe + créditos + vídeos)
  cadastroTmdb: 3,
  cadastroInvocations: 1,
};

const DAYS = 30;
const KB = 1024, MB = 1024 * 1024, GB = 1024 * 1024 * 1024;

// ---------------------------------------------------------------------------
// 3) Capacidades derivadas (por mês e por dia)
// ---------------------------------------------------------------------------
const cap = {
  moviesByStorage: Math.floor((NEON.storageGB * GB) / (PER.movieStorageKB * KB)),
  pagesByNeonNetwork: Math.floor((NEON.networkGB * GB) / (PER.pageDbKB * KB)),
  pagesByVercelCpu: Math.floor((VERCEL.cpuHours * 3600) / PER.pageCpuS),
  pagesByImgCacheRead: Math.floor(VERCEL.imgCacheRead / PER.pageImgs),
  pagesByTransferOpt: Math.floor((VERCEL.transferGB * GB) / (PER.pageTransferMB_optimized * MB)),
  pagesByTransferDirect: Math.floor((VERCEL.transferGB * GB) / (PER.pageTransferMB_direct * MB)),
  pagesByInvocations: Math.floor(VERCEL.invocations / PER.pageInvocations),
  searchesByCpu: Math.floor((VERCEL.cpuHours * 3600) / PER.searchCpuS),
  tmdbPerDayByRps: TMDB.rps * 86400,
};
const perDay = (m) => Math.floor(m / DAYS);

// Cenários: qual restrição domina
const bindingOptimized = Math.min(cap.pagesByImgCacheRead, cap.pagesByNeonNetwork, cap.pagesByVercelCpu, cap.pagesByTransferOpt);
const bindingDirect = Math.min(cap.pagesByNeonNetwork, cap.pagesByVercelCpu, cap.pagesByTransferDirect);
const SAFE_MARGIN = 0.5; // folga recomendada de 50%

// ---------------------------------------------------------------------------
// 4) Renderização do PDF
// ---------------------------------------------------------------------------
const doc = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 48, left: 48, right: 48 }, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const BOTTOM = doc.page.height - doc.page.margins.bottom;
const ACCENT = [250, 204, 21]; // amarelo do tema
const INK = [24, 24, 27];
const MUTED = [113, 113, 122];

function ensure(space = 60) {
  if (doc.y + space > BOTTOM) doc.addPage();
}
function title(t) {
  doc.fillColor(INK).fontSize(20).font("Helvetica-Bold").text(t, { lineGap: 2 });
  doc.moveDown(0.4);
}
function h(t) {
  ensure(70);
  doc.moveDown(0.6);
  doc.fillColor(INK).fontSize(14).font("Helvetica-Bold").text(t);
  doc.moveDown(0.3);
}
function p(t, opts = {}) {
  ensure(40);
  doc.fillColor(opts.muted ? MUTED : INK).fontSize(10).font("Helvetica").text(t, { align: "justify", lineGap: 1.2 });
  doc.moveDown(0.4);
}
function bullet(t) {
  ensure(30);
  doc.fillColor(INK).fontSize(10).font("Helvetica").text("•  " + t, doc.page.margins.left + 6, doc.y, { width: W - 6, lineGap: 1.1 });
  doc.moveDown(0.2);
}
function kv(label, value) {
  ensure(24);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(INK).text(label + ": ", { continued: true });
  doc.font("Helvetica").fillColor(MUTED).text(value);
}
function table(headers, rows, widths) {
  const cols = widths.map((w) => (w / 100) * W);
  const x0 = doc.page.margins.left;
  const drawRow = (cells, bold, bg) => {
    // mede a altura da linha
    let lineH = 0;
    cells.forEach((c, i) => {
      const hgt = doc.heightOfString(String(c), { width: cols[i] - 10, fontSize: 9 }) + 8;
      if (hgt > lineH) lineH = hgt;
    });
    ensure(lineH + 6);
    if (doc.y + lineH > BOTTOM) { doc.addPage(); }
    const y = doc.y;
    if (bg) { doc.rect(x0, y, W, lineH).fill(bg); }
    let x = x0;
    cells.forEach((c, i) => {
      doc.fillColor(bold ? INK : MUTED).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9)
        .text(String(c), x + 5, y + 4, { width: cols[i] - 10, lineGap: 0.8 });
      x += cols[i];
    });
    doc.y = y + lineH;
    doc.moveTo(x0, doc.y).lineTo(x0 + W, doc.y).strokeColor([228, 228, 231]).lineWidth(0.6).stroke();
  };
  drawRow(headers, true, [244, 244, 245]);
  rows.forEach((r) => drawRow(r, false, null));
  doc.moveDown(0.6);
}
function fmt(n) { return n.toLocaleString("pt-BR"); }

// ===== Capa / introdução =====
doc.fillColor(ACCENT).rect(doc.page.margins.left, 40, W, 4).fill();
doc.moveDown(1.2);
title("Capacidade nos planos gratuitos");
p("Previsão quantitativa de quantos filmes podem ser cadastrados, quantas pesquisas podem ser feitas e quanto tráfego o catálogo suporta permanecendo 100% nos planos free do Neon (PostgreSQL), da Vercel (hosting/edge) e da API do TMDB.", { muted: false });
kv("Projeto", "Filmografia (Next.js + Prisma + Neon)");
kv("Data-base das cotações", "29/09/2026");
kv("Natureza dos números", "Estimativas por modelo de consumo (ver premissas)");
doc.moveDown(0.6);
p("Resumo executivo: o armazenamento do Neon NÃO é o gargalo — cabem centenas de milhares de filmes em 0,5 GB. Os gargalos reais são (a) as Image Cache Reads da Vercel se os pôsteres passarem pelo otimizador de imagens e (b) a transferência de rede do Neon / CPU ativa da Vercel para páginas SSR. Com pôsteres servidos direto do CDN do TMDB, o envelope seguro sobe para milhares de visualizações/dia.", { muted: true });

// ===== 1. Limites =====
h("1. Limites inclusos nos planos free");
p("Neon (Free, por projeto):", {});
table(["Recurso", "Franquia", "Ciclo"], [
  ["Armazenamento", `${NEON.storageGB} GB`, "contínuo"],
  ["Compute", `${NEON.cuHours} CU-hours`, "mensal"],
  ["Transferência pública", `${NEON.networkGB} GB`, "mensal"],
  ["Scale-to-zero", `após ${NEON.scaleToZeroMin} min`, "—"],
], [40, 30, 30]);
p("Vercel (Hobby, por mês):", {});
table(["Recurso", "Franquia"], [
  ["Fast Data Transfer", `${fmt(VERCEL.transferGB)} GB`],
  ["Function Invocations", fmt(VERCEL.invocations)],
  ["Active CPU", `${VERCEL.cpuHours} CPU-hrs`],
  ["Provisioned Memory", `${VERCEL.memGBHours} GB-hrs`],
  ["Image Transformations", fmt(VERCEL.imgTransform)],
  ["Image Cache Reads", fmt(VERCEL.imgCacheRead)],
  ["CDN Requests", fmt(VERCEL.cdnRequests)],
], [55, 45]);
p("TMDB (API gratuita, uso não comercial):", {});
table(["Recurso", "Limite"], [
  ["Taxa por IP", `~${TMDB.rps} req/s`],
  ["Teto diário oficial", "não publicado (uso respeitoso)"],
], [55, 45]);

// ===== 2. Modelo de consumo =====
h("2. Modelo de consumo por operação (premissas)");
table(["Operação", "Invocações", "TMDB", "Imagens", "CPU (s)", "DB/transfer"], [
  ["Cadastrar 1 filme", String(PER.cadastroInvocations), String(PER.cadastroTmdb), "1–2", "0,10", `+${PER.movieStorageKB} KB storage`],
  ["1 pesquisa (busca)", String(PER.searchInvocations), String(PER.searchTmdb), String(PER.searchImgs), String(PER.searchCpuS).replace(".", ","), "~10 KB"],
  ["1 página de catálogo", String(PER.pageInvocations), "0", String(PER.pageImgs), String(PER.pageCpuS).replace(".", ","), `~${PER.pageDbKB} KB DB`],
], [26, 14, 10, 12, 12, 26]);
p("Observação: pôsteres do TMDB renderizados com next/image contam como Image Cache Read (ou Transformation na 1ª vez). Pôsteres de cadastro manual (URL externa, unoptimized) e pôsteres servidos direto do CDN do TMDB NÃO consomem otimização da Vercel.", { muted: true });

// ===== 3. Previsão quantitativa =====
h("3. Previsão quantitativa (capacidade máxima/mês)");
table(["Recurso (gargalo)", "Capacidade/mês", "Capacidade/dia", "O que limita"], [
  ["Storage Neon (0,5 GB)", `${fmt(cap.moviesByStorage)} filmes`, "—", "total de filmes cadastrados"],
  ["Image Cache Reads Vercel", `${fmt(cap.pagesByImgCacheRead)} págs.`, fmt(perDay(cap.pagesByImgCacheRead)), "págs. c/ otimizador de imagem"],
  ["Transferência Neon (5 GB)", `${fmt(cap.pagesByNeonNetwork)} págs.`, fmt(perDay(cap.pagesByNeonNetwork)), "leituras de página (SSR)"],
  ["Active CPU Vercel (4 h)", `${fmt(cap.pagesByVercelCpu)} págs.`, fmt(perDay(cap.pagesByVercelCpu)), "págs. SSR + APIs"],
  ["Fast Data Transfer Vercel", `${fmt(cap.pagesByTransferOpt)} págs.`, fmt(perDay(cap.pagesByTransferOpt)), "c/ otimizador; sem ele: " + fmt(cap.pagesByTransferDirect)],
  ["Function Invocations", `${fmt(cap.pagesByInvocations)} reqs.`, fmt(perDay(cap.pagesByInvocations)), "qualquer request"],
  ["Pesquisas (CPU Vercel)", `${fmt(cap.searchesByCpu)} buscas`, fmt(perDay(cap.searchesByCpu)), "busca com debounce"],
  ["TMDB (taxa 40/s)", `${fmt(cap.tmdbPerDayByRps)} reqs/dia`, "—", "só taxa instantânea"],
], [30, 22, 18, 30]);

// ===== 4. Restrição dominante =====
h("4. Restrição dominante por cenário");
p("Cenário A — pôsteres via otimizador da Vercel (next/image, hoje):", {});
bullet(`Gargalo: Image Cache Reads (${fmt(VERCEL.imgCacheRead)}/mês ÷ ${PER.pageImgs} pôsteres/pág.).`);
bullet(`Teto: ~${fmt(cap.pagesByImgCacheRead)} páginas de catálogo/mês ≈ ${fmt(perDay(cap.pagesByImgCacheRead))}/dia.`);
p("Cenário B — pôsteres direto do CDN do TMDB (unoptimized / <img>):", {});
bullet(`Gargalo passa a ser transferência do Neon (${NEON.networkGB} GB) e CPU da Vercel (${VERCEL.cpuHours} h).`);
bullet(`Teto: ~${fmt(bindingDirect)} páginas/mês ≈ ${fmt(perDay(bindingDirect))}/dia.`);
p(`Com folga de segurança de ${Math.round((1 - SAFE_MARGIN) * 100)}%: Cenário A ≈ ${fmt(Math.floor(perDay(bindingOptimized) * SAFE_MARGIN))} págs./dia; Cenário B ≈ ${fmt(Math.floor(perDay(bindingDirect) * SAFE_MARGIN))} págs./dia.`, { muted: true });

// ===== 5. Envelope seguro =====
h("5. Envelope seguro recomendado (uso pessoal contínuo)");
table(["Métrica", "Recomendado", "Teto técnico"], [
  ["Filmes armazenados (total)", "< 50.000", `${fmt(cap.moviesByStorage)}`],
  ["Cadastros de filmes/dia", "100–300", "limitado por invocações/CPU"],
  ["Pesquisas/dia", "500–2.000", `${fmt(perDay(cap.searchesByCpu))}`],
  ["Páginas vistas/dia (Cenário A)", `~${fmt(Math.floor(perDay(bindingOptimized) * SAFE_MARGIN))}`, `${fmt(perDay(bindingOptimized))}`],
  ["Páginas vistas/dia (Cenário B)", `~${fmt(Math.floor(perDay(bindingDirect) * SAFE_MARGIN))}`, `${fmt(perDay(bindingDirect))}`],
], [40, 25, 35]);
p("Para um catálogo pessoal (dezenas a poucos milhares de filmes, uso de 1–2 pessoas), todos os tetos ficam muito acima do consumo real: o app permanece nos planos free com ampla folga.", {});

// ===== 6. Recomendações =====
h("6. Recomendações para permanecer no free");
bullet("Servir pôsteres do TMDB direto do CDN (unoptimized) elimina Image Cache Reads/Transformations e tira a maior parte do Fast Data Transfer da Vercel.");
bullet("Manter PAGE_SIZE moderado (24) e usar cache/`stale-while-revalidate` onde possível reduz CPU e transfer por visita.");
bullet("O debounce de 400 ms na busca já evita rajadas; manter o slice(0, 8) de resultados limita imagens por pesquisa.");
bullet("Monitorar mensalmente: Neon (Storage, CU-hours, Network) e Vercel (Usage → Functions, Image Optimization, Data Transfer).");
bullet("O scale-to-zero do Neon (5 min) mantém CU-hours baixos em uso esporádico; não há ação necessária.");
bullet("Evitar uso comercial: o Hobby da Vercel e a API do TMDB são gratuitos apenas para uso pessoal/não comercial.");

// ===== Disclaimer =====
h("Aviso");
p("Todos os valores são estimativas derivadas de um modelo de consumo simplificado e das franquias públicas vigentes em 29/09/2026. Neon, Vercel e TMDB podem alterar limites a qualquer momento. Consulte as páginas oficiais de pricing antes de decisões de capacidade. Este relatório não garante ausência de cobrança ou suspensão.", { muted: true });

doc.end();
console.log("PDF gerado em:", OUT);
console.log("Resumo:", JSON.stringify({ moviesByStorage: cap.moviesByStorage, pagesByImgCacheRead: cap.pagesByImgCacheRead, pagesByNeonNetwork: cap.pagesByNeonNetwork, pagesByVercelCpu: cap.pagesByVercelCpu, bindingDirect }, null, 2));

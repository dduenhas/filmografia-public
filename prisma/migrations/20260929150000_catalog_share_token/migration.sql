-- Link público somente-leitura por catálogo (nulo = desativado).
ALTER TABLE "Catalog" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Catalog_shareToken_key" ON "Catalog"("shareToken");

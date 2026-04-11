function xmlEscape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Mesmo formato consumido pelo parseXML do frontend legado.
 */
export function buildPriceAnalyzeXml(rows, extractionDate = new Date()) {
  const iso =
    extractionDate instanceof Date
      ? extractionDate.toISOString()
      : String(extractionDate);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<produtos data_extracao="${xmlEscape(iso)}">\n`;

  for (const r of rows) {
    const preco = Number(r.preco);
    if (!Number.isFinite(preco) || preco < 0) continue;
    const grupo = r.grupo || "sem-grupo";
    xml += `  <produto grupo="${xmlEscape(grupo)}">\n`;
    xml += `    <nome>${xmlEscape(r.nome)}</nome>\n`;
    xml += `    <preco>${preco}</preco>\n`;
    xml += `    <vendedor>${xmlEscape(r.vendedor)}</vendedor>\n`;
    xml += `    <id_produto>${xmlEscape(r.id_produto)}</id_produto>\n`;
    xml += `    <url>${xmlEscape(r.url)}</url>\n`;
    xml += `    <url_original>${xmlEscape(r.url_original || r.url)}</url_original>\n`;
    xml += `  </produto>\n`;
  }

  xml += `</produtos>\n`;
  return xml;
}

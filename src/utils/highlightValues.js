/**
 * Extrai segmentos de texto destacando valores monetários e percentuais.
 * Retorna array de objetos { text, highlight } para uso em testes e componentes.
 */
export function highlightValues(text) {
  if (!text) return [];
  const regex = /(R\$\s*[\d.,]+|\d+([.,]\d+)?%)/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), highlight: false });
    parts.push({ text: match[0], highlight: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), highlight: false });
  return parts;
}

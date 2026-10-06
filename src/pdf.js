import { jsPDF } from 'jspdf';
import { quoteTotals } from './data.js';

const euro = value => `${Number(value).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ')} €`;
const dateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : String(value || '');
// Helvetica supports Italian accents and the euro sign. Replace unsupported
// Unicode (e.g. pasted emoji) explicitly instead of emitting corrupt PDF glyphs.
const printable = value => String(value ?? '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u00a0/g, ' ').replace(/[^\x20-\x7e\xa0-\xff\u20ac\n\r\t]/gu, '?');

export function buildQuotePdf(quote, client) {
  if (!quote || !client || !Array.isArray(quote.items) || quote.items.length > 20) throw new Error('Il preventivo deve avere un cliente e al massimo 20 voci.');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 18, right = 192, bottom = 273;
  let y = 0;
  const color = [40, 67, 51];
  const textColor = [47, 52, 47];
  function page() {
    doc.setFillColor(248, 247, 242);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(23);
    doc.text('Banco', left, 24);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Studio dimostrativo', left, 31);
    doc.setDrawColor(211, 219, 210); doc.line(left, 38, right, 38);
    y = 48;
  }
  function ensure(height) {
    if (y + height > bottom) { doc.addPage(); page(); }
  }
  function paragraph(value, { size = 10, bold = false, width = right - left, gap = 4 } = {}) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...textColor);
    const lineHeight = size * 0.42 + 1;
    const lines = doc.splitTextToSize(printable(value), width);
    for (const line of lines) {
      ensure(lineHeight);
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...textColor);
      doc.text(line, left, y); y += lineHeight;
    }
    y += gap;
  }
  page();
  paragraph(`PREVENTIVO ${quote.number}`, { size: 10, bold: true });
  paragraph(quote.title, { size: 20, bold: true, gap: 5 });
  paragraph(`Data: ${dateLabel(quote.date)}    Valido fino al: ${dateLabel(quote.validUntil)}`, { size: 9, gap: 8 });
  paragraph('PREPARATO PER', { size: 8, bold: true, gap: 2 });
  paragraph(client.name, { size: 12, bold: true, gap: 1 });
  if (client.company) paragraph(client.company, { gap: 1 });
  if (client.email) paragraph(client.email, { size: 9, gap: 1 });
  if (client.phone) paragraph(client.phone, { size: 9, gap: 1 });
  y += 7;

  function tableHeader() {
    ensure(13);
    doc.setFillColor(...color); doc.rect(left, y - 4, right - left, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text('DESCRIZIONE', left + 3, y + 2);
    doc.text('QTÀ', 128, y + 2, { align: 'right' });
    doc.text('PREZZO', 156, y + 2, { align: 'right' });
    doc.text('IMPORTO', right - 3, y + 2, { align: 'right' });
    y += 12;
  }
  tableHeader();
  for (const item of quote.items) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const lines = doc.splitTextToSize(printable(item.description), 94);
    let cursor = 0;
    while (cursor < lines.length) {
      if (y + 10 > bottom) { doc.addPage(); page(); tableHeader(); }
      const count = Math.min(lines.length - cursor, Math.max(1, Math.floor((bottom - y - 5) / 5)));
      doc.setTextColor(...textColor); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(lines.slice(cursor, cursor + count), left + 3, y, { lineHeightFactor: 1.42 });
      if (cursor === 0) {
        doc.setFontSize(9);
        doc.text(printable(item.quantity), 128, y, { align: 'right' });
        doc.text(euro(item.price), 156, y, { align: 'right' });
        doc.text(euro(Math.round((item.quantity * item.price + Number.EPSILON) * 100) / 100), right - 3, y, { align: 'right' });
      }
      y += count * 5 + 5;
      doc.setDrawColor(219, 224, 215); doc.line(left, y - 3, right, y - 3);
      cursor += count;
    }
  }
  const totals = quoteTotals(quote);
  ensure(40); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...textColor);
  doc.text('Imponibile', 118, y); doc.text(euro(totals.subtotal), right - 3, y, { align: 'right' }); y += 8;
  doc.text(`IVA ${quote.vat}%`, 118, y); doc.text(euro(totals.vat), right - 3, y, { align: 'right' }); y += 10;
  doc.setFillColor(226, 234, 223); doc.rect(114, y - 6, right - 114, 13, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...color);
  doc.text('Totale', 118, y + 2); doc.text(euro(totals.total), right - 3, y + 2, { align: 'right' }); y += 22;
  if (quote.notes) { ensure(17); paragraph('NOTE', { size: 8, bold: true, gap: 2 }); paragraph(quote.notes, { size: 9 }); }
  const count = doc.getNumberOfPages();
  for (let index = 1; index <= count; index++) {
    doc.setPage(index); doc.setDrawColor(211, 219, 210); doc.line(left, 281, right, 281);
    doc.setTextColor(107, 117, 106); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Documento dimostrativo - dati fittizi', left, 287);
    doc.text(`${index} / ${count}`, right, 287, { align: 'right' });
  }
  doc.setProperties({ title: printable(`${quote.number} - ${quote.title}`), subject: 'Preventivo dimostrativo', author: 'Banco · Studio dimostrativo' });
  return doc;
}

export function downloadQuotePdf(quote, client) {
  const doc = buildQuotePdf(quote, client);
  const filename = `${quote.number || 'Preventivo'}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`${filename}.pdf`);
}

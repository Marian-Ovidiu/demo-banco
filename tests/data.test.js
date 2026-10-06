import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed, dateOffset, todayISO, quoteTotals, nextQuoteNumber, loadState, saveState, STORAGE_KEY } from '../src/data.js';
import { buildQuotePdf } from '../src/pdf.js';

const now = new Date(2026, 9, 6, 23, 55);
test('local date arithmetic crosses months and years safely', () => {
  assert.equal(todayISO(now), '2026-10-06');
  assert.equal(dateOffset(1, new Date(2026, 11, 31, 23)), '2027-01-01');
  assert.equal(dateOffset(-1, new Date(2026, 2, 1)), '2026-02-28');
});
test('totals round each line and VAT to cents', () => {
  assert.deepEqual(quoteTotals({ items: [{ quantity: 3, price: 0.335 }, { quantity: 1, price: 0.105 }], vat: 22 }), { subtotal: 1.12, vat: 0.25, total: 1.37 });
  assert.deepEqual(quoteTotals({ items: [{ quantity: 3, price: 0.1 }], vat: 22 }), { subtotal: 0.3, vat: 0.07, total: 0.37 });
});
test('quote counters prevent reusing deleted numbers and reset with the year', () => {
  assert.equal(nextQuoteNumber([{ number: 'PRE-2026-009' }], now, { 2026: 12 }), 'PRE-2026-013');
  assert.equal(nextQuoteNumber([], new Date(2027, 0, 1), { 2026: 12 }), 'PRE-2027-001');
  assert.equal(nextQuoteNumber([{ number: 'PRE-2026-014' }], now, { 2026: 12 }), 'PRE-2026-015');
});
test('storage roundtrip and complete fallback for corruption', () => {
  let raw;
  const storage = { getItem: () => raw, setItem: (key, value) => { assert.equal(key, STORAGE_KEY); raw = value; } };
  const seed = createSeed(now);
  assert.equal(saveState(seed, storage), true);
  assert.deepEqual(loadState(storage), seed);
  for (const bad of ['{', JSON.stringify({ ...seed, version: 2 }), JSON.stringify({ ...seed, clients: [null] }), JSON.stringify({ ...seed, appointments: [{ ...seed.appointments[0], date: '2026-02-31' }] }), JSON.stringify({ ...seed, quotes: [{ ...seed.quotes[0], items: [{ id: 'i', description: 'x', quantity: 1, price: '20' }] }] })]) {
    raw = bad;
    const fallback = loadState(storage);
    assert.equal(fallback.clients.length, 8);
    assert.equal(fallback.quotes.length, 4);
  }
  assert.equal(saveState(seed, { setItem() { throw new Error('Quota'); } }), false);
  assert.equal(saveState({}, storage), false);
});
test('PDF contains usable document text, totals and paginated long rows', () => {
  const seed = createSeed(now);
  const normal = buildQuotePdf(seed.quotes[0], seed.clients[0]);
  const bytes = normal.output();
  assert.ok(bytes.startsWith('%PDF-'));
  assert.ok(bytes.includes('Documento dimostrativo'));
  assert.ok(bytes.includes('Banco'));
  const long = { ...seed.quotes[0], title: 'Identità visiva e attività creative', items: Array.from({ length: 20 }, (_, index) => ({ id: `i${index}`, description: 'Descrizione dettagliata con attività, modalità e consegna. '.repeat(30), quantity: 1, price: 100.5 })), notes: 'Note aggiuntive. '.repeat(100) };
  const paginated = buildQuotePdf(long, seed.clients[0]);
  assert.ok(paginated.getNumberOfPages() > 2);
  assert.ok(paginated.output().includes('Totale'));
});

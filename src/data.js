export const STORAGE_KEY = 'banco-demo-v1';
const pad = value => String(value).padStart(2, '0');
export const todayISO = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
export function dateOffset(days, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  date.setDate(date.getDate() + days);
  return todayISO(date);
}
const cents = value => Math.round((Number(value) + Number.EPSILON) * 100);
export function quoteTotals(quote) {
  const subtotalCents = quote.items.reduce((sum, item) => sum + cents(item.quantity * item.price), 0);
  const vatCents = Math.round(subtotalCents * Number(quote.vat) / 100);
  return { subtotal: subtotalCents / 100, vat: vatCents / 100, total: (subtotalCents + vatCents) / 100 };
}
export function nextQuoteNumber(quotes, now = new Date(), counters = {}) {
  const year = String(now.getFullYear());
  let highest = Number.isSafeInteger(counters[year]) && counters[year] >= 0 ? counters[year] : 0;
  for (const quote of quotes) {
    const match = /^PRE-(\d{4})-(\d+)$/.exec(quote.number);
    if (match && match[1] === year) highest = Math.max(highest, Number(match[2]));
  }
  const next = highest + 1;
  return `PRE-${year}-${String(next).padStart(3, '0')}`;
}
export function createSeed(now = new Date()) {
  const names = [
    ['Clara Moretti', 'Atelier Forma', 'CM', '#dae5dd'],
    ['Luca Rinaldi', 'Rinaldi Architettura', 'LR', '#ede1cb'],
    ['Sofia Conti', 'Casa Lieve', 'SC', '#e8dbda'],
    ['Matteo Ferri', 'Ferri & Co.', 'MF', '#dce3ea'],
    ['Giulia Romano', 'Botanica Studio', 'GR', '#e0e6d5'],
    ['Andrea Costa', 'Officina Carta', 'AC', '#e6dded'],
    ['Elena De Luca', 'Luce Interiors', 'ED', '#f0e2cf'],
    ['Paolo Ricci', 'Ricci Ceramiche', 'PR', '#dbe7e6'],
  ];
  const clients = names.map(([name, company, , color], index) => ({ id: `c${index + 1}`, name, company, email: `cliente${index + 1}@example.com`, phone: '', notes: index === 0 ? 'Preferisce uno stile essenziale e colori naturali.' : '', color }));
  const appointments = [
    ['c1', 'Presentazione del progetto', 0, '09:30', 'Confermato'],
    ['c3', 'Prima consulenza', 0, '14:00', 'Confermato'],
    ['c2', 'Revisione identità visiva', 1, '10:00', 'Da confermare'],
    ['c5', 'Consegna materiali', 2, '11:30', 'Confermato'],
    ['c7', 'Brief nuovo progetto', 4, '15:00', 'Da confermare'],
    ['c4', 'Allineamento sul progetto', -2, '10:30', 'Completato'],
  ].map(([clientId, title, offset, time, status], index) => ({ id: `a${index + 1}`, clientId, title, date: dateOffset(offset, now), time, duration: 60, notes: '', status }));
  const quotes = [
    ['c1', 'Identità visiva Atelier Forma', 'In attesa', [['Direzione creativa e ricerca', 1, 480], ['Logo e sistema visivo', 1, 1250], ['Linee guida del brand', 1, 420]]],
    ['c3', 'Materiali per Casa Lieve', 'Bozza', [['Progetto grafico catalogo', 1, 850], ['Impaginazione', 12, 45]]],
    ['c2', 'Rinaldi · nuova immagine', 'Accettato', [['Identità visiva', 1, 1800], ['Biglietti da visita', 1, 220]]],
    ['c5', 'Packaging Botanica', 'In attesa', [['Progetto packaging', 1, 960], ['Declinazioni etichette', 3, 140]]],
  ].map(([clientId, title, status, rows], index) => ({ id: `q${index + 1}`, clientId, number: `PRE-${now.getFullYear()}-${String(index + 1).padStart(3, '0')}`, title, date: dateOffset(-index * 2, now), validUntil: dateOffset(30 - index * 2, now), status, items: rows.map(([description, quantity, price], row) => ({ id: `q${index + 1}-i${row}`, description, quantity, price })), vat: 22, notes: 'Proposta dimostrativa. Tempi e modalità da concordare.' }));
  return { version: 1, clients, appointments, quotes, quoteCounters: { [now.getFullYear()]: quotes.length } };
}
const string = value => typeof value === 'string' && value.length <= 10000;
const id = value => string(value) && value.length > 0;
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && todayISO(date) === value;
};
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e9;
const unique = rows => new Set(rows.map(row => row.id)).size === rows.length;
function validState(state) {
  if (!state || state.version !== 1 || !['clients', 'appointments', 'quotes'].every(key => Array.isArray(state[key]) && state[key].length <= 5000 && unique(state[key]))) return false;
  if (!state.clients.every(c => c && id(c.id) && ['name', 'company', 'email', 'phone', 'notes', 'color'].every(key => string(c[key])))) return false;
  if (state.quoteCounters !== undefined && (!state.quoteCounters || Array.isArray(state.quoteCounters) || typeof state.quoteCounters !== 'object' || !Object.entries(state.quoteCounters).every(([year, value]) => /^\d{4}$/.test(year) && Number.isSafeInteger(value) && value >= 0))) return false;
  const clientIds = new Set(state.clients.map(c => c.id));
  if (!state.appointments.every(a => a && id(a.id) && clientIds.has(a.clientId) && string(a.title) && string(a.notes) && isoDate(a.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(a.time) && numeric(a.duration) && a.duration > 0 && ['Confermato', 'Da confermare', 'Completato'].includes(a.status))) return false;
  if (!state.quotes.every(q => q && id(q.id) && clientIds.has(q.clientId) && string(q.number) && string(q.title) && string(q.notes) && isoDate(q.date) && isoDate(q.validUntil) && ['Bozza', 'In attesa', 'Accettato'].includes(q.status) && numeric(q.vat) && q.vat <= 100 && Array.isArray(q.items) && q.items.length <= 20 && unique(q.items) && q.items.every(i => i && id(i.id) && string(i.description) && numeric(i.quantity) && i.quantity > 0 && numeric(i.price)))) return false;
  return true;
}
function defaultStorage() { try { return globalThis.localStorage; } catch { return undefined; } }
export function loadState(storage = defaultStorage()) {
  try {
    const state = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (validState(state)) return state;
  } catch { /* Corrupt or unavailable storage falls back to a complete demo. */ }
  const seed = createSeed();
  return seed;
}
export function saveState(state, storage = defaultStorage()) {
  try {
    if (!storage || !validState(state)) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

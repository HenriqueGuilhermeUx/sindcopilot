#!/usr/bin/env node
// Read-back checks for entirely synthetic bank files.
// Does not use the application's importer, a backend, or any real customer data.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import XLSX from 'xlsx';

const dir = process.env.IOS_FIXTURES_DIR || 'ios-qa-fixtures';
const path = name => join(dir, name);
const expected = [
  { id: 'QA-001', date: '2026-01-05', amount: 1500 },
  { id: 'QA-002', date: '2026-01-08', amount: -280.40 },
  { id: 'QA-003', date: '2026-01-12', amount: -119.60 },
];
function check(rows, name) {
  if (rows.length !== expected.length) throw new Error(name + ': transaction count mismatch');
  const cents = x => Math.round(Number(x) * 100);
  rows.forEach((row, idx) => {
    const want = expected[idx];
    if (row.id !== want.id || row.date !== want.date || cents(row.amount) !== cents(want.amount)) {
      throw new Error(name + ': mismatch at transaction ' + idx);
    }
  });
  if (rows.reduce((sum, x) => sum + cents(x.amount), 0) !== 110000) {
    throw new Error(name + ': expected net total BRL 1100.00');
  }
}
const csv = readFileSync(path('condominio-ficticio.csv'), 'utf8').trim().split(/\r?\n/);
if (csv.shift() !== 'data,descricao,valor,id') throw new Error('CSV header mismatch');
check(csv.map(line => {
  const cols = [...line.matchAll(/"([^"]*)"(?:,|$)/g)].map(m => m[1]);
  if (cols.length !== 4) throw new Error('Invalid fixture CSV line');
  return { date: cols[0], amount: Number(cols[2]), id: cols[3] };
}), 'CSV');

const wb = XLSX.read(readFileSync(path('condominio-ficticio.xlsx')), { type: 'buffer' });
const sheet = wb.Sheets[wb.SheetNames[0]];
if (!sheet) throw new Error('XLSX first worksheet missing');
check(XLSX.utils.sheet_to_json(sheet).map(x => ({
  id: String(x.id), date: String(x.data), amount: Number(x.valor),
})), 'XLSX');

const ofx = readFileSync(path('condominio-ficticio.ofx'), 'utf8');
const blocks = [...ofx.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g)].map(x => x[1]);
check(blocks.map(s => {
  const get = tag => s.match(new RegExp('<' + tag + '>([^<\\r\\n]+)'))?.[1] || '';
  const compact = get('DTPOSTED').slice(0, 8);
  return { id: get('FITID'), amount: Number(get('TRNAMT')), date: compact.slice(0,4)+'-'+compact.slice(4,6)+'-'+compact.slice(6,8) };
}), 'OFX');
if (!ofx.includes('<BALAMT>1100.00')) throw new Error('OFX closing balance mismatch');
console.log('PASS: synthetic CSV, XLSX, OFX round-trip: 3 records each, net BRL 1100.00');

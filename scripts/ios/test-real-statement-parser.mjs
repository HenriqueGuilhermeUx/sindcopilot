#!/usr/bin/env node
// Offline QA of the genuine SindCopilot bank-statement parsing functions.
// Evaluates ONLY repository-owned pure parsing source; no Express routes, database, network or production.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as XLSX from 'xlsx';

const source = readFileSync('src/server/finance-api.ts', 'utf8');
const start = source.indexOf('type Direction = "income" | "expense";');
const end = source.indexOf('const RULES:', start);
if (start < 0 || end <= start) throw new Error('Parser source boundaries changed; review test instead of silently stubbing parser');
const fragment = source.slice(start, end);
for (const anchor of ['function rowsToStatement(', 'function parseOfx(', 'async function parseStatement(']) {
  if (!fragment.includes(anchor)) throw new Error('Actual parser function not found: ' + anchor);
}
const js = ts.transpileModule(fragment, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const context = vm.createContext({ XLSX, Buffer, console, Date, Number, String, RegExp });
vm.runInContext(js + '\nthis.actualParseStatement = parseStatement;', context, { timeout: 1500 });
const parse = context.actualParseStatement;
const dir = process.env.IOS_FIXTURES_DIR || 'ios-qa-fixtures';
const rows = [
  { date: '2026-01-05', amount: 1500, direction: 'income' },
  { date: '2026-01-08', amount: -280.4, direction: 'expense' },
  { date: '2026-01-12', amount: -119.6, direction: 'expense' },
];
const cents = x => Math.round(Number(x) * 100);
for (const [ext, mime] of [['csv', 'text/csv'], ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], ['ofx', 'application/x-ofx']]) {
  const name = 'condominio-ficticio.' + ext;
  const result = await parse(readFileSync(join(dir, name)), name, mime);
  if (result.format !== ext) throw new Error(name + ': format mismatch');
  const parsed = result.parsed;
  if (parsed.transactions.length !== rows.length) throw new Error(name + ': transaction count mismatch');
  parsed.transactions.forEach((tx, i) => {
    const want = rows[i];
    if (tx.postedAt !== want.date || cents(tx.amount) !== cents(want.amount) || tx.direction !== want.direction) {
      throw new Error(name + ': mismatch in real parser at transaction ' + (i+1));
    }
    if (ext === 'ofx' && tx.externalId !== 'QA-00' + (i+1)) throw new Error('OFX FITID mismatch');
  });
  if (parsed.transactions.reduce((sum, tx) => sum + cents(tx.amount), 0) !== 110000) {
    throw new Error(name + ': net total mismatch');
  }
  if (parsed.periodStart !== rows[0].date || parsed.periodEnd !== rows[2].date) {
    throw new Error(name + ': period mismatch');
  }
  if (ext === 'ofx' && cents(parsed.closingBalance) !== 110000) {
    throw new Error(name + ': synthetic OFX closing balance mismatch');
  }
  console.log('PASS actual finance-api parser:', ext, '3 fictional transactions, net BRL 1100.00');
}
console.log('Actual CSV/XLSX/OFX backend parsing functions passed offline; no DB/API import or reconciliation was exercised.');

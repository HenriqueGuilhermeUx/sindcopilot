#!/usr/bin/env node
/**
 * Execute the actual financeRouter /import handler with in-memory fake dependencies.
 * NO server, credentials, external API, Supabase, real users, storage or bank transactions.
 * This is a unit/integration-style harness, NOT a real authenticated network E2E test.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import * as XLSX from 'xlsx';
import { z } from 'zod';

const source = readFileSync('src/server/finance-api.ts', 'utf8');
const start = source.indexOf('const BUCKET = "finance-statements";');
const end = source.indexOf('financeRouter.patch("/statements/:id/balances"', start);
if (start < 0 || end <= start) throw new Error('Original import route source changed; review test boundaries');
const fragment = source.slice(start, end).replace('export const financeRouter = Router();', 'const financeRouter = Router();');
for (const marker of ['financeRouter.use(requireUser)', 'financeRouter.post("/import"', 'await db.assertCondominium(', 'eq("sha256", sha256)', 'await parseStatement(', 'await recalculateStatement(']) {
  if (!fragment.includes(marker)) throw new Error('Original import route missing safety step: ' + marker);
}

const store = { statements: [], transactions: [], files: new Map(), nextId: 1, guards: [] };
const membership = new Map([
  ['fictional-owner-A', new Set([101])],
  ['fictional-owner-B', new Set([202])],
]);
const ok = (data = null) => ({ data, error: null });

const query = (table) => {
  let action = null, fields = null, filters = {}, mutation = null;
  const q = {
    select(str) { fields = str; if (!action) action = 'select'; return q; },
    eq(k, v) { filters[k] = v; return q; },
    or() { return q; },
    order() { return q; },
    insert(value) { action = 'insert'; mutation = value; return q; },
    update(value) { action = 'update'; mutation = value; return q; },
    maybeSingle: async () => {
      if (table !== 'financial_statements' || action !== 'select') throw new Error('Unexpected maybeSingle path');
      const row = store.statements.find(s => Object.entries(filters).every(([k,v]) => s[k] === v));
      return ok(row ?? null);
    },
    single: async () => {
      if (table !== 'financial_statements' || action !== 'insert') throw new Error('Unexpected insert().single()');
      const value = { ...mutation, id: store.nextId++ };
      store.statements.push(value);
      return ok(value);
    },
    then(resolve, reject) {
      const value = (() => {
        if (table === 'financial_category_rules' && action === 'select') return ok([]);
        if (table === 'financial_transactions' && action === 'insert') {
          if (!Array.isArray(mutation)) throw new Error('Transactions must be array');
          store.transactions.push(...mutation);
          return ok();
        }
        if (table === 'financial_transactions' && action === 'select') {
          return ok(store.transactions.filter(t => t.statement_id === filters.statement_id).map(t => ({
            amount: t.amount, needs_review: t.needs_review,
          })));
        }
        if (table === 'financial_statements' && action === 'update') {
          const record = store.statements.find(s => s.id === filters.id);
          if (!record) throw new Error('Statement update without id scope');
          Object.assign(record, mutation);
          return ok();
        }
        throw new Error('Unexpected query: ' + table + ' ' + action + ' ' + JSON.stringify(filters));
      })();
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return q;
};

const fakeSupabase = {
  from: (table) => query(table),
  storage: {
    from(bucket) {
      if (bucket !== 'finance-statements') throw new Error('Unexpected storage bucket');
      return {
        upload: async (key, buffer) => {
          if (store.files.has(key)) return { error: new Error('Duplicate storage key') };
          store.files.set(key, buffer);
          return { error: null };
        },
        remove: async (keys) => {
          keys.forEach(k => store.files.delete(k));
          return { error: null };
        },
      };
    },
  },
};
const guards = {
  async assertCondominium(user, condoId, write) {
    store.guards.push({ user: user.accountOwnerId, condoId, write });
    if (!membership.get(user.accountOwnerId)?.has(condoId)) throw new Error('Acesso negado ao condomínio fictício');
  },
};
const handlers = { middleware: [], post: new Map() };
const router = {
  use: fn => handlers.middleware.push(fn),
  get: () => {},
  post: (path, fn) => handlers.post.set(path, fn),
};
const compiled = ts.transpileModule(fragment, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const context = vm.createContext({
  Router: () => router, z, Buffer, createHash, randomUUID, XLSX,
  supabaseAdmin: fakeSupabase, db: guards, resolveContextUser: async req => req.actor || null,
  console: { ...console, error() {} }, Number, String, Date, Math, RegExp,
});
vm.runInContext(compiled, context, { timeout: 3000 });
if (handlers.middleware.length !== 1 || !handlers.post.has('/import')) {
  throw new Error('Auth middleware or genuine import route was not registered');
}

const invoke = async (actor, condominiumId, format, override = {}) => {
  const fileName = 'condominio-ficticio.' + format;
  const mimeType = { csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ofx: 'application/x-ofx' }[format];
  const bytes = readFileSync(join(process.env.IOS_FIXTURES_DIR || 'ios-qa-fixtures', fileName));
  const req = {
    actor,
    body: { condominiumId, fileName, mimeType, fileBase64: bytes.toString('base64'), ...override },
  };
  const response = { code: 200, body: null };
  const res = {
    status(n) { response.code = n; return res; },
    json(body) { response.body = body; return res; },
  };
  let allowed = false;
  await handlers.middleware[0](req, res, () => { allowed = true; });
  if (allowed) await handlers.post.get('/import')(req, res);
  return response;
};
function expect(condition, msg) { if (!condition) throw new Error(msg); }
const A = { id: 'fictional-user-A', accountOwnerId: 'fictional-owner-A' };
const B = { id: 'fictional-user-B', accountOwnerId: 'fictional-owner-B' };
let result = await invoke(null, 101, 'csv');
expect(result.code === 401, 'Unauthenticated import was not rejected');
expect(store.files.size === 0, 'Unauthenticated import wrote storage');

result = await invoke(B, 101, 'csv');
expect(result.code === 403, 'Foreign condominium import was not denied');
expect(store.files.size === 0, 'Denied import wrote storage');

for (const format of ['csv', 'xlsx', 'ofx']) {
  result = await invoke(A, 101, format);
  expect(result.code === 201, format + ' should import with status 201; got ' + result.code + ' ' + JSON.stringify(result.body));
  expect(result.body.format === format && result.body.imported === 3, format + ' imported count mismatch');
  const transactions = store.transactions.filter(t => t.statement_id === result.body.id);
  expect(transactions.length === 3, format + ' transaction inserts missing');
  const cents = transactions.reduce((sum, t) => sum + Math.round(t.amount * 100), 0);
  expect(cents === 110000, format + ' expected net BRL 1100.00');
  expect(transactions.every(t => t.user_id === A.accountOwnerId && t.condominium_id === 101), format + ' tenant scoping failed');
  expect(result.body.reconciliation.status === 'review', format + ' should need review, not be silently reconciled');
}
const before = [store.statements.length, store.transactions.length, store.files.size];
result = await invoke(A, 101, 'csv');
expect(result.code === 409, 'Same file imported twice without conflict');
expect(before.every((x, i) => x === [store.statements.length, store.transactions.length, store.files.size][i]), 'Duplicate changed storage or records');

result = await invoke(A, 202, 'csv');
expect(result.code === 403, 'Cross-condominium import was not denied');
result = await invoke(B, 202, 'csv');
expect(result.code === 201 && result.body.imported === 3, 'Second fictional owner cannot import same synthetic bytes in own condominium');
expect(store.statements.length === 4 && store.transactions.length === 12, 'Unexpected synthetic database totals');
expect(store.guards.some(x => x.user === A.accountOwnerId && x.condoId === 101 && x.write), 'No writable condo permission check');
console.log('PASS actual financeRouter import handler in memory: 401 missing auth, 403 cross-condominium, 201 CSV/XLSX/OFX, 409 duplicate, isolated second owner');
console.log('All in-memory fictional records: 4 statements, 12 transactions; no real DB, storage, network or credentials.');

#!/usr/bin/env node
// Offline tests of actual SindCopilot statement access and reconciliation functions.
// The Supabase/db objects below are strict in-memory fakes: NO credentials or network.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync('src/server/finance-api.ts', 'utf8');
const start = source.indexOf('async function statementById(');
const end = source.indexOf('async function aiClassifyRows(', start);
if (start < 0 || end <= start) throw new Error('Financial access source boundaries changed');
const fragment = source.slice(start, end);
for (const symbol of ['async function statementById(', 'async function recalculateStatement(']) {
  if (!fragment.includes(symbol)) throw new Error('Missing original function: ' + symbol);
}
const fixture = {
  id: 45, user_id: 'fictional-owner-A', condominium_id: 101,
  opening_balance: 100, bank_closing_balance: 1200,
};
const transactions = [
  { amount: 1500, needs_review: false },
  { amount: -280.4, needs_review: false },
  { amount: -119.6, needs_review: false },
];
const calls = [];
let denyCondo = false;
let rows = transactions;
const fakeSupabase = {
  from(table) {
    if (!['financial_statements', 'financial_transactions'].includes(table)) throw new Error('Unexpected table ' + table);
    let action = '', filters = {}, changes = null;
    const query = {
      select() { action = 'select'; return query; },
      update(value) { action = 'update'; changes = value; return query; },
      eq(key, value) { filters[key] = value; return query; },
      async maybeSingle() {
        calls.push({ table, action, filters: { ...filters } });
        if (table !== 'financial_statements' || action !== 'select') throw new Error('Unplanned query');
        const matched = filters.id === fixture.id && filters.user_id === fixture.user_id;
        return { data: matched ? { ...fixture } : null, error: null };
      },
      then(resolve, reject) {
        return Promise.resolve((() => {
          calls.push({ table, action, filters: { ...filters }, changes });
          if (table === 'financial_transactions' && action === 'select') {
            if (filters.statement_id !== fixture.id) throw new Error('Statement scoping missing');
            return { data: rows.map(x => ({ ...x })), error: null };
          }
          if (table === 'financial_statements' && action === 'update') {
            if (filters.id !== fixture.id) throw new Error('Statement update scoping missing');
            return { data: null, error: null };
          }
          throw new Error('Unexpected query path');
        })()).then(resolve, reject);
      },
    };
    return query;
  },
};
const fakeDb = {
  async assertCondominium(user, condoId, write) {
    calls.push({ guard: 'condominium', user: user.accountOwnerId, condoId, write });
    if (denyCondo || user.accountOwnerId !== fixture.user_id || condoId !== fixture.condominium_id) {
      throw new Error('Condominium access denied (fictional fixture)');
    }
  },
};
const ctx = vm.createContext({ supabaseAdmin: fakeSupabase, db: fakeDb, console, Number, Math, Error });
const js = ts.transpileModule('function access(user: unknown) { return user; }\nfunction roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }\n' + fragment, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
vm.runInContext(js + '\nthis.getStatement = statementById; this.recalculate = recalculateStatement;', ctx, { timeout: 1500 });
function ensure(condition, message) { if (!condition) throw new Error(message); }
const validUser = { id: 'fictional-member-A', accountOwnerId: 'fictional-owner-A' };
const outside = { id: 'fictional-member-B', accountOwnerId: 'fictional-owner-B' };
const found = await ctx.getStatement(validUser, 45, true);
ensure(found.id === 45, 'Owner cannot retrieve own fictional statement');
ensure(calls.some(x => x.guard === 'condominium' && x.write === true), 'Condominium write guard missing');
let denied = false;
try { await ctx.getStatement(outside, 45, false); } catch (e) { denied = /não encontrad|denied/i.test(String(e)); }
ensure(denied, 'Cross-owner statement read unexpectedly allowed');
denyCondo = true;
denied = false;
try { await ctx.getStatement(validUser, 45, true); } catch (e) { denied = /denied/i.test(String(e)); }
ensure(denied, 'Condominium guard denial not enforced');
denyCondo = false;
const result = await ctx.recalculate(found);
ensure(Math.round(result.movement * 100) === 110000, 'Incorrect transaction movement');
ensure(Math.round(result.calculated * 100) === 120000, 'Incorrect calculated closing balance');
ensure(result.difference === 0 && result.status === 'reconciled', 'Expected reconciled state');
rows = [{ amount: 1500, needs_review: true }, { amount: -280.4, needs_review: false }, { amount: -119.6, needs_review: false }];
const pending = await ctx.recalculate(found);
ensure(pending.status === 'review' && pending.reviewCount === 1, 'Pending-review gate not enforced');
rows = [{ amount: 1500, needs_review: false }];
const mismatch = await ctx.recalculate(found);
ensure(mismatch.status === 'review' && mismatch.difference !== 0, 'Bank balance mismatch not detected');
console.log('PASS: actual statementById owner guard, condominium authorization, reconciliation totals, review and mismatch states in offline fakes');
console.log('No real HTTP, Supabase, condominium, patient, financial account or imported record used.');

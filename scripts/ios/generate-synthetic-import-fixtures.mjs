#!/usr/bin/env node
// Deterministic, fully fictional financial-import fixtures for iOS QA.
// Not connected to users, banks, networks, Supabase or production.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const dir = process.env.IOS_FIXTURES_DIR || 'ios-qa-fixtures';
mkdirSync(dir, { recursive: true });
const transactions = [
  { date: '2026-01-05', description: 'COTA CONDOMINIAL FICTICIA - UN 101', amount: 1500.00, id: 'QA-001' },
  { date: '2026-01-08', description: 'ENERGIA FICTICIA - AREA COMUM', amount: -280.40, id: 'QA-002' },
  { date: '2026-01-12', description: 'MANUTENCAO FICTICIA - PORTAO', amount: -119.60, id: 'QA-003' },
];
const expectedTotal = 1100;
if (Math.round(transactions.reduce((v, t) => v + t.amount, 0) * 100) !== expectedTotal * 100) {
  throw new Error('Fixture total mismatch');
}
const csvEscape = s => '"' + String(s).replaceAll('"', '""') + '"';
const csv = ['data,descricao,valor,id', ...transactions.map(t =>
  [t.date, t.description, t.amount.toFixed(2), t.id].map(csvEscape).join(',')
)].join('\n') + '\n';
writeFileSync(path.join(dir, 'condominio-ficticio.csv'), csv, 'utf8');
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions.map(t => ({
  data: t.date, descricao: t.description, valor: t.amount, id: t.id,
}))), 'Extrato ficticio');
const xlsxBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
writeFileSync(path.join(dir, 'condominio-ficticio.xlsx'), xlsxBytes);
const ofxDate = d => d.replaceAll('-', '') + '120000';
const ofx = [
  'OFXHEADER:100',
  'DATA:OFXSGML',
  'VERSION:102',
  'SECURITY:NONE',
  'ENCODING:USASCII',
  'CHARSET:1252',
  'COMPRESSION:NONE',
  'OLDFILEUID:NONE',
  'NEWFILEUID:NONE',
  '',
  '<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20260113120000<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1>',
  '<BANKMSGSRSV1><STMTTRNRS><TRNUID>QA-FICTICIO<STATUS><CODE>0<SEVERITY>INFO</STATUS><STMTRS>',
  '<CURDEF>BRL<BANKACCTFROM><BANKID>00000000<ACCTID>CONTA-FICTICIA-000<ACCTTYPE>CHECKING</BANKACCTFROM>',
  '<BANKTRANLIST><DTSTART>20260105120000<DTEND>20260112120000',
  ...transactions.map(t =>
    '<STMTTRN><TRNTYPE>' + (t.amount >= 0 ? 'CREDIT' : 'DEBIT') +
    '<DTPOSTED>' + ofxDate(t.date) + '<TRNAMT>' + t.amount.toFixed(2) +
    '<FITID>' + t.id + '<NAME>' + t.description + '</STMTTRN>'),
  '</BANKTRANLIST><LEDGERBAL><BALAMT>1100.00<DTASOF>20260113120000</LEDGERBAL>',
  '</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>',
].join('\n') + '\n';
writeFileSync(path.join(dir, 'condominio-ficticio.ofx'), ofx, 'utf8');
const guide = [
  '# SindCopilot — dados sintéticos para QA de importação',
  '',
  'Condomínio e conta 100% fictícios, sem nomes de pessoas, bancos reais ou números de conta verdadeiros.',
  'Esperado: 3 transações, 1 crédito R$ 1.500,00, 2 débitos R$ 400,00, saldo líquido R$ 1.100,00.',
  'Importe os arquivos CSV, XLSX e OFX **individualmente** em condomínio de homologação isolado.',
  'Valide datas, valores, duplicidade por FITID/ID, classificações, conciliação e PDF gerado.',
  'A importação real, o PDF e a segregação entre usuários não são testados por este gerador.',
  'Não execute contra produção nem com credenciais ou dados de clientes.',
  '',
].join('\n');
writeFileSync(path.join(dir, 'README.md'), guide, 'utf8');
console.log('Generated fictional CSV, XLSX and OFX fixtures; net total BRL 1100.00.');

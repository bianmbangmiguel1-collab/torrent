// import-fixed.mjs — Import D1 via --command (contourne le bug /import)
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';

const DB_NAME = 'torrenttwist-db';
const DUMP_FILE = './torrenttwist-dump.sql';
const ERROR_LOG = './import-errors.log';
const MAX_CMD_LENGTH = 90000;

if (existsSync(ERROR_LOG)) unlinkSync(ERROR_LOG);

console.log('📖 Lecture du dump...');
let content = readFileSync(DUMP_FILE, 'utf-8');

content = content
  .split('\n')
  .filter(line => {
    const t = line.trim();
    if (t === 'BEGIN TRANSACTION;') return false;
    if (t === 'COMMIT;') return false;
    if (t.startsWith('PRAGMA foreign_keys')) return false;
    return true;
  })
  .join('\n');

const statements = [];
let current = '';
let inString = false;
let stringChar = '';

for (let i = 0; i < content.length; i++) {
  const ch = content[i];
  const prev = i > 0 ? content[i - 1] : '';

  if (inString) {
    current += ch;
    if (ch === stringChar && prev !== '\\') {
      if (content[i + 1] === stringChar) {
        current += content[i + 1];
        i++;
      } else {
        inString = false;
      }
    }
  } else {
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === ';') {
      current += ch;
      const t = current.trim();
      if (t && !t.startsWith('--')) statements.push(t);
      current = '';
    } else {
      current += ch;
    }
  }
}
if (current.trim()) statements.push(current.trim());

console.log(`📊 ${statements.length} instructions`);
console.log('');

function runWrangler(sql) {
  const result = spawnSync('npx.cmd', [
    'wrangler', 'd1', 'execute', DB_NAME,
    '--remote',
    '--yes',
    '--command', sql
  ], {
    encoding: 'utf-8',
    shell: false,
    windowsHide: true
  });
  if (result.status === 0) return { ok: true };
  return { ok: false, err: (result.stderr || result.stdout || '').substring(0, 500) };
}

const errors = [];
let success = 0;
let failed = 0;

for (let i = 0; i < statements.length; i++) {
  const sql = statements[i].trim();
  if (!sql) continue;

  const num = i + 1;
  const preview = sql.substring(0, 60).replace(/\n/g, ' ');

  if (sql.length > MAX_CMD_LENGTH) {
    console.log(`[${num}/${statements.length}] Trop long (${sql.length} chars), découpage...`);
    const parts = sql.split(/(?=INSERT\s+INTO)/i).filter(p => p.trim());
    for (const part of parts) {
      if (part.length > MAX_CMD_LENGTH) {
        console.log(`   ERREUR: sous-partie trop longue`);
        errors.push({ num, sql: part.substring(0, 500), error: 'Trop long' });
        failed++;
        continue;
      }
      const r = runWrangler(part);
      if (r.ok) success++;
      else {
        errors.push({ num, sql: part.substring(0, 500), error: r.err });
        failed++;
      }
    }
    continue;
  }

  console.log(`[${num}/${statements.length}] ${preview}...`);
  const r = runWrangler(sql);
  if (r.ok) {
    success++;
    console.log('   OK');
  } else {
    failed++;
    console.log('   ERREUR');
    errors.push({ num, sql: sql.substring(0, 500), error: r.err });
  }
}

console.log('');
console.log('Import termine');
console.log(`Succes : ${success}`);
console.log(`Echecs : ${failed}`);

if (errors.length > 0) {
  const log = errors.map(e =>
    `=== Instruction ${e.num} ===\n${e.sql}\n--- Erreur ---\n${e.error}\n`
  ).join('\n');
  writeFileSync(ERROR_LOG, log, 'utf-8');
  console.log(`Erreurs dans : ${ERROR_LOG}`);
}
// import-d1.mjs
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const DB_NAME = 'torrenttwist-db';
const DUMP_FILE = './torrenttwist-dump.sql';
const ERROR_LOG = './import-errors.log';
const MAX_CMD_LENGTH = 90000; // Limite D1 ~100 Ko

// Reset error log
if (existsSync(ERROR_LOG)) unlinkSync(ERROR_LOG);

console.log('📖 Lecture du fichier dump...');
let content = readFileSync(DUMP_FILE, 'utf-8');

// Nettoyer les lignes BEGIN TRANSACTION, COMMIT, PRAGMA
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

// Découpage intelligent : on respecte les chaînes entre quotes
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
      // Gérer les '' (échappement SQL)
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
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += ch;
    }
  }
}

// Reste éventuel
if (current.trim()) {
  statements.push(current.trim());
}

console.log(`📊 Total d'instructions SQL : ${statements.length}`);
console.log('');

const errors = [];
let success = 0;
let failed = 0;

for (let i = 0; i < statements.length; i++) {
  let sql = statements[i].trim();
  if (!sql) continue;

  const num = i + 1;
  const preview = sql.substring(0, 70).replace(/\n/g, ' ');

  // Si l'instruction est trop longue, on la découpe en sous-blocs
  if (sql.length > MAX_CMD_LENGTH) {
    console.log(`[${num}/${statements.length}] ⚠️  Trop long (${sql.length} chars), découpage...`);
    // Découper par INSERT individuels si possible
    const parts = sql.split(/(?=INSERT\s+INTO)/i).filter(p => p.trim());
    for (const part of parts) {
      if (part.length > MAX_CMD_LENGTH) {
        console.log(`   ❌ Sous-partie encore trop longue (${part.length} chars), skip`);
        errors.push({ num, sql: part.substring(0, 500), error: 'Trop long après découpage' });
        failed++;
        continue;
      }
      try {
        execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command="${part.replace(/"/g, '\\"')}"`,
          { stdio: 'pipe', encoding: 'utf-8' });
        success++;
      } catch (e) {
        const err = (e.stderr || e.stdout || e.message || '').toString().substring(0, 500);
        errors.push({ num, sql: part.substring(0, 500), error: err });
        failed++;
      }
    }
    continue;
  }

  console.log(`[${num}/${statements.length}] ${preview}...`);

  try {
    execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command="${sql.replace(/"/g, '\\"')}"`,
      { stdio: 'pipe', encoding: 'utf-8' });
    success++;
    console.log(`   ✅ OK`);
  } catch (e) {
    const err = (e.stderr || e.stdout || e.message || '').toString().substring(0, 500);
    errors.push({ num, sql: sql.substring(0, 500), error: err });
    failed++;
    console.log(`   ❌ ERREUR`);
  }
}

console.log('');
console.log('🏁 Import terminé !');
console.log(`✅ Succès : ${success}`);
console.log(`❌ Échecs : ${failed}`);

if (errors.length > 0) {
  const log = errors.map(e => 
    `=== Instruction ${e.num} ===\n${e.sql}\n--- Erreur ---\n${e.error}\n`
  ).join('\n');
  writeFileSync(ERROR_LOG, log, 'utf-8');
  console.log(`📄 Voir les erreurs dans : ${ERROR_LOG}`);
}
const fs = require('fs');
const path = require('path');

const appDir = path.join(process.cwd(), 'app');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Ignorer les dossiers spéciaux Next.js
      if (['node_modules', '.next', '.open-next'].includes(entry.name)) continue;
      walk(full);
    } else if (
      entry.isFile() &&
      (entry.name === 'route.ts' || entry.name === 'route.tsx' ||
       entry.name === 'page.tsx' || entry.name === 'page.ts')
    ) {
      files.push(full);
    }
  }
}

if (fs.existsSync(appDir)) {
  walk(appDir);
}

let count = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');

  // ⛔ Ne pas toucher aux Client Components
  if (/^['"]use client['"]/m.test(text)) continue;

  // ⛔ Ne pas toucher si un `dynamic` est déjà défini en export
  if (/export\s+const\s+dynamic\s*=/.test(text)) continue;

  // ⛔ Ne pas toucher si `dynamic` est importé depuis next/dynamic
  if (/import\s+dynamic\s+from\s+['"]next\/dynamic['"]/.test(text)) continue;
  if (/import\s+\{[^}]*\bdynamic\b[^}]*\}\s+from/.test(text)) continue;

  // ✅ Ne cibler que les Server Components qui lisent la DB
  const needsDynamic = /getDB\(|getCloudflareContext/.test(text);

  if (needsDynamic) {
    fs.writeFileSync(
      file,
      "export const dynamic = 'force-dynamic';\n\n" + text,
      'utf8'
    );
    console.log('Updated: ' + path.relative(process.cwd(), file));
    count++;
  }
}

console.log('Total updated: ' + count + ' files');
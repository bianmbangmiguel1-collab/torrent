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

  // Déjà dynamique ? On ne touche pas
  if (/export\s+const\s+dynamic\s*=/.test(text)) continue;

  // La page/route lit la base ou accède à des données dynamiques ?
  const needsDynamic =
    /nextUrl\.searchParams|request\.cookies|request\.headers|cookies\(|headers\(|searchParams|getDB\(|getCloudflareContext/.test(text);

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
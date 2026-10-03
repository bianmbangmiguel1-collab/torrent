const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'app', 'api');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(full);
    }
  }
}

if (fs.existsSync(root)) {
  walk(root);
}

let count = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const needsDynamic = !text.includes('export const dynamic') && /nextUrl\.searchParams|request\.cookies|request\.headers|cookies\(|headers\(|searchParams/.test(text);

  if (needsDynamic) {
    fs.writeFileSync(file, "export const dynamic = 'force-dynamic';\n\n" + text, 'utf8');
    console.log('Updated: ' + file);
    count++;
  }
}

console.log('Updated ' + count + ' files');

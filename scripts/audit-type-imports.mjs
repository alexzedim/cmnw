import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync('find apps libs -name "*.ts" -not -path "*/node_modules/*" -not -name "*.spec.ts" -not -name "*.e2e-spec.ts"', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

const findings = [];

for (const f of files) {
  let src;
  try { src = readFileSync(f, 'utf-8'); } catch { continue; }

  const typeNames = new Set();
  let m;
  const re1 = /import\s+type\s+\{([^}]*)\}\s+from/g;
  while ((m = re1.exec(src)) !== null) {
    for (const item of m[1].split(',')) {
      // Record the LOCAL BINDING (alias if present, else original name).
      // The original exported name is irrelevant at the usage site.
      const parts = item.trim().split(/\s+as\s+/);
      const local = (parts[1] || parts[0]).trim();
      if (local) typeNames.add(local);
    }
  }
  const re2 = /import\s+\{([^}]*)\}\s+from/g;
  while ((m = re2.exec(src)) !== null) {
    for (const item of m[1].split(',')) {
      const t = item.trim();
      if (t.startsWith('type ')) {
        const rest = t.slice(5);
        const parts = rest.split(/\s+as\s+/);
        const local = (parts[1] || parts[0]).trim();
        if (local) typeNames.add(local);
      }
    }
  }
  const re3 = /import\s+type\s+([A-Za-z_$][\w$]*)\s+from/g;
  while ((m = re3.exec(src)) !== null) typeNames.add(m[1]);

  if (typeNames.size === 0) continue;

  // Strip import statements and comments so we only scan usage sites
  const body = src
    .replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+type\s+[A-Za-z_$][\w$]*\s+from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // block / JSDoc comments
    .replace(/\/\/.*$/gm, '');            // line comments

  for (const name of typeNames) {
    if (!name) continue;
    const patterns = [
      // `new Name(` — requires non-identifier char before `Name` so `getXName(` doesn't match
      { re: new RegExp('(^|[^\\w$])new\\s+' + name + '\\b'), why: 'new ' + name + '(...)' },
      // `@Decorator(Name)`
      { re: new RegExp('@\\w+\\(\\s*' + name + '\\b'), why: '@Decorator(' + name + ')' },
      // `Name.staticMember` — requires non-identifier char before
      { re: new RegExp('(^|[^\\w$])' + name + '\\s*\\.\\s*[a-zA-Z_$]'), why: name + '.staticMember' },
      // `Name(` as a standalone call — requires non-identifier char before
      { re: new RegExp('(^|[^\\w$])' + name + '\\s*\\('), why: name + '(...)' },
    ];
    for (const p of patterns) {
      if (p.re.test(body)) {
        findings.push({ file: f, name, why: p.why });
        break;
      }
    }
  }
}

if (findings.length === 0) console.log('CLEAN: no type-imported value usages');
else {
  console.log('FOUND ' + findings.length + ':\n');
  for (const x of findings.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name))) {
    console.log('  ' + x.file + ' -> ' + x.name + '   [' + x.why + ']');
  }
  process.exit(1);
}

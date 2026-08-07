import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Add `{ defaultValue: undefined }` to lastValueFrom calls that wrap
// from(...) / range(...) / forkJoin(...) — sources that can complete with no
// emission, which makes lastValueFrom throw EmptyError.
//
// Strategy: find `lastValueFrom(` then scan forward to find the matching close
// paren (tracking depth). Inspect whether the source is from/range/forkJoin.
// If so and the call doesn't already have a second arg (defaultValue), insert it.

const files = execSync(
  'find apps libs -name "*.ts" -not -path "*/node_modules/*" -not -name "*.spec.ts"',
  { encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

let changed = [];

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const re = /\blastValueFrom\s*\(/g;
  let m;
  let out = src;
  let offset = 0; // accumulated length delta from prior edits in this file
  let fileChanged = false;

  while ((m = re.exec(src)) !== null) {
    const openParenIdx = m.index + m[0].length - 1; // index of `(`
    // walk forward to find the matching close paren
    let depth = 0;
    let i = openParenIdx;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue; // unbalanced; skip
    const closeParenIdx = i;
    const callInner = src.slice(openParenIdx + 1, closeParenIdx);

    // Is the source from(...)/range(...)/forkJoin(...)?
    if (!/\b(from|range|forkJoin)\s*\(/.test(callInner)) continue;
    // Already has a second argument?
    // The callInner's top-level commas separate args. If there's a top-level
    // comma (depth 0), it already has more than one arg.
    let d = 0;
    let topLevelComma = false;
    for (const ch of callInner) {
      if (ch === '(' || ch === '[' || ch === '{') d++;
      else if (ch === ')' || ch === ']' || ch === '}') d--;
      else if (ch === ',' && d === 0) { topLevelComma = true; break; }
    }
    if (topLevelComma) continue; // already has a second arg

    // Insert the defaultValue arg before the close paren.
    // Determine indentation: match the whitespace of the line containing close paren.
    const closeLineStart = src.lastIndexOf('\n', closeParenIdx) + 1;
    const closeLinePrefix = src.slice(closeLineStart, closeParenIdx);
    // Use the same indentation as the closing paren line, plus some extra if needed.
    // Most calls close with `      );` — we want `      { defaultValue: undefined },\n      );`? No —
    // the second arg goes INSIDE the lastValueFrom( ), so before the `)`.
    const indent = closeLinePrefix;
    const insertion = `, { defaultValue: undefined }`;

    // Apply into `out` with offset adjustment.
    const realClose = closeParenIdx + offset;
    out = out.slice(0, realClose) + insertion + out.slice(realClose);
    offset += insertion.length;
    fileChanged = true;
  }

  if (fileChanged) {
    writeFileSync(f, out, 'utf8');
    changed.push(f);
  }
}

console.log(`Changed ${changed.length} files:`);
changed.forEach((f) => console.log('  ' + f));

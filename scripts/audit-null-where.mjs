import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Strategy: find `where: {` (object-literal where clauses only — not raw SQL .where()).
// For each, walk forward tracking brace depth; every `prop: value` at depth 1 is a where condition.
// Flag any value that is null/undefined or may resolve to undefined at runtime.

const files = execSync(
  'find apps libs -name "*.ts" -not -path "*/node_modules/*" -not -name "*.spec.ts" -not -name "*.entity.ts" -not -name "*.mock.ts"',
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

const findings = [];

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split('\n');

  // Find lines containing `where:` followed by `{` on the same line OR `where: {` style.
  // We care about object-literal wheres; skip `.where('...` (string/SQL) and `where (` function calls.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match `where:` NOT preceded by `.` (so not .where()) and followed by `{` either here or soon.
    if (!/\bwhere\s*:\s*\{/.test(line) && !/\bwhere\s*:\s*$/.test(line)) continue;
    if (/^\s*\./.test(line) || /\.where/.test(line)) continue; // .where( is query-builder SQL

    // Determine the start brace. It may be on this line or the next.
    let braceIdx = line.indexOf('{');
    let startLine = i;
    if (braceIdx === -1) {
      // `where:` on its own line — brace is on a following line
      let k = i + 1;
      while (k < lines.length && !lines[k].includes('{')) k++;
      if (k >= lines.length) continue;
      startLine = k;
      braceIdx = lines[k].indexOf('{');
    }

    // Walk forward from the opening brace, tracking depth, until we close it.
    let depth = 0;
    let started = false;
    for (let j = startLine; j < lines.length; j++) {
      const cur = j === startLine ? lines[j].slice(braceIdx) : lines[j];
      for (const ch of cur) {
        if (ch === '{') {
          depth++;
          started = true;
        } else if (ch === '}') {
          depth--;
        }
        if (started && depth === 0) break;
      }
      if (started && depth === 0) {
        // We scanned lines [i..j] inclusive as the where object.
        // Inspect each property at depth 1.
        scanWhereBlock(f, lines.slice(i, j + 1), i + 1);
        break;
      }
    }
  }
}

function scanWhereBlock(file, blockLines, startLineNo) {
  for (let k = 0; k < blockLines.length; k++) {
    const raw = blockLines[k];
    const trimmed = raw.trim();
    // We approximate by checking the trimmed line is `prop: value,`.
    const m = trimmed.match(/^([a-zA-Z][\w]*)\s*:\s*(.+?)\s*,?\s*$/);
    if (!m) continue;
    const [, prop, valRaw] = m;
    const val = valRaw.replace(/,$/, '').trim();
    if (/IsNull/.test(val)) continue; // already safe

    let kind = null;
    if (val === 'null') kind = 'null literal';
    else if (val === 'undefined') kind = 'undefined literal';
    else if (/\?\.[a-zA-Z]/.test(val) && !/\?\?/.test(val) && !/IsNull/.test(val))
      kind = 'optional-chain (may be undefined)';
    else if (/\?\s*[^?]/.test(val) && /\bnull\b/.test(val)) kind = 'ternary with null branch';

    if (kind) {
      findings.push({ file, line: startLineNo + k, prop, val, kind });
    }
  }
}

if (findings.length === 0) console.log('CLEAN');
else {
  console.log(`FOUND ${findings.length}:\n`);
  for (const x of findings) console.log(`  ${x.file}:${x.line}  [${x.kind}]  ${x.prop}: ${x.val}`);
}

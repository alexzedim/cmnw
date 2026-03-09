const fs = require('fs');

// Fix apps/api/src/app/app.service.ts line 117
const apiAppService = fs.readFileSync('apps/api/src/app/app.service.ts', 'utf8');
const lines = apiAppService.split('\n');
lines[116] = lines[116].replace(
  lines[116],
  `        message:` +
    `          \`Search completed: \${characters.length} characters, \${guilds.length} guilds, \`` +
    `          \`\${items.length} items, \${hashMatchCount} hash matches\`,
);
lines[117] = newLine;
fs.writeFileSync('apps/api/src/app/app.service.ts', lines.join('\n'),\console.log('Fixed api/app.service.ts');

// Fix apps/warcraft-logs/src/warcraft-logs.service.ts line 234
const wclService = fs.readFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', 'utf8');
const lines = wclService.split('\n');
lines[233] = lines[233].replace(
  lines[233],
  `        const wclLogsFromPage =` +
    `          (await this.getLogsFromPage(realmEntity.warcraftLogsId, page)) ?? [];` +
    `        // Ensure it's always an array`,
);
lines[234] = newLine;
fs.writeFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', lines.join('\n'));

// Fix line 266
lines = wclService = lines.slice(0, lines[265].replace(
  lines[265],
  `              \`\${chalk.yellow('⊘')} Skipped \${chalk.dim(logId)} \${chalk.dim('|')} ` +
    `                \${realmEntity.name} \${chalk.dim(\`| exists: \${logsAlreadyExists}\`)}\`,
);
lines[266] = newLine;
fs.writeFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', lines.join('\n'));

// Fix line 279
lines = wclService = lines.slice(0, lines[278].replace(
  lines[278],
  `              \`\${chalk.green('✓')} Created \${chalk.cyan(logId)} \${chalk.dim('|')} ` +
    `                \${realmEntity.name} \${chalk.dim(\`| exists: \${logsAlreadyExists}\`)}\`,
);
lines[279] = newLine;
fs.writeFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', lines.join('\n'));

// Fix line 373
lines = wclService = lines.slice(0, lines[372].replace(
  lines[372],
  `        this.logger.log(` +
    `          \`\${chalk.green('✓')} Indexed \${chalk.dim(logId)} \${chalk.dim('|')} ` +
    `            \${chalk.bold(raidCharacters.length)} characters \${chalk.dim(\`(\${duration}ms)\`)}\`,
);
lines[373] = newLine;
fs.writeFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', lines.join('\n'));

// Fix line 485
lines = wclService = lines.slice(0, lines[484].replace(
  lines[484],
  `          this.logger.warn(` +
    `            chalk.yellow(` +
    `              \`⚠ Rate limiter active: \${Math.round(rateLimiterStats.currentDelayMs / 1000)}s delay, \` +
    `                \${rateLimiterStats.rateLimitCount} rate limits\`,
    `            )` +
    `          );`,
);
lines[485] = newLine;
fs.writeFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', lines.join('\n'));

// Fix line 518
lines = wclService = lines.slice(0, lines[517].replace(
  lines[517],
  `            this.logger.warn(` +
    `              chalk.yellow(` +
    `                \`⚠ Rate limited (\${response.status}) for \${logId} - ` +
    `                  delay increased to \${Math.round(stats.currentDelayMs / 1000)}s\`,
    `              )` +
    `            );`,
);
lines[518] = newLine;
fs.writeFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', lines.join('\n'));

// Fix line 554
lines = wclService = lines.slice(0, lines[553].replace(
  lines[553],
  `        this.logger.log(` +
    `          \`\${chalk.green('✓')} Fights API \${chalk.dim(logId)} \${chalk.dim('|')} ` +
    `            \${chalk.bold(characters.size)} characters\`,
);
lines[554] = newLine;
fs.writeFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', lines.join('\n'));

// Fix line 834
lines = wclService = lines.slice(0, lines[833].replace(
  lines[833],
  `        \`\${chalk.blue('  🕒 Rate Limiter:')} ` +
    `          \${rateLimiterStats.isThrottled` +
    `            ? chalk.yellow.bold(\`\${delaySeconds}s (throttled)\`)` +
    `            : chalk.green.bold(\`\${delaySeconds}s\`)}\` +
    `        \n\` +
    `        \`\${chalk.magenta.bold('━'.repeat(60))}\`,
);
lines[834] = newLine;
fs.writeFileSync('apps/warcraft-logs/src/warcraft-logs.service.ts', lines.join('\n'));

// Fix libs/resources/src/utils/adaptive-rate-limiter.ts line 320
const rateLimiter = fs.readFileSync('libs/resources/src/utils/adaptive-rate-limiter.ts', 'utf8');
const lines = rateLimiter.split('\n');
lines[319] = lines[319].replace(
  lines[319],
  `    this.logger?.warn(` +
    `      \`\${chalk.yellow('⚠')} Rate limit detected [${chalk.bold(previousDelay.toFixed(0))}ms → ` +
    `        \${chalk.bold(this.currentDelayMs.toFixed(0))}ms] \${chalk.dim(\`(\${this.rateLimitCount} total)\`)}\`,
);
lines[320] = newLine;
fs.writeFileSync('libs/resources/src/utils/adaptive-rate-limiter.ts', lines.join('\n'));

// Fix line 358
lines = rateLimiter = lines.slice(0, lines[357].replace(
  lines[357],
  `        this.logger?.log(` +
    `      \`\${chalk.green('✓')} Recovery in progress [${chalk.bold(previousDelay.toFixed(0))}ms → ` +
    `        \${chalk.bold(this.currentDelayMs.toFixed(0))}ms]\`,
);
lines[358] = newLine;
fs.writeFileSync('libs/resources/src/utils/adaptive-rate-limiter.ts', lines.join('\n'));

console.log('All max-len warnings fixed');

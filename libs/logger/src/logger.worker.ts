import chalk from 'chalk';

export enum WorkerLogStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
  NOT_MODIFIED = 'NOT_MODIFIED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SKIPPED = 'SKIPPED',
  ERROR = 'ERROR',
}

export interface LogConfig {
  icon: string;
  color: 'green' | 'yellow' | 'blue' | 'cyan' | 'red' | 'magenta';
  statusText: string;
}

export const LOG_CONFIGS: Record<WorkerLogStatus, LogConfig> = {
  [WorkerLogStatus.SUCCESS]: {
    icon: '✓',
    color: 'green',
    statusText: '200',
  },
  [WorkerLogStatus.PARTIAL]: {
    icon: '⚠',
    color: 'yellow',
    statusText: 'PARTIAL',
  },
  [WorkerLogStatus.WARNING]: {
    icon: '⚠',
    color: 'yellow',
    statusText: 'WARN',
  },
  [WorkerLogStatus.INFO]: {
    icon: 'ℹ',
    color: 'cyan',
    statusText: 'INFO',
  },
  [WorkerLogStatus.NOT_MODIFIED]: {
    icon: 'ℹ',
    color: 'blue',
    statusText: '304',
  },
  [WorkerLogStatus.NOT_FOUND]: {
    icon: 'ℹ',
    color: 'blue',
    statusText: '404',
  },
  [WorkerLogStatus.RATE_LIMITED]: {
    icon: '⚠',
    color: 'yellow',
    statusText: '429',
  },
  [WorkerLogStatus.SKIPPED]: {
    icon: '⊘',
    color: 'yellow',
    statusText: 'SKIP',
  },
  [WorkerLogStatus.ERROR]: {
    icon: '✗',
    color: 'red',
    statusText: 'FAIL',
  },
};

export function formatWorkerLog(
  status: WorkerLogStatus,
  count: number,
  identifier: string,
  durationMs: number,
  context?: string,
): string {
  const config = LOG_CONFIGS[status];
  const icon = chalk[config.color](config.icon);
  const statusText = chalk[config.color](config.statusText);
  const countStr = chalk.bold(count);
  const duration = chalk.dim(`(${durationMs}ms)`);

  let message = `${icon} ${statusText} [${countStr}] ${identifier} ${duration}`;

  if (context) {
    message += ` ${chalk.dim(`(${context})`)}`;
  }

  return message;
}

export function formatWorkerLogWithDetails(
  status: WorkerLogStatus,
  count: number,
  identifier: string,
  durationMs: number,
  details: Record<string, unknown>,
): string {
  const config = LOG_CONFIGS[status];
  const icon = chalk[config.color](config.icon);
  const statusText = chalk[config.color](config.statusText);
  const countStr = chalk.bold(count);
  const duration = chalk.dim(`(${durationMs}ms)`);

  const detailsParts: string[] = [];

  if (details.isNew !== undefined) {
    detailsParts.push(
      details.isNew ? chalk.cyan('created') : chalk.yellow('updated'),
    );
  }
  if (details.name) {
    detailsParts.push(String(details.name));
  }
  if (details.statusCode) {
    detailsParts.push(chalk.dim(`status: ${details.statusCode}`));
  }
  if (details.orders) {
    detailsParts.push(chalk.dim(`${details.orders} orders`));
  }
  if (details.reason) {
    detailsParts.push(chalk.dim(details.reason as string));
  }

  const detailsStr =
    detailsParts.length > 0
      ? ` ${chalk.dim('|')} ${detailsParts.join(' ')}`
      : '';

  return `${icon} ${statusText} [${countStr}] ${identifier} ${duration}${detailsStr}`;
}

export function formatWorkerErrorLog(
  count: number,
  identifier: string,
  durationMs: number,
  errorMessage: string,
  source?: string,
): string {
  const icon = chalk.red('✗');
  const countStr = chalk.bold(count);
  const duration = chalk.dim(`(${durationMs}ms)`);
  const sourceStr = source ? ` [${chalk.bold(source)}]` : '';

  return `${icon} Failed [${countStr}] ${identifier} ${duration}${sourceStr} - ${errorMessage}`;
}

export interface WorkerStats {
  total: number;
  success: number;
  errors: number;
  rateLimit?: number;
  notFound?: number;
  notModified?: number;
  skipped?: number;
  noData?: number;
  forbidden?: number;
  startTime: number;
}

export function formatProgressReport(
  workerName: string,
  stats: WorkerStats,
  entityName: string = 'items',
): string {
  const uptime = Date.now() - stats.startTime;
  const rate = (stats.total / (uptime / 1000)).toFixed(2);
  const successRate = ((stats.success / stats.total) * 100).toFixed(1);

  const lines: string[] = [
    '',
    chalk.magenta.bold('━'.repeat(60)),
    `${chalk.magenta('📊 ' + workerName.toUpperCase().replace('WORKER', '') + ' PROGRESS REPORT')}`,
    `${chalk.dim('  Total:')} ${chalk.bold(stats.total)} ${entityName} processed`,
    `${chalk.green('  ✓ Success:')} ${chalk.green.bold(stats.success)} ${chalk.dim(`(${successRate}%)`)}`,
  ];

  if (stats.rateLimit !== undefined && stats.rateLimit > 0) {
    lines.push(
      `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(stats.rateLimit)}`,
    );
  }

  if (stats.notFound !== undefined && stats.notFound > 0) {
    lines.push(
      `${chalk.blue('  ℹ Not Found:')} ${chalk.blue.bold(stats.notFound)}`,
    );
  }

  if (stats.notModified !== undefined && stats.notModified > 0) {
    lines.push(
      `${chalk.blue('  ℹ Not Modified:')} ${chalk.blue.bold(stats.notModified)}`,
    );
  }

  if (stats.noData !== undefined && stats.noData > 0) {
    lines.push(
      `${chalk.yellow('  ⊘ No Data:')} ${chalk.yellow.bold(stats.noData)}`,
    );
  }

  if (stats.skipped !== undefined && stats.skipped > 0) {
    lines.push(
      `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(stats.skipped)}`,
    );
  }

  if (stats.forbidden !== undefined && stats.forbidden > 0) {
    lines.push(
      `${chalk.red('  ✗ Forbidden:')} ${chalk.red.bold(stats.forbidden)}`,
    );
  }

  lines.push(`${chalk.red('  ✗ Errors:')} ${chalk.red.bold(stats.errors)}`);
  lines.push(`${chalk.dim('  Rate:')} ${chalk.bold(rate)} ${entityName}/sec`);
  lines.push(chalk.magenta.bold('━'.repeat(60)));

  return lines.join('\n');
}

export function formatFinalSummary(
  workerName: string,
  stats: WorkerStats,
  entityName: string = 'items',
): string {
  const totalTime = (Date.now() - stats.startTime) / 1000;
  const avgRate = (stats.total / totalTime).toFixed(2);
  const successRate = ((stats.success / stats.total) * 100).toFixed(1);

  const lines: string[] = [
    '',
    chalk.magenta.bold('═'.repeat(60)),
    chalk.magenta.bold(
      `📊 ${workerName.toUpperCase().replace('WORKER', '')} FINAL SUMMARY`,
    ),
    chalk.magenta.bold('═'.repeat(60)),
    `${chalk.dim('  Total Time:')} ${chalk.bold(totalTime.toFixed(1))} seconds`,
    `${chalk.dim('  Total ${entityName}:')} ${chalk.bold(stats.total)}`,
    `${chalk.green('  ✓ Success:')} ${chalk.green.bold(stats.success)} ${chalk.dim(`(${successRate}%)`)}`,
  ];

  if (stats.rateLimit !== undefined && stats.rateLimit > 0) {
    lines.push(
      `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(stats.rateLimit)}`,
    );
  }

  if (stats.notFound !== undefined && stats.notFound > 0) {
    lines.push(
      `${chalk.blue('  ℹ Not Found:')} ${chalk.blue.bold(stats.notFound)}`,
    );
  }

  if (stats.notModified !== undefined && stats.notModified > 0) {
    lines.push(
      `${chalk.blue('  ℹ Not Modified:')} ${chalk.blue.bold(stats.notModified)}`,
    );
  }

  if (stats.noData !== undefined && stats.noData > 0) {
    lines.push(
      `${chalk.yellow('  ⊘ No Data:')} ${chalk.yellow.bold(stats.noData)}`,
    );
  }

  if (stats.skipped !== undefined && stats.skipped > 0) {
    lines.push(
      `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(stats.skipped)}`,
    );
  }

  if (stats.forbidden !== undefined && stats.forbidden > 0) {
    lines.push(
      `${chalk.red('  ✗ Forbidden:')} ${chalk.red.bold(stats.forbidden)}`,
    );
  }

  lines.push(`${chalk.red('  ✗ Errors:')} ${chalk.red.bold(stats.errors)}`);
  lines.push(
    `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} ${entityName}/sec`,
  );
  lines.push(chalk.magenta.bold('═'.repeat(60)));

  return lines.join('\n');
}

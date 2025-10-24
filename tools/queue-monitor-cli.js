#!/usr/bin/env node

const https = require('https');
const http = require('http');

const API_BASE = process.env.CMNW_API_URL || 'http://localhost:3000';
const REFRESH_INTERVAL = 3000; // 3 seconds

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function clearScreen() {
  console.clear();
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDuration(str) {
  return str || 'N/A';
}

function getStatusColor(waiting, active, failed) {
  if (failed > 100) return colors.red;
  if (waiting > 10000) return colors.yellow;
  if (active > 0) return colors.green;
  return colors.dim;
}

function drawProgressBar(current, total, width = 40) {
  if (total === 0) return '░'.repeat(width);
  
  const percentage = Math.min(100, Math.round((current / total) * 100));
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${percentage}%`;
}

function printHeader() {
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}                    ${colors.bright}CMNW Queue Monitoring Dashboard${colors.reset}                    ${colors.bright}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log();
}

function printQueueStats(stats) {
  const timestamp = new Date(stats.timestamp).toLocaleTimeString();
  console.log(`${colors.dim}Last Update: ${timestamp}${colors.reset}`);
  console.log();
  
  // Summary
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  Total Waiting:   ${colors.yellow}${formatNumber(stats.totalWaiting).padStart(8)}${colors.reset}`);
  console.log(`  Total Active:    ${colors.green}${formatNumber(stats.totalActive).padStart(8)}${colors.reset}`);
  console.log(`  Total Completed: ${colors.cyan}${formatNumber(stats.totalCompleted).padStart(8)}${colors.reset}`);
  console.log(`  Total Failed:    ${colors.red}${formatNumber(stats.totalFailed).padStart(8)}${colors.reset}`);
  console.log();
  
  // Queue Details
  console.log(`${colors.bright}Queue Details:${colors.reset}`);
  console.log();
  
  stats.queues.forEach(queue => {
    const color = getStatusColor(
      queue.counts.waiting,
      queue.counts.active,
      queue.counts.failed
    );
    
    const queueLabel = queue.queueName.padEnd(20);
    const total = queue.counts.waiting + queue.counts.active + queue.counts.completed;
    const progress = drawProgressBar(queue.counts.completed, total, 30);
    
    console.log(`${color}▸${colors.reset} ${colors.bright}${queueLabel}${colors.reset}`);
    console.log(`  Progress: ${colors.cyan}${progress}${colors.reset}`);
    console.log(`  Waiting: ${colors.yellow}${formatNumber(queue.counts.waiting).padStart(6)}${colors.reset}  ` +
                `Active: ${colors.green}${formatNumber(queue.counts.active).padStart(3)}${colors.reset}  ` +
                `Failed: ${colors.red}${formatNumber(queue.counts.failed).padStart(3)}${colors.reset}  ` +
                `Completed: ${colors.cyan}${formatNumber(queue.counts.completed).padStart(8)}${colors.reset}`);
    
    if (queue.processingRate > 0) {
      console.log(`  Rate: ${colors.magenta}${queue.processingRate.toFixed(1)} jobs/min${colors.reset}  ` +
                  `ETA: ${colors.blue}${formatDuration(queue.estimatedCompletion)}${colors.reset}  ` +
                  `Avg Time: ${colors.white}${Math.round(queue.averageProcessingTime)}ms${colors.reset}`);
    }
    
    console.log();
  });
}

function printDetailedQueue(queueName, data) {
  console.log(`${colors.bright}${colors.cyan}Queue: ${queueName}${colors.reset}`);
  console.log();
  
  const progress = drawProgressBar(data.current, data.total, 50);
  console.log(`Progress: ${colors.cyan}${progress}${colors.reset}`);
  console.log(`Current: ${formatNumber(data.current)} / ${formatNumber(data.total)}`);
  console.log(`Active Workers: ${colors.green}${data.activeWorkers}${colors.reset}`);
  
  if (data.estimatedTimeRemaining) {
    console.log(`ETA: ${colors.blue}${data.estimatedTimeRemaining}${colors.reset}`);
  }
  
  console.log();
  console.log(`${colors.bright}Active Jobs:${colors.reset}`);
  
  if (data.jobs.length === 0) {
    console.log(`  ${colors.dim}No active jobs${colors.reset}`);
  } else {
    data.jobs.forEach(job => {
      const stateColor = job.state === 'active' ? colors.green : colors.yellow;
      console.log(`  ${stateColor}●${colors.reset} ${job.name} - ${job.progress}% (${job.state})`);
    });
  }
  
  console.log();
}

function fetchData(path) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function monitorAllQueues() {
  let running = true;
  
  process.on('SIGINT', () => {
    running = false;
    clearScreen();
    console.log(`${colors.yellow}Monitoring stopped.${colors.reset}`);
    process.exit(0);
  });
  
  while (running) {
    try {
      clearScreen();
      printHeader();
      
      const stats = await fetchData('/api/queue-monitor/stats');
      printQueueStats(stats);
      
      console.log(`${colors.dim}Press Ctrl+C to exit | Refreshing every ${REFRESH_INTERVAL / 1000}s...${colors.reset}`);
      
      await new Promise(resolve => setTimeout(resolve, REFRESH_INTERVAL));
    } catch (error) {
      console.error(`${colors.red}Error fetching queue stats:${colors.reset}`, error.message);
      await new Promise(resolve => setTimeout(resolve, REFRESH_INTERVAL));
    }
  }
}

async function monitorSingleQueue(queueName) {
  let running = true;
  
  process.on('SIGINT', () => {
    running = false;
    clearScreen();
    console.log(`${colors.yellow}Monitoring stopped.${colors.reset}`);
    process.exit(0);
  });
  
  while (running) {
    try {
      clearScreen();
      printHeader();
      
      const data = await fetchData(`/api/queue-monitor/stats/${queueName}`);
      printDetailedQueue(queueName, data);
      
      console.log(`${colors.dim}Press Ctrl+C to exit | Refreshing every ${REFRESH_INTERVAL / 1000}s...${colors.reset}`);
      
      await new Promise(resolve => setTimeout(resolve, REFRESH_INTERVAL));
    } catch (error) {
      console.error(`${colors.red}Error fetching queue stats:${colors.reset}`, error.message);
      await new Promise(resolve => setTimeout(resolve, REFRESH_INTERVAL));
    }
  }
}

function printUsage() {
  console.log(`${colors.bright}Usage:${colors.reset}`);
  console.log(`  node queue-monitor-cli.js              Monitor all queues`);
  console.log(`  node queue-monitor-cli.js <queue-name> Monitor specific queue`);
  console.log();
  console.log(`${colors.bright}Available queues:${colors.reset}`);
  console.log(`  - DMA_Auctions`);
  console.log(`  - OSINT_Characters`);
  console.log(`  - OSINT_Guilds`);
  console.log(`  - OSINT_Profiles`);
  console.log(`  - Realms`);
  console.log(`  - Items`);
  console.log(`  - Pricing`);
  console.log(`  - Valuations`);
  console.log();
  console.log(`${colors.bright}Environment:${colors.reset}`);
  console.log(`  CMNW_API_URL - API base URL (default: http://localhost:3000)`);
}

// Main
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

if (args.length === 0) {
  monitorAllQueues();
} else if (args.length === 1) {
  monitorSingleQueue(args[0]);
} else {
  console.error(`${colors.red}Invalid arguments${colors.reset}`);
  printUsage();
  process.exit(1);
}

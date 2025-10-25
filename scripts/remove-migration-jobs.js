const Redis = require('ioredis');

const redis = new Redis({
  host: '128.0.0.255',
  port: 6380,
  password: '5wCS21chESjmNfoZTZuI',
});

async function removeMigrationJobs() {
  const queueName = 'OSINT_Characters';
  
  console.log('Fetching waiting jobs...');
  const waitingJobs = await redis.lrange(`bull:${queueName}:wait`, 0, -1);
  console.log(`Found ${waitingJobs.length} waiting jobs`);
  
  let removedCount = 0;
  let checkedCount = 0;
  
  for (const jobId of waitingJobs) {
    checkedCount++;
    if (checkedCount % 1000 === 0) {
      console.log(`Checked ${checkedCount}/${waitingJobs.length} jobs, removed ${removedCount}`);
    }
    
    const jobData = await redis.hget(`bull:${queueName}:${jobId}`, 'data');
    if (!jobData) continue;
    
    try {
      const data = JSON.parse(jobData);
      if (data.createdBy === 'OSINT-MIGRATION') {
        // Remove from wait list
        await redis.lrem(`bull:${queueName}:wait`, 0, jobId);
        // Remove job hash
        await redis.del(`bull:${queueName}:${jobId}`);
        removedCount++;
      }
    } catch (err) {
      console.error(`Error processing job ${jobId}:`, err.message);
    }
  }
  
  console.log(`\nDone! Removed ${removedCount} OSINT-MIGRATION jobs out of ${waitingJobs.length} total jobs`);
  await redis.quit();
}

removeMigrationJobs().catch(console.error);

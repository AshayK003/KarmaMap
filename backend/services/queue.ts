import PgBoss from 'pg-boss';
import { logger } from '../src/lib/logger.js';

let boss: PgBoss | null = null;

export async function getQueue() {
  if (boss) return boss;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.warn('DATABASE_URL not set — job queue disabled. Matching will run synchronously.');
    return null;
  }

  boss = new PgBoss(connectionString);

  boss.on('error', (err: Error) => logger.error(err, 'pg-boss error'));

  await boss.start();
  await boss.createQueue('matching', { name: 'matching', retryLimit: 3, retryDelay: 30, retryBackoff: true });

  logger.info('Job queue started');
  return boss;
}

export async function enqueueMatching(gigId: string, gigTitle: string) {
  const q = await getQueue();
  if (!q) return false;

  await q.send('matching', { gigId, gigTitle }, { retryLimit: 3 });
  return true;
}

export async function startWorker() {
  const q = await getQueue();
  if (!q) return;

  await q.work<{ gigId: string; gigTitle: string }>('matching', async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    const { gigId, gigTitle } = job.data;
    logger.info({ gigId }, 'Processing matching job');

    const { findMatchedVolunteers, notifyMatchedVolunteers } = await import('./matchingService.js');
    const { sendGigMatchEmails } = await import('./emailService.js');

    const matched = await findMatchedVolunteers(gigId);
    await notifyMatchedVolunteers(gigId, matched, gigTitle);
    await sendGigMatchEmails(matched, gigTitle);

    logger.info({ gigId, matchedCount: matched.length }, 'Matching job completed');
  });

  logger.info('Matching worker started');
}

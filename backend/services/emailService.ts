import { logger } from '../src/lib/logger.js';

const EMAILJS_API = 'https://api.emailjs.com/api/v1.0/email/send';

interface EmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  gig_title?: string;
}

const RETRY_DELAYS_MS = [500, 1500];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends one email via EmailJS with retry on transient failures (network
 * errors and 5xx responses). 4xx responses are permanent — no retry.
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;

  if (!publicKey || !serviceId || !templateId) {
    logger.warn('EmailJS not configured, skipping email');
    return false;
  }

  const body = JSON.stringify({
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: params.to_email,
      to_name: params.to_name,
      subject: params.subject,
      message: params.message,
      gig_title: params.gig_title ?? '',
    },
  });

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let res: Response;
    try {
      res = await fetch(EMAILJS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch {
      // Network error: transient candidate.
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      logger.error({ to_email: params.to_email }, 'Email send: network error after retries');
      return false;
    }

    if (res.ok) return true;

    if (res.status >= 400 && res.status < 500) {
      await res.text().catch(() => '');
      logger.error({ to_email: params.to_email, status: res.status }, 'Email rejected (4xx)');
      return false;
    }

    // 5xx: transient candidate.
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    logger.error(
      { to_email: params.to_email, status: res.status },
      'Email send failed after retries',
    );
    return false;
  }

  return false;
}

export async function sendGigMatchEmails(
  volunteers: Array<{ email: string; name: string }>,
  gigTitle: string,
): Promise<void> {
  const results = await Promise.allSettled(
    volunteers
      .filter((v) => v.email)
      .map((v) =>
        sendEmail({
          to_email: v.email,
          to_name: v.name,
          subject: `New volunteer opportunity: ${gigTitle}`,
          message: `A new gig "${gigTitle}" matches your skills and location. Open KarmaMap to join!`,
          gig_title: gigTitle,
        }),
      ),
  );

  const failures = results.filter(
    // sendEmail resolves false (not rejects) on 4xx/5xx/network failure —
    // counting only rejections reported zero failures forever.
    (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === false),
  );
  if (failures.length > 0) {
    logger.warn({ total: results.length, failures: failures.length }, 'Match emails had failures');
  }
}

export async function sendCompletionEmail(
  email: string,
  name: string,
  gigTitle: string,
): Promise<void> {
  const ok = await sendEmail({
    to_email: email,
    to_name: name,
    subject: `Gig completed: ${gigTitle}`,
    message: `Thank you for completing "${gigTitle}"! Your karma points have been updated.`,
    gig_title: gigTitle,
  });

  if (!ok) {
    logger.warn({ email }, 'Completion email failed (may be unconfigured)');
  }
}

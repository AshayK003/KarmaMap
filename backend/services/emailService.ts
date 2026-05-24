import { supabaseAdmin } from './supabase.js';
import { logger } from '../src/lib/logger.js';

const EMAILJS_API = 'https://api.emailjs.com/api/v1.0/email/send';

interface EmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  gig_title?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;

  if (!publicKey || !serviceId || !templateId) {
    logger.warn('EmailJS not configured, skipping email');
    return false;
  }

  let res;
  try {
    res = await fetch(EMAILJS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    });
  } catch {
    logger.error({ to_email: params.to_email }, 'Email send: network error');
    return false;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    logger.error({ to_email: params.to_email, status: res.status }, 'Email send failed');
  }

  return res.ok;
}

export async function sendGigMatchEmails(
  volunteers: Array<{ email: string; name: string }>,
  gigTitle: string
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
        })
      )
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.warn({ total: results.length, failures: failures.length }, 'Match emails had failures');
  }
}

export async function sendCompletionEmail(
  email: string,
  name: string,
  gigTitle: string
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

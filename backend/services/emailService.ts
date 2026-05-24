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
    console.warn('EmailJS not configured, skipping email');
    return false;
  }

  const res = await fetch(EMAILJS_API, {
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

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    console.error('Email send failed:', text);
  }

  return res.ok;
}

export async function sendEmailOrThrow(params: EmailParams): Promise<void> {
  const ok = await sendEmail(params);
  if (!ok) {
    throw new Error(`Failed to send email to ${params.to_email}`);
  }
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
    console.warn(`${failures.length}/${results.length} match emails failed`);
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
    console.warn(`Completion email to ${email} failed (may be unconfigured)`);
  }
}

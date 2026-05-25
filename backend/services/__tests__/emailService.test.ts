import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

describe('sendEmail', () => {
  it('returns false and warns when env vars are missing', async () => {
    delete process.env.EMAILJS_PUBLIC_KEY;
    delete process.env.EMAILJS_SERVICE_ID;
    delete process.env.EMAILJS_TEMPLATE_ID;

    const { sendEmail } = await import('../emailService.js');
    const { logger } = await import('../../src/lib/logger.js');

    const result = await sendEmail({
      to_email: 'test@test.com',
      to_name: 'Test',
      subject: 'Test',
      message: 'Hello',
    });

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('EmailJS not configured, skipping email');
  });

  it('returns true when fetch succeeds', async () => {
    process.env.EMAILJS_PUBLIC_KEY = 'pk_test';
    process.env.EMAILJS_SERVICE_ID = 'svc_test';
    process.env.EMAILJS_TEMPLATE_ID = 'tmpl_test';

    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    const { sendEmail } = await import('../emailService.js');

    const result = await sendEmail({
      to_email: 'test@test.com',
      to_name: 'Test',
      subject: 'Test',
      message: 'Hello',
    });

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('returns false when fetch fails', async () => {
    process.env.EMAILJS_PUBLIC_KEY = 'pk_test';
    process.env.EMAILJS_SERVICE_ID = 'svc_test';
    process.env.EMAILJS_TEMPLATE_ID = 'tmpl_test';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Error'),
    } as Response);

    const { sendEmail } = await import('../emailService.js');

    const result = await sendEmail({
      to_email: 'test@test.com',
      to_name: 'Test',
      subject: 'Test',
      message: 'Hello',
    });

    expect(result).toBe(false);
  });

  it('handles fetch network error gracefully', async () => {
    process.env.EMAILJS_PUBLIC_KEY = 'pk_test';
    process.env.EMAILJS_SERVICE_ID = 'svc_test';
    process.env.EMAILJS_TEMPLATE_ID = 'tmpl_test';

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { sendEmail } = await import('../emailService.js');

    const result = await sendEmail({
      to_email: 'test@test.com',
      to_name: 'Test',
      subject: 'Test',
      message: 'Hello',
    });

    expect(result).toBe(false);
  });
});

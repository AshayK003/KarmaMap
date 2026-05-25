import { beforeEach, describe, expect, it, vi } from 'vitest';

const _mockSelect = vi.fn();
const _mockEq = vi.fn();
const _mockSingle = vi.fn();
const _mockOrder = vi.fn();
const _mockInsert = vi.fn();
const _mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('../supabase.js', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: vi.fn(),
  },
}));

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    ...overrides,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.single.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReset();
});

describe('createPayment', () => {
  it('creates a payment record with pending status', async () => {
    const { createPayment } = await import('../paymentService.js');
    const c = makeChain();
    c.single.mockResolvedValue({
      data: {
        id: 'pay-1',
        gig_id: 'gig-1',
        ngo_id: 'ngo-1',
        amount: 240000,
        status: 'pending',
        feature_hours: 24,
      },
      error: null,
    });
    mockFrom.mockReturnValue(c);

    const result = await createPayment('gig-1', 'ngo-1', 24);

    expect(result.id).toBe('pay-1');
    expect(mockFrom).toHaveBeenCalledWith('payments');
    expect(c.insert).toHaveBeenCalledWith({
      gig_id: 'gig-1',
      ngo_id: 'ngo-1',
      amount: 240000,
      status: 'pending',
      feature_hours: 24,
    });
  });

  it('throws when insert fails', async () => {
    const { createPayment } = await import('../paymentService.js');
    const c = makeChain();
    c.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    mockFrom.mockReturnValue(c);

    await expect(createPayment('gig-1', 'ngo-1', 10)).rejects.toThrow(
      'Failed to create payment request',
    );
  });
});

describe('confirmPayment', () => {
  it('confirms payment and features gig', async () => {
    const { confirmPayment } = await import('../paymentService.js');

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // fetch payment
        const fetchChain = makeChain();
        fetchChain.single.mockResolvedValue({
          data: {
            id: 'pay-1',
            gig_id: 'gig-1',
            ngo_id: 'ngo-1',
            status: 'pending',
            feature_hours: 48,
          },
          error: null,
        });
        return fetchChain;
      }
      if (callCount === 2) {
        // update gigs.featured_until
        const gigChain = makeChain();
        gigChain.update.mockReturnThis();
        gigChain.eq.mockResolvedValue({ error: null });
        return gigChain;
      }
      // update payment status → return paid
      const payChain = makeChain();
      payChain.single.mockResolvedValue({
        data: { id: 'pay-1', gig_id: 'gig-1', ngo_id: 'ngo-1', status: 'paid', feature_hours: 48 },
        error: null,
      });
      return payChain;
    });

    const result = await confirmPayment('pay-1', 'ngo-1');

    expect(result.payment.status).toBe('paid');
    expect(callCount).toBe(3);
  });

  it('throws 404 when payment not found', async () => {
    const { confirmPayment } = await import('../paymentService.js');
    const c = makeChain();
    c.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    mockFrom.mockReturnValue(c);

    await expect(confirmPayment('pay-1', 'ngo-1')).rejects.toMatchObject({
      message: 'Payment not found',
      statusCode: 404,
    });
  });

  it('throws 403 when ngo does not own payment', async () => {
    const { confirmPayment } = await import('../paymentService.js');
    const c = makeChain();
    c.single.mockResolvedValue({
      data: {
        id: 'pay-1',
        gig_id: 'gig-1',
        ngo_id: 'ngo-other',
        status: 'pending',
        feature_hours: 24,
      },
      error: null,
    });
    mockFrom.mockReturnValue(c);

    await expect(confirmPayment('pay-1', 'ngo-1')).rejects.toMatchObject({
      message: 'Not authorized',
      statusCode: 403,
    });
  });

  it('throws 400 when payment is not pending', async () => {
    const { confirmPayment } = await import('../paymentService.js');
    const c = makeChain();
    c.single.mockResolvedValue({
      data: { id: 'pay-1', gig_id: 'gig-1', ngo_id: 'ngo-1', status: 'paid', feature_hours: 24 },
      error: null,
    });
    mockFrom.mockReturnValue(c);

    await expect(confirmPayment('pay-1', 'ngo-1')).rejects.toMatchObject({
      message: 'Payment is not pending',
      statusCode: 400,
    });
  });
});

describe('getNgoPayments', () => {
  it('returns payments for the NGO', async () => {
    const { getNgoPayments } = await import('../paymentService.js');
    const c = makeChain();
    c.order.mockResolvedValue({
      data: [
        { id: 'pay-1', amount: 240000, status: 'paid', gigs: { title: 'Plantation Drive' } },
        { id: 'pay-2', amount: 120000, status: 'pending', gigs: { title: 'Beach Cleanup' } },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(c);

    const result = await getNgoPayments('ngo-1');

    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith('payments');
  });

  it('returns empty array when no payments', async () => {
    const { getNgoPayments } = await import('../paymentService.js');
    const c = makeChain();
    c.order.mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(c);

    const result = await getNgoPayments('ngo-1');

    expect(result).toEqual([]);
  });

  it('throws on query error', async () => {
    const { getNgoPayments } = await import('../paymentService.js');
    const c = makeChain();
    c.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(c);

    await expect(getNgoPayments('ngo-1')).rejects.toThrow('Failed to fetch payments');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('../supabase.js', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: vi.fn(),
  },
}));

function makeChain() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReset();
  mockSingle.mockReset();
  mockSelect.mockReset();
  mockEq.mockReset();
  mockUpdate.mockReset();
});

describe('updateUpiInfo', () => {
  it('updates upi_id and upi_qr_url', async () => {
    const { updateUpiInfo } = await import('../ngoService.js');
    const c = makeChain();
    c.single.mockResolvedValue({
      data: { id: 'ngo-1', name: 'Test NGO', upi_id: 'ngo@upi', upi_qr_url: 'https://example.com/qr.png' },
      error: null,
    });
    mockFrom.mockReturnValue(c);

    const result = await updateUpiInfo('ngo-1', 'ngo@upi', 'https://example.com/qr.png');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(c.update).toHaveBeenCalledWith({ upi_id: 'ngo@upi', upi_qr_url: 'https://example.com/qr.png' });
    expect(result.upi_id).toBe('ngo@upi');
  });

  it('clears upi_id when null is passed', async () => {
    const { updateUpiInfo } = await import('../ngoService.js');
    const c = makeChain();
    c.single.mockResolvedValue({
      data: { id: 'ngo-1', name: 'Test NGO', upi_id: null, upi_qr_url: 'https://example.com/qr.png' },
      error: null,
    });
    mockFrom.mockReturnValue(c);

    const result = await updateUpiInfo('ngo-1', null, undefined);

    expect(c.update).toHaveBeenCalledWith({ upi_id: null });
  });

  it('throws when no fields provided', async () => {
    const { updateUpiInfo } = await import('../ngoService.js');

    await expect(updateUpiInfo('ngo-1', undefined, undefined)).rejects.toMatchObject({
      message: 'No fields to update',
      statusCode: 400,
    });
  });

  it('throws on DB error', async () => {
    const { updateUpiInfo } = await import('../ngoService.js');
    const c = makeChain();
    c.single.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(c);

    await expect(updateUpiInfo('ngo-1', 'ngo@upi', null)).rejects.toThrow(
      'Failed to update donation info',
    );
  });
});

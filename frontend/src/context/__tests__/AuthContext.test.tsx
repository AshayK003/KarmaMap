import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function Probe() {
  const { loading, user, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{user ? user.id : 'anon'}</span>
      <button type="button" onClick={() => void signOut()}>
        sign out
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null }),
  });
});

describe('AuthProvider boot', () => {
  it('stops loading even when getSession rejects (offline boot)', async () => {
    mockGetSession.mockRejectedValue(new Error('Failed to fetch'));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
  });
});

describe('AuthProvider signOut', () => {
  it('clears local user even when the remote sign-out fails', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    });
    mockSignOut.mockRejectedValue(new Error('Failed to fetch'));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('u1'));
    screen.getByRole('button', { name: /sign out/i }).click();
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('anon'));
  });
});

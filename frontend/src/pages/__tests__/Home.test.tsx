import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from '../Home';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({
      data: { total_hours: 0, ngo_count: 0, open_gigs: 0 },
      error: null,
    }),
  },
}));

beforeEach(() => {
  sessionStorage.clear();
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home hero', () => {
  it('renders the headline', async () => {
    renderHome();
    expect(await screen.findByRole('heading', { name: /volunteer locally/i })).toBeTruthy();
  });

  it('keeps a mobile-first type step so the headline fits 360px viewports', async () => {
    renderHome();
    const heading = await screen.findByRole('heading', { name: /volunteer locally/i });
    // text-3xl base (≈30px) fits "Volunteer Locally." inside ~360px;
    // text-balance keeps the two-line hero even without squeezing.
    expect(heading.className).toMatch(/(^|\s)text-3xl(\s|$)/);
    expect(heading.className).toContain('text-balance');
    expect(heading.className).toContain('sm:text-6xl');
  });

  it('shows em-dashes, not zeros, when the stats fetch fails', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: { message: 'offline' },
    });
    renderHome();
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });
});

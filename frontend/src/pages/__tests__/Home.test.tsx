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

describe('Home copy', () => {
  it('leads with the outcome subhead, not jargon', async () => {
    renderHome();
    expect(await screen.findByText(/give a few hours/i)).toBeTruthy();
    expect(screen.queryByText(/geospatial coordinates/i)).toBeNull();
  });

  it('keeps one primary CTA with the NGO path as a quiet link', async () => {
    renderHome();
    expect(await screen.findByRole('button', { name: /join as volunteer/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /list your organization/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /register ngo/i })).toBeNull();
  });

  it('hides the stats strip on all-zero data', async () => {
    renderHome();
    await screen.findByRole('heading', { name: /volunteer locally/i });
    expect(screen.queryByText('Hours Logged')).toBeNull();
  });

  it('shows the stats strip once real numbers arrive', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { total_hours: 42, ngo_count: 3, open_gigs: 5 },
      error: null,
    });
    renderHome();
    expect(await screen.findByText('Hours Logged')).toBeTruthy();
  });

  it('explains the product in plain words', async () => {
    renderHome();
    expect(await screen.findByText('How KarmaMap works')).toBeTruthy();
    expect(screen.getByText(/lands on your public record/i)).toBeTruthy();
    expect(screen.queryByText(/cryptographically secured/i)).toBeNull();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Signup } from '../Signup';

const mockSignUp = vi.fn();
const mockGetSession = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ signUp: (...args: unknown[]) => mockSignUp(...args) }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

function renderSignup(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/map" element={<div data-testid="map-page">Map</div>} />
        <Route path="/ngo/dashboard" element={<div data-testid="ngo-page">NGO</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
    target: { value: 't@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSignUp.mockResolvedValue({ error: null });
});

describe('Signup role param', () => {
  it("ignores ?role=admin and signs up as volunteer", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    renderSignup('/signup?role=admin');

    await fillValidForm();

    await waitFor(() => expect(screen.getByTestId('map-page')).toBeTruthy());
    expect(mockSignUp).toHaveBeenCalledWith(
      't@example.com',
      'password123',
      'Test User',
      'volunteer',
      expect.any(Array),
    );
  });
});

describe('Signup post-submit navigation', () => {
  it('sends unverified (no session) users to login to check email', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderSignup('/signup');

    await fillValidForm();

    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy());
  });

  it('sends verified volunteers straight to the map', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    renderSignup('/signup');

    await fillValidForm();

    await waitFor(() => expect(screen.getByTestId('map-page')).toBeTruthy());
  });
});

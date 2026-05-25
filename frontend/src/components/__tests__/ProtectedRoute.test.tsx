import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  mockUseAuth.mockReset();
});

function renderRoute(roles?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ProtectedRoute roles={roles as any}>
        <div data-testid="protected-content">Authenticated content</div>
      </ProtectedRoute>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true });

    const { container } = renderRoute();
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false });

    renderRoute();
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' },
      profile: { role: 'volunteer' },
      loading: false,
    });

    renderRoute();
    expect(screen.getByTestId('protected-content')).toBeTruthy();
    expect(screen.getByText('Authenticated content')).toBeTruthy();
  });

  it('redirects when role does not match', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' },
      profile: { role: 'volunteer' },
      loading: false,
    });

    renderRoute(['ngo']);
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });
});

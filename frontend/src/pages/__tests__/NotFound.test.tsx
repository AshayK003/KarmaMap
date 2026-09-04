import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NotFound } from '../NotFound';

describe('NotFound', () => {
  it('explains the page is missing and links home', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /go home/i })).toHaveProperty(
      'href',
      expect.stringContaining('/'),
    );
  });
});

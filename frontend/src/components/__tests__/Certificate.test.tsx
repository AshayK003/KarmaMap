import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Participation } from '../../types/database';
import { Certificate } from '../Certificate';

const participation = {
  id: 'abc12345-0000-4000-8000-000000000000',
  hours: 2.5,
} as unknown as Participation;

function renderCert(orgName?: string) {
  return render(
    <Certificate
      volunteerName="Ashay Kushwaha"
      participation={participation}
      gigTitle="Tree plantation drive"
      completedDate="September 4, 2026"
      orgName={orgName}
    />,
  );
}

describe('Certificate', () => {
  it('shows the volunteer, gig, org, hours, and certificate id', () => {
    renderCert('Green Earth NGO');
    expect(screen.getByText('Ashay Kushwaha')).toBeTruthy();
    expect(screen.getByText('Tree plantation drive')).toBeTruthy();
    expect(screen.getByText(/awarded by green earth ngo/i)).toBeTruthy();
    expect(screen.getByText(/KM-ABC12345/)).toBeTruthy();
    expect(screen.getByText(/verified by karmamap/i)).toBeTruthy();
  });

  it('omits the org line when unknown instead of inventing one', () => {
    renderCert();
    expect(screen.queryByText(/awarded by/i)).toBeNull();
  });

  it('contains no decorative glyph characters', () => {
    const { container } = renderCert('Green Earth NGO');
    expect(container.textContent).not.toMatch(/[✦◈✕✓]/);
  });
});

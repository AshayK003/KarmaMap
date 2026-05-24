import { describe, it, expect } from 'vitest';
import { GIG_STATUS_LABELS, GIG_STATUS_STYLES } from '../utils/gigStatus';

describe('GIG_STATUS_LABELS', () => {
  it('has labels for all 4 statuses', () => {
    expect(GIG_STATUS_LABELS).toEqual({
      open: 'Open',
      in_progress: 'In progress',
      completed: 'Completed',
      cancelled: 'Closed',
    });
  });
});

describe('GIG_STATUS_STYLES', () => {
  it('has styles for all 4 statuses', () => {
    expect(GIG_STATUS_STYLES.open).toContain('emerald');
    expect(GIG_STATUS_STYLES.in_progress).toContain('blue');
    expect(GIG_STATUS_STYLES.completed).toContain('gray');
    expect(GIG_STATUS_STYLES.cancelled).toContain('red');
  });
});

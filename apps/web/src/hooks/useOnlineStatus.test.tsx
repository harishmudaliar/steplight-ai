import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useOnlineStatus } from './useOnlineStatus';

function ConnectionAnnouncement() {
  const online = useOnlineStatus();
  return (
    <div role="status" aria-live="polite">
      {online ? 'Connected' : 'Offline: changes are not saved or queued.'}
    </div>
  );
}

describe('online status announcement', () => {
  it('announces a network loss to assistive technology', () => {
    render(<ConnectionAnnouncement />);
    fireEvent(window, new Event('offline'));
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent('changes are not saved or queued');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomNav } from '../components/BottomNav';
import { DesktopNav } from '../components/DesktopNav';

describe('responsive application navigation', () => {
  it('keeps primary destinations compact and reveals the secondary destinations accessibly', () => {
    render(<MemoryRouter initialEntries={['/history']}><BottomNav /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveClass('lg:hidden');
    expect(screen.getByRole('link', { name: 'Step Sequencer' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('menu', { name: 'More destinations' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('provides the same application destinations in the desktop rail', () => {
    render(<MemoryRouter initialEntries={['/']}><DesktopNav /></MemoryRouter>);
    expect(screen.getByRole('complementary')).toHaveClass('hidden', 'lg:block');
    for (const label of ['Dashboard', 'Today', 'Goals', 'Tasks', 'History', 'Step Sequencer', 'Progress', 'Settings']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });
});

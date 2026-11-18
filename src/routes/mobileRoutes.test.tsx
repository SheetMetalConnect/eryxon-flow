import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MobileRoutes } from './mobileRoutes';

function Destination() {
  const { pathname, search, hash, state } = useLocation();
  return <div data-testid="destination">{JSON.stringify({ pathname, search, hash, state })}</div>;
}

describe('legacy mobile links', () => {
  it.each([
    ['/m', '/operator/work-queue', ''],
    ['/m/queue?q=JOB-1', '/operator/work-queue', '?q=JOB-1'],
    ['/m/terminal', '/operator/view', ''],
    ['/m/activity', '/operator/my-activity', ''],
    ['/m/issues', '/operator/my-issues', ''],
    ['/m/scan', '/operator/work-queue', '?scan=1'],
    ['/m/op/op-1?tab=issue', '/operator/operations/op-1', '?tab=issue'],
    ['/m/login', '/operator/login', ''],
  ])('preserves %s on the shared operator interface', (from, pathname, search) => {
    render(<MemoryRouter initialEntries={[{ pathname: from.split('?')[0], search: from.includes('?') ? `?${from.split('?')[1]}` : '', state: { from: '/m/op/op-1' } }]}>
      <Routes>{MobileRoutes()}<Route path="/operator/*" element={<Destination />} /></Routes>
    </MemoryRouter>);
    expect(JSON.parse(screen.getByTestId('destination').textContent ?? '{}')).toEqual({
      pathname, search, hash: '', state: { from: '/m/op/op-1' },
    });
  });
});

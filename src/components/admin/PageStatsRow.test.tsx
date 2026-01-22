import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageStatsRow } from './PageStatsRow';
import { Briefcase, CheckCircle, AlertCircle, Clock } from 'lucide-react';

describe('PageStatsRow', () => {
  const mockStats = [
    { label: 'Total Jobs', value: 42, icon: Briefcase, color: 'primary' as const },
    { label: 'Completed', value: 28, icon: CheckCircle, color: 'success' as const },
    { label: 'Issues', value: 5, icon: AlertCircle, color: 'error' as const },
    { label: 'Pending', value: 9, icon: Clock, color: 'warning' as const },
  ];

  it('renders all stat items', () => {
    render(<PageStatsRow stats={mockStats} />);

    expect(screen.getByText('Total Jobs')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Issues')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders stat values', () => {
    render(<PageStatsRow stats={mockStats} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('renders string values', () => {
    const stats = [
      { label: 'Status', value: 'Active', icon: Briefcase },
    ];

    render(<PageStatsRow stats={stats} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders icons for each stat', () => {
    const { container } = render(<PageStatsRow stats={mockStats} />);

    // Each stat should have an SVG icon (lucide-react icons render as SVGs)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(mockStats.length);
  });

  it('applies custom className', () => {
    const { container } = render(
      <PageStatsRow stats={mockStats} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles onClick for clickable stats', () => {
    const onClick = vi.fn();
    const stats = [
      { label: 'Clickable', value: 10, icon: Briefcase, onClick },
    ];

    render(<PageStatsRow stats={stats} />);

    const clickableStat = screen.getByText('Clickable').closest('.glass-card');
    fireEvent.click(clickableStat!);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies cursor-pointer class to clickable stats', () => {
    const stats = [
      { label: 'Clickable', value: 10, icon: Briefcase, onClick: vi.fn() },
      { label: 'Non-clickable', value: 20, icon: CheckCircle },
    ];

    render(<PageStatsRow stats={stats} />);

    const clickableStat = screen.getByText('Clickable').closest('.glass-card');
    const nonClickableStat = screen.getByText('Non-clickable').closest('.glass-card');

    expect(clickableStat).toHaveClass('cursor-pointer');
    expect(nonClickableStat).not.toHaveClass('cursor-pointer');
  });

  it('applies correct color classes for primary', () => {
    const stats = [{ label: 'Primary', value: 10, icon: Briefcase, color: 'primary' as const }];
    const { container } = render(<PageStatsRow stats={stats} />);

    const iconBg = container.querySelector('.bg-\\[hsl\\(var\\(--brand-primary\\)\\)\\]\\/10');
    expect(iconBg).toBeInTheDocument();
  });

  it('applies correct color classes for success', () => {
    const stats = [{ label: 'Success', value: 10, icon: CheckCircle, color: 'success' as const }];
    const { container } = render(<PageStatsRow stats={stats} />);

    const iconBg = container.querySelector('.bg-\\[hsl\\(var\\(--color-success\\)\\)\\]\\/10');
    expect(iconBg).toBeInTheDocument();
  });

  it('applies correct color classes for warning', () => {
    const stats = [{ label: 'Warning', value: 10, icon: AlertCircle, color: 'warning' as const }];
    const { container } = render(<PageStatsRow stats={stats} />);

    const iconBg = container.querySelector('.bg-\\[hsl\\(var\\(--color-warning\\)\\)\\]\\/10');
    expect(iconBg).toBeInTheDocument();
  });

  it('applies correct color classes for error', () => {
    const stats = [{ label: 'Error', value: 10, icon: AlertCircle, color: 'error' as const }];
    const { container } = render(<PageStatsRow stats={stats} />);

    const iconBg = container.querySelector('.bg-\\[hsl\\(var\\(--color-error\\)\\)\\]\\/10');
    expect(iconBg).toBeInTheDocument();
  });

  it('applies correct color classes for info', () => {
    const stats = [{ label: 'Info', value: 10, icon: AlertCircle, color: 'info' as const }];
    const { container } = render(<PageStatsRow stats={stats} />);

    const iconBg = container.querySelector('.bg-\\[hsl\\(var\\(--color-info\\)\\)\\]\\/10');
    expect(iconBg).toBeInTheDocument();
  });

  it('applies muted color classes by default', () => {
    const stats = [{ label: 'Default', value: 10, icon: Briefcase }];
    const { container } = render(<PageStatsRow stats={stats} />);

    const iconBg = container.querySelector('.bg-muted\\/50');
    expect(iconBg).toBeInTheDocument();
  });

  it('renders with responsive grid classes', () => {
    const { container } = render(<PageStatsRow stats={mockStats} />);

    expect(container.firstChild).toHaveClass('grid');
    expect(container.firstChild).toHaveClass('grid-cols-2');
    expect(container.firstChild).toHaveClass('md:grid-cols-4');
  });

  it('applies glass-card class to stat items', () => {
    render(<PageStatsRow stats={mockStats} />);

    const cards = document.querySelectorAll('.glass-card');
    expect(cards.length).toBe(mockStats.length);
  });

  it('truncates long labels', () => {
    const stats = [
      { label: 'Very Long Label That Should Be Truncated', value: 10, icon: Briefcase },
    ];

    render(<PageStatsRow stats={stats} />);

    const label = screen.getByText('Very Long Label That Should Be Truncated');
    expect(label).toHaveClass('truncate');
  });

  it('handles empty stats array', () => {
    const { container } = render(<PageStatsRow stats={[]} />);

    expect(container.firstChild).toBeEmptyDOMElement();
  });
});

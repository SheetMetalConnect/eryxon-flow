import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminPageHeader } from './AdminPageHeader';
import { Plus, Settings } from 'lucide-react';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

describe('AdminPageHeader', () => {
  it('renders title correctly', () => {
    render(<AdminPageHeader title="Dashboard" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });

  it('renders description when provided', () => {
    render(
      <AdminPageHeader
        title="Jobs"
        description="Manage all your production jobs"
      />
    );

    expect(screen.getByText('Manage all your production jobs')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<AdminPageHeader title="Jobs" />);

    const container = screen.getByRole('heading', { level: 1 }).parentElement;
    expect(container?.querySelector('p')).toBeNull();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(
      <AdminPageHeader
        title="Jobs"
        action={{
          label: 'Create Job',
          onClick,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /create job/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when action button is clicked', () => {
    const onClick = vi.fn();
    render(
      <AdminPageHeader
        title="Jobs"
        action={{
          label: 'Create Job',
          onClick,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create job/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders action button with icon when provided', () => {
    render(
      <AdminPageHeader
        title="Jobs"
        action={{
          label: 'Add New',
          onClick: vi.fn(),
          icon: Plus,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /add new/i });
    expect(button).toBeInTheDocument();
    // Icon should be rendered inside the button
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('renders children in the header', () => {
    render(
      <AdminPageHeader title="Settings">
        <button>Custom Button</button>
      </AdminPageHeader>
    );

    expect(screen.getByRole('button', { name: /custom button/i })).toBeInTheDocument();
  });

  it('renders children alongside action button', () => {
    render(
      <AdminPageHeader
        title="Jobs"
        action={{
          label: 'Create',
          onClick: vi.fn(),
        }}
      >
        <button>Filter</button>
      </AdminPageHeader>
    );

    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders title divider', () => {
    const { container } = render(<AdminPageHeader title="Test" />);

    expect(container.querySelector('hr.title-divider')).toBeInTheDocument();
  });

  it('applies correct CSS classes to title', () => {
    render(<AdminPageHeader title="Test Title" />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-xl');
    expect(heading).toHaveClass('font-bold');
    expect(heading).toHaveClass('bg-gradient-to-r');
  });

  it('applies correct CSS classes to description', () => {
    render(
      <AdminPageHeader
        title="Test"
        description="Test description"
      />
    );

    const description = screen.getByText('Test description');
    expect(description).toHaveClass('text-muted-foreground');
  });

  it('action button has cta-button class', () => {
    render(
      <AdminPageHeader
        title="Test"
        action={{
          label: 'Action',
          onClick: vi.fn(),
        }}
      />
    );

    const button = screen.getByRole('button', { name: /action/i });
    expect(button).toHaveClass('cta-button');
  });
});

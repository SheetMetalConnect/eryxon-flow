import { it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';

interface RecordRow { id: string; status: string }
const columns: ColumnDef<RecordRow>[] = [
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status },
];

it('renders refreshed values and uses the current row click handler', () => {
  const beforeClick = vi.fn();
  const afterClick = vi.fn();
  const { rerender } = render(
    <DataTable data={[{ id: 'op-1', status: 'not_started' }]} columns={columns}
      onRowClick={beforeClick} showToolbar={false} showPagination={false} />,
  );
  expect(screen.getByText('not_started')).toBeInTheDocument();
  const updated = { id: 'op-1', status: 'completed' };
  rerender(<DataTable data={[updated]} columns={columns} onRowClick={afterClick}
    showToolbar={false} showPagination={false} />);
  fireEvent.click(screen.getByText('completed'));
  expect(afterClick).toHaveBeenCalledWith(updated);
  expect(beforeClick).not.toHaveBeenCalled();
});

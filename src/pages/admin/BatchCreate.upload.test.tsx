import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BatchCreate from './BatchCreate';

const mocks = vi.hoisted(() => ({
  profile: { tenant_id: 'tenant-1' } as { tenant_id: string } | null,
  upload: vi.fn(),
  sign: vi.fn(),
  translate: (key: string) => key,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.translate }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => mocks.profile }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQuery: (): { data: unknown[] } => ({ data: [] }),
}));
vi.mock('@/hooks/useBatches', () => ({
  useCreateBatch: () => ({ isPending: false }),
  useUpdateBatch: () => ({ isPending: false }),
  useAddOperationsToBatch: () => ({}),
  useRemoveOperationFromBatch: () => ({}),
  useBatch: () => ({ isLoading: false }),
  useBatchOperations: () => ({ isLoading: false }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => ({ upload: mocks.upload, createSignedUrl: mocks.sign }) } } }));

describe('batch image uploads before creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile = { tenant_id: 'tenant-1' };
    mocks.upload.mockResolvedValue({ error: null });
    mocks.sign.mockResolvedValue({ data: { signedUrl: 'https://storage.example/image' }, error: null });
  });

  it.each(['nesting', 'layout'])('scopes a new %s image to the batch creator tenant', async (type) => {
    const { container } = render(<MemoryRouter><BatchCreate /></MemoryRouter>);
    const input = container.querySelector<HTMLInputElement>(`#${type}-upload`);
    if (!input) throw new Error('Expected batch image input');
    const file = new File(['image'], 'panel.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledOnce());
    const [path, uploadedFile] = mocks.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^tenant-1/staging/${type}-[^/]+\\.png$`));
    expect(uploadedFile).toBe(file);
    await waitFor(() => expect(mocks.sign).toHaveBeenCalledWith(path, 31536000));
    await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', 'https://storage.example/image'));
  });

  it('does not upload without the tenant used for batch creation', () => {
    mocks.profile = null;
    const { container } = render(<MemoryRouter><BatchCreate /></MemoryRouter>);
    const input = container.querySelector<HTMLInputElement>('#nesting-upload');
    if (!input) throw new Error('Expected batch image input');
    fireEvent.change(input, { target: { files: [new File(['image'], 'panel.png')] } });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

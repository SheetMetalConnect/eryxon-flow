import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from './pagination';

describe('fetchAllPages', () => {
  it('reads beyond a full response page including an exact final page', async () => {
    const records = ['a', 'b', 'c', 'd'];
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: records.slice(from, to + 1), error: null as Error | null,
    }));
    expect(await fetchAllPages(fetchPage, 2)).toEqual(records);
    expect(fetchPage.mock.calls).toEqual([[0, 1], [2, 3], [4, 5]]);
  });

  it('rejects partial results when a later page fails', async () => {
    const failure = new Error('connection lost');
    const fetchPage = vi.fn(async (from: number) => from === 0
      ? { data: ['first'], error: null as Error | null }
      : { data: null as string[] | null, error: failure });
    await expect(fetchAllPages(fetchPage, 1)).rejects.toBe(failure);
  });
});

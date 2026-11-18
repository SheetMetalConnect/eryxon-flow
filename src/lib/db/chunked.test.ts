import { describe, it, expect, vi } from 'vitest';
import { fetchInChunks } from './chunked';

describe('fetchInChunks', () => {
  it('splits ids into chunks and concatenates rows in order', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `id${i}`);
    const calls: number[] = [];
    const run = vi.fn(async (chunk: string[]) => {
      calls.push(chunk.length);
      return { data: chunk.map((id) => ({ id })), error: null };
    });
    const out = await fetchInChunks<{ id: string }>(ids, run, 100);
    expect(calls).toEqual([100, 100, 50]); // 250 / 100
    expect(out).toHaveLength(250);
    expect(out[0].id).toBe('id0');
    expect(out[249].id).toBe('id249');
  });

  it('makes a single call when ids fit in one chunk', async () => {
    const run = vi.fn(async (chunk: string[]) => ({ data: chunk.map((id) => ({ id })), error: null }));
    await fetchInChunks(['a', 'b'], run, 100);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does nothing and returns [] for empty ids', async () => {
    const run = vi.fn(async () => ({ data: [], error: null }));
    expect(await fetchInChunks([], run)).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('throws if any chunk returns an error', async () => {
    const run = vi.fn(async () => ({ data: null, error: new Error('boom') }));
    await expect(fetchInChunks(['a'], run)).rejects.toThrow('boom');
  });

  it('tolerates a null data payload without throwing', async () => {
    const run = vi.fn(async () => ({ data: null, error: null }));
    expect(await fetchInChunks(['a'], run)).toEqual([]);
  });
});
